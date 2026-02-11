/**
 * Multi-Provider LLM Fallback System
 * Fallback chain: Gemini → Groq → Local Ollama
 * 
 * This module implements a resilient response generation system that automatically
 * falls back to alternative providers when the primary provider fails.
 */

import axios, { AxiosError } from 'axios';
import { generateWithGemini } from './gemini';
import { llmCache } from './llmCache';

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
        baseUrl: 'http://127.0.0.1:11434/api/generate',
        model: 'gemma3:1b', // Switched from llama3.2 to gemma3:1b (much faster for local speed)
        temperature: 0.1,
        timeout: 60000, // Increased to 60s for safety during heavy data pulls
        healthCheckTimeout: 3000, // Keep quick health check
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

    // Limit retries to 2 attempts max for faster fallback
    const maxAttempts = Math.min(keys.length, 2);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
                    timeout: 15000, // Reduced from 30s to 15s
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

            console.error(`[LLM Fallback] Groq error (Attempt ${attempt + 1}/${maxAttempts}) - Status: ${status}, Message: ${message}`);

            // If it's a rate limit error and we have more attempts, try the next one
            if (status === 429 && attempt < maxAttempts - 1) {
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
 * Quick health check for Ollama service
 * @returns true if Ollama is responsive, false otherwise
 */
async function isOllamaHealthy(): Promise<boolean> {
    try {
        const response = await axios.get('http://localhost:11434/api/tags', {
            timeout: API_CONFIG.ollama.healthCheckTimeout,
        });
        return response.status === 200;
    } catch {
        return false;
    }
}

/**
 * Call local Ollama model for content generation
 * @param prompt The input prompt for content generation
 * @throws Error if API call fails
 */
export async function callLocal(prompt: string): Promise<string> {
    // Quick health check before attempting (saves time on failures)
    const isHealthy = await isOllamaHealthy();
    if (!isHealthy) {
        const err = new Error('Ollama service is not running or not responding. Please start Ollama with: ollama serve');
        (err as any).code = 'LOCAL_MODEL_UNAVAILABLE';
        throw err;
    }

    try {
        // SMART COMPRESSION: Local models struggle with massive context.
        // If the prompt is too long, we keep the system instructions and user question,
        // but trim the middle (usually the large document context).
        let processedPrompt = prompt;
        if (prompt.length > 3000) {
            console.log(`[LLM Fallback] Compressing prompt for local model (${prompt.length} chars -> 3000 chars)`);

            // Try to extract the question and the most relevant context part
            const lines = prompt.split('\n');
            const userQuestion = lines.slice(-5).join('\n'); // Question
            const context = lines.slice(15, -5).join('\n').substring(0, 1200); // Context

            processedPrompt = `### TASK: ANALYZE DATA & RESPOND IN JSON
### RULES:
1. ONLY output valid JSON.
2. NO conversational text.
3. Use the keys: "type", "keyInsight", "sections", "analyticalSummary", "chart".

### DATA CONTEXT:
${context}

### USER REQUEST:
${userQuestion}

### STRIKE OUTPUT (JSON ONLY):
{`;
            processedPrompt = processedPrompt.trim();
        }

        const response = await axios.post(
            API_CONFIG.ollama.baseUrl,
            {
                model: API_CONFIG.ollama.model,
                prompt: processedPrompt,
                temperature: 0.1, // Keep it precise
                stream: false,
                options: {
                    num_predict: 2048, // Increased from 512 to prevent JSON cutting off
                    num_ctx: 4096,    // Manageable context window
                    low_vram: true    // Optimized for consumer hardware
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: API_CONFIG.ollama.timeout,
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

        // Provide helpful error messages
        if (message.includes('timeout')) {
            const err = new Error(`Ollama timeout: Model '${API_CONFIG.ollama.model}' took too long to respond. Try: 1) Check if model is pulled: 'ollama list' 2) Pull model: 'ollama pull ${API_CONFIG.ollama.model}' 3) Restart Ollama: 'ollama serve'`);
            (err as any).code = 'LOCAL_MODEL_UNAVAILABLE';
            throw err;
        }

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

    // Check cache first (unless forcing a specific provider for testing)
    if (!forceProvider) {
        const cached = llmCache.get(prompt);
        if (cached) {
            return {
                text: cached.text,
                provider: cached.provider as 'gemini' | 'groq' | 'ollama',
                model: cached.model,
                timestamp: cached.timestamp,
            };
        }
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

            const response: LLMResponse = {
                text: text.trim(),
                provider,
                model,
                timestamp: new Date().toISOString(),
            };

            // Cache the successful response
            llmCache.set(prompt, {
                text: response.text,
                provider: response.provider,
                model: response.model,
                timestamp: response.timestamp,
                expiresAt: 0, // Will be set by cache
            });

            return response;
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
