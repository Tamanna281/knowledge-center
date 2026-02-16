/**
 * INTEGRATION GUIDE: LLM Fallback System
 * 
 * This file demonstrates how to integrate the new multi-provider LLM fallback system
 * into your existing routes and services.
 */

// ============================================================================
// EXAMPLE 1: Basic Usage in API Route
// ============================================================================

import { generateLLMResponse } from '@/lib/llmFallback';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Example API endpoint using the fallback system
 */
export async function POST(request: NextRequest) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        // Use the fallback system - automatically tries Gemini → Groq → HuggingFace → Ollama
        const result = await generateLLMResponse(prompt);

        return NextResponse.json({
            success: true,
            response: result.text,
            provider: result.provider,
            model: result.model,
            timestamp: result.timestamp,
        });
    } catch (error: any) {
        console.error('Error in chat endpoint:', error);

        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        );
    }
}

// ============================================================================
// EXAMPLE 2: Using Specific Provider (Force a Provider)
// ============================================================================

async function generateWithSpecificProvider(prompt: string) {
    try {
        // Force using only Groq
        const result = await generateLLMResponse(prompt, {
            forceProvider: 'groq',
        });

        console.log(`Generated using: ${result.provider}`);
        return result.text;
    } catch (error) {
        console.error('Groq-specific generation failed:', error);
        throw error;
    }
}

// ============================================================================
// EXAMPLE 3: Skip Certain Providers
// ============================================================================

async function generateSkippingGemini(prompt: string) {
    try {
        // Skip Gemini and try Groq → Ollama
        const result = await generateLLMResponse(prompt, {
            skipProviders: ['gemini'],
        });

        console.log(`Generated using: ${result.provider}`);
        return result.text;
    } catch (error) {
        console.error('Generation failed (Gemini skipped):', error);
        throw error;
    }
}

// ============================================================================
// EXAMPLE 4: Structured Data Extraction with Fallback
// ============================================================================

import { extractStructuredData } from '@/lib/gemini';

async function extractDataWithFallback<T>(
    userQuery: string,
    systemPrompt: string
): Promise<T> {
    try {
        // Try Gemini's native extraction first (it handles JSON well)
        return await extractStructuredData<T>(userQuery, systemPrompt);
    } catch (error: any) {
        // If Gemini fails, fall back to using generateLLMResponse
        console.warn('Gemini extraction failed, trying fallback system:', error);

        const fullPrompt = systemPrompt.includes('{{USER_QUESTION}}')
            ? systemPrompt.replace('{{USER_QUESTION}}', userQuery)
            : `${systemPrompt}\n\nUser question:\n${userQuery}`;

        const result = await generateLLMResponse(fullPrompt);

        try {
            // Extract JSON from response
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            return JSON.parse(jsonMatch[0]) as T;
        } catch (parseError) {
            console.error('Failed to parse structured response:', parseError);
            throw parseError;
        }
    }
}

// ============================================================================
// EXAMPLE 5: Test Provider Health
// ============================================================================

import { testAllProviders, testProvider } from '@/lib/llmFallback';

/**
 * Health check endpoint to monitor provider status
 */
