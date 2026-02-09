/**
 * Multi-Provider LLM Fallback System
 * Fallback chain: Gemini → Groq → Local Ollama
 * 
 * This module implements a resilient response generation system that automatically
 * falls back to alternative providers when the primary provider fails.
 */

import axios, { AxiosError } from 'axios';
import { generateWithGemini } from './gemini';

let groqApiKeyCursor = 0;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface LLMResponse {
    text: string;
    provider: 'gemini' | 'groq' | 'ollama';
    model: string;
    timestamp: string;
}

interface GeminiRequestBody {
    contents: Array<{
        parts: Array<{
            text: string;
        }>;
    }>;
    generationConfig: {
        temperature: number;
        maxOutputTokens: number;
        responseMimeType: string;
    };
}

interface GeminiResponseData {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
}

interface GroqResponseData {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

// ============================================================================
// CONFIGURATION & ENVIRONMENT
// ============================================================================

const API_CONFIG = {
    gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-2.0-flash',
        temperature: 0.1,
        maxOutputTokens: 2048,
    },
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile', // Updated from decommissioned 3.1
        temperature: 0.1,
        maxOutputTokens: 2048,
    },
    ollama: {
        baseUrl: 'http://localhost:11434/api/generate',
        model: 'llama3.2', // More common/standard than mistral for local dev
        temperature: 0.1,
    },
};

/**
 * Load API keys from environment variables
 */
function loadGeminiKey(): string | null {
    // Try loading multiple keys and return first available
    for (let i = 1; i <= 12; i++) {
        const key = process.env[`GOOGLE_API_KEY_${i}`];
        if (key) return key;
    }
    return process.env.GEMINI_API_KEY || null;
}

function loadGroqKeys(): string[] {
    const keys: string[] = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key) keys.push(key);
    }
    const singleKey = process.env.GROQ_API_KEY;
    if (singleKey && !keys.includes(singleKey)) keys.push(singleKey);
    return keys;
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Call Gemini API for content generation
 * @param prompt The input prompt for content generation
 * @throws Error if API call fails
 */
export async function callGemini(prompt: string): Promise<string> {
    try {
        // Use the robust generateWithGemini from gemini.ts which handles key rotation
        return await generateWithGemini(prompt, {
            model: API_CONFIG.gemini.model,
            temperature: API_CONFIG.gemini.temperature,
            maxOutputTokens: API_CONFIG.gemini.maxOutputTokens,
        });
    } catch (error: any) {
        const message = String(error?.message ?? error ?? '');
        const status = error?.status ?? error?.response?.status;

        console.error(`[LLM Fallback] Gemini error - Status: ${status}, Message: ${message}`);

        // Detect quota/rate limit errors
        const isQuotaError =
            status === 429 ||
            message.toLowerCase().includes('quota') ||
            message.toLowerCase().includes('too many requests');

        if (isQuotaError) {
            const err = new Error(`Gemini quota exceeded (429): ${message}`);
            (err as any).code = 'QUOTA_EXCEEDED';
            throw err;
        }

        throw error;
    }
}

/**
 * Call Groq API for content generation
 * @param prompt The input prompt for content generation
 * @throws Error if API call fails
 */
export async function callGroq(prompt: string): Promise<string> {
    const keys = loadGroqKeys();
    if (keys.length === 0) {
        throw new Error('No GROQ_API_KEY found in environment variables');
    }

    const startIndex = groqApiKeyCursor % keys.length;
    groqApiKeyCursor = (groqApiKeyCursor + 1) % keys.length;

    for (let attempt = 0; attempt < keys.length; attempt++) {
        const apiKey = keys[(startIndex + attempt) % keys.length];

        try {
            // Truncate prompt if it's too long to avoid 400 errors
            const truncatedPrompt = prompt.length > 8000 ? prompt.substring(0, 8000) : prompt;

            const response = await axios.post<GroqResponseData>(
                API_CONFIG.groq.baseUrl,
                {
                    model: API_CONFIG.groq.model,
                    messages: [
                        {
                            role: 'user',
                            content: truncatedPrompt,
                        },
                    ],
                    temperature: API_CONFIG.groq.temperature,
                    max_tokens: API_CONFIG.groq.maxOutputTokens,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            const text = response.data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error('No text content in Groq response');
            }

            return text;
        } catch (error) {
            const axiosError = error as AxiosError;
            const status = axiosError?.response?.status;
            const message = String(axiosError?.message ?? error ?? '');

            console.error(`[LLM Fallback] Groq error (Attempt ${attempt + 1}) - Status: ${status}, Message: ${message}`);

            // If it's a rate limit error and we have more keys, try the next one
            if (status === 429 && attempt < keys.length - 1) {
                continue;
            }

            // For decommissioned model error (400), we should still throw to let the fallback chain continue
            // but we've fixed the model name above anyway.

            throw error;
        }
    }
    throw new Error('All Groq keys exhausted');
}

/**
 * Call local Ollama model for content generation
 * @param prompt The input prompt for content generation
 * @throws Error if API call fails
 */
export async function callLocal(prompt: string): Promise<string> {
    try {
        const response = await axios.post(
            API_CONFIG.ollama.baseUrl,
            {
                model: API_CONFIG.ollama.model,
                prompt: prompt,
                temperature: API_CONFIG.ollama.temperature,
                stream: false,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 60000, // Local calls might take longer
            }
        );

        const text = response.data?.response;
        if (!text) {
            throw new Error('No text content in Ollama response');
        }

        return text.trim();
    } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError?.response?.status;
        const message = String(axiosError?.message ?? error ?? '');

        console.error(`[LLM Fallback] Ollama error - Status: ${status}, Message: ${message}`);

        const err = new Error(`Ollama error: ${message}`);
        (err as any).code = 'LOCAL_MODEL_UNAVAILABLE';
        throw err;
    }
}