export async function getProviderHealth() {
    try {
        const health = await testAllProviders();

        return {
            gemini: health.gemini ? 'healthy' : 'unavailable',
            groq: health.groq ? 'healthy' : 'unavailable',
            huggingface: health.huggingface ? 'healthy' : 'unavailable',
            ollama: health.ollama ? 'healthy' : 'unavailable',
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Health check failed:', error);
        throw error;
    }
}

/**
 * Test a single provider
 */
export async function testSingleProvider(provider: 'gemini' | 'groq' | 'huggingface' | 'ollama') {
    const isHealthy = await testProvider(provider);
    return {
        provider,
        status: isHealthy ? 'healthy' : 'unavailable',
    };
}

// ============================================================================
// EXAMPLE 6: Replace Existing Gemini Calls
// ============================================================================

/**
 * BEFORE: Using generateWithGemini directly
 */
async function oldWayGenerateInsight(prompt: string) {
    const { generateWithGemini } = await import('@/lib/gemini');

    return await generateWithGemini(prompt, {
        temperature: 0.3,
        maxOutputTokens: 2500,
    });
}

/**
 * AFTER: Using fallback system
 * 
 * This approach provides automatic resilience:
 * - If Gemini quota is exceeded (429), automatically try Groq
 * - If Groq fails, automatically try local Ollama
 * - Single function call handles the entire fallback chain
 */
async function newWayGenerateInsight(prompt: string) {
    const result = await generateLLMResponse(prompt);
    return result.text; // Clean text response
}

// ============================================================================
// EXAMPLE 7: Error Handling and Logging
// ============================================================================

async function generateWithErrorHandling(prompt: string) {
    try {
        const result = await generateLLMResponse(prompt);

        // Log which provider was used
        console.log(`[Analytics] Generated response using: ${result.provider}`);
        console.log(`[Analytics] Model: ${result.model}`);

        return result.text;
    } catch (error: any) {
        // All providers failed or unavailable
        const errorMessage = error.message || 'Unknown error';
        const errorCode = error.code || 'NO_CODE';

        console.error(`[Error] LLM generation failed: ${errorMessage} (${errorCode})`);

        // Return fallback message
        return "I apologize, but I'm unable to process your request at this moment. All providers are currently unavailable. Please try again later.";
    }
}

// ============================================================================
// EXAMPLE 8: Creating a Wrapper Service
// ============================================================================

/**
 * Service class for managing LLM operations with logging and metrics
 */
export class LLMService {
    private static attemptLog: Map<string, { provider: string; timestamp: string }[]> = new Map();

    /**
     * Generate response with comprehensive logging
     */
    static async generateResponse(
        prompt: string,
        context?: { userId?: string; sessionId?: string }
    ) {
        const sessionId = context?.sessionId || 'unknown';

        try {
            const result = await generateLLMResponse(prompt);

            // Log successful generation
            const logKey = `session_${sessionId}`;
            if (!this.attemptLog.has(logKey)) {
                this.attemptLog.set(logKey, []);
            }

            this.attemptLog.get(logKey)!.push({
                provider: result.provider,
                timestamp: result.timestamp,
            });

            return {
                success: true,
                text: result.text,
                provider: result.provider,
                sessionId,
            };
        } catch (error: any) {
            console.error(`[LLMService] Generation failed for session ${sessionId}:`, error);

            return {
                success: false,
                error: error.message,
                sessionId,
            };
        }
    }

    /**
     * Get provider usage stats
     */
    static getStats() {
        const stats: Record<string, number> = {
            gemini: 0,
            groq: 0,
            huggingface: 0,
            ollama: 0,
        };

        for (const attempts of this.attemptLog.values()) {
            for (const attempt of attempts) {
                stats[attempt.provider as keyof typeof stats]++;
            }
        }

        return stats;
    }
}

// Usage of LLMService
async function exampleServiceUsage() {
    const response = await LLMService.generateResponse(
        'What are top sales by region?',
        { userId: 'user123', sessionId: 'sess_abc' }
    );

    if (response.success) {
        console.log('Generated with:', response.provider);
        console.log('Response:', response.text);
    }

    // Check stats
    const stats = LLMService.getStats();
    console.log('Provider usage:', stats);
}

// ============================================================================
// EXAMPLE 9: Timeout and Retry Configuration
// ============================================================================

/**
 * If you need custom timeout behavior, you can wrap generateLLMResponse
 */
async function generateWithTimeout(
    prompt: string,
    timeoutMs: number = 45000
): Promise<string> {
    return Promise.race([
        generateLLMResponse(prompt).then(r => r.text),
        new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        ),
    ]);
}

// ============================================================================
// EXTENDING THE FALLBACK SYSTEM
// ============================================================================

/**
 * HOW TO ADD A NEW PROVIDER:
 * 
 * 1. Create a new provider function in llmFallback.ts:
 * 
 *    export async function callNewProvider(prompt: string): Promise<string> {
 *        const apiKey = process.env.NEW_PROVIDER_API_KEY;
 *        // Implementation...
 *        return responseText;
 *    }
 * 
 * 2. Add it to the API_CONFIG object:
 * 
 *    newProvider: {
 *        baseUrl: 'https://...',
 *        model: 'model-name',
 *        temperature: 0.1,
 *    }
 * 
 * 3. Create a type for the provider:
 * 
 *    type ProviderType = 'gemini' | 'groq' | 'huggingface' | 'ollama' | 'newProvider';
 * 
 * 4. Add the provider case in generateLLMResponse:
 * 
 *    case 'newProvider':
 *        text = await callNewProvider(prompt);
 *        model = API_CONFIG.newProvider.model;
 *        break;
 * 
 * 5. Add to the providers array default order if needed:
 * 
 *    const providers = forceProvider
 *        ? [forceProvider]
 *        : (['gemini', 'groq', 'huggingface', 'ollama'] as const)
 */