// ============================================================================
// MAIN FALLBACK WRAPPER
// ============================================================================

/**
 * Generate LLM response with automatic fallback chain
 * Chain: Gemini → Groq → Local Ollama
 * 
 * @param prompt The input prompt for content generation
 * @param options Optional configuration
 * @returns LLMResponse with generated text and provider info
 * 
 * @example
 * ```typescript
 * const result = await generateLLMResponse(
 *   "What are the top 5 sales regions?"
 * );
 * console.log(result.text); // The generated response
 * console.log(result.provider); // Which provider was used
 * ```
 */
export async function generateLLMResponse(
    prompt: string,
    options?: {
        skipProviders?: Array<'gemini' | 'groq' | 'ollama'>;
        forceProvider?: 'gemini' | 'groq' | 'ollama';
    }
): Promise<LLMResponse> {
    const { skipProviders = [], forceProvider } = options || {};

    if (!prompt?.trim()) {
        throw new Error('Prompt cannot be empty');
    }

    const providers = forceProvider
        ? [forceProvider]
        : (['gemini', 'groq', 'ollama'] as const)
            .filter(p => !skipProviders.includes(p));

    let lastError: Error | null = null;

    for (const provider of providers) {
        try {
            console.log(`[LLM Fallback] Attempting provider: ${provider}`);

            let text: string;
            let model: string;

            switch (provider) {
                case 'gemini':
                    text = await callGemini(prompt);
                    model = API_CONFIG.gemini.model;
                    break;

                case 'groq':
                    text = await callGroq(prompt);
                    model = API_CONFIG.groq.model;
                    break;

                case 'ollama':
                    text = await callLocal(prompt);
                    model = API_CONFIG.ollama.model;
                    break;

                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }

            console.log(`[LLM Fallback] Successfully used provider: ${provider}`);

            return {
                text: text.trim(),
                provider,
                model,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            lastError = error;
            const errorCode = error?.code || '';
            const errorMsg = String(error?.message ?? error ?? '');

            console.warn(
                `[LLM Fallback] Provider ${provider} failed: ${errorMsg} (${errorCode})`
            );

            // If it's a quota error and not the last provider, continue to next
            if (
                (errorCode === 'QUOTA_EXCEEDED' ||
                    errorCode === 'PROVIDER_UNAVAILABLE' ||
                    errorCode === 'LOCAL_MODEL_UNAVAILABLE') &&
                provider !== providers[providers.length - 1]
            ) {
                continue;
            }

            // For unknown errors on non-final providers, also continue
            if (provider !== providers[providers.length - 1]) {
                continue;
            }

            // If we reach the last provider, throw the error
            throw error;
        }
    }

    // Fallback if no providers were attempted
    throw lastError || new Error('All LLM providers exhausted with no fallback possible');
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Test LLM provider health
 * @param provider Which provider to test
 * @returns true if provider is healthy, false otherwise
 */
export async function testProvider(
    provider: 'gemini' | 'groq' | 'ollama'
): Promise<boolean> {
    const testPrompt = 'Say "ok" in 5 words.';

    try {
        switch (provider) {
            case 'gemini':
                await callGemini(testPrompt);
                break;
            case 'groq':
                await callGroq(testPrompt);
                break;
            case 'ollama':
                await callLocal(testPrompt);
                break;
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Test all providers and return their health status
 */
export async function testAllProviders(): Promise<{
    gemini: boolean;
    groq: boolean;
    ollama: boolean;
}> {
    const [geminiHealth, groqHealth, ollamaHealth] = await Promise.all([
        testProvider('gemini'),
        testProvider('groq'),
        testProvider('ollama'),
    ]);

    return {
        gemini: geminiHealth,
        groq: groqHealth,
        ollama: ollamaHealth,
    };
}
