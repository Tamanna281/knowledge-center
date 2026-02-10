/**
 * CHAT ROUTE INTEGRATION EXAMPLE
 * 
 * This file shows how to update src/app/api/chat/route.ts
 * to use the new multi-provider LLM fallback system
 */

// ============================================================================
// BEFORE: Original Implementation (using direct Gemini calls)
// ============================================================================

/*
import { generateWithGemini } from "@/lib/gemini";
import { INSIGHT_SYSTEM_PROMPT, InsightResponse, validateInsight, createFallbackInsight } from "@/lib/insight-prompt";

async function generateInsightFromContext_ORIGINAL(
    question: string,
    retrievedContext: string,
    recordCount: number
): Promise<InsightResponse> {
    try {
        const userPrompt = `User Question: ${question}

RETRIEVED CONTEXT:
${retrievedContext}

Based ONLY on the retrieved context above, provide a structured analytical insight response.`;

        const fullPrompt = `${INSIGHT_SYSTEM_PROMPT}\n\n${userPrompt}`;

        // ❌ This directly calls Gemini and has no fallback
        const response = await generateWithGemini(fullPrompt, {
            temperature: 0.3,
            maxOutputTokens: 2500,
        });

        // ... rest of processing
    } catch (error: any) {
        console.error("Error generating insight from context:", error);
        // ... error handling
    }
}
*/

// ============================================================================
// AFTER: Updated Implementation (using fallback system)
// ============================================================================

import { generateLLMResponse } from "@/lib/llmFallback";
import { INSIGHT_SYSTEM_PROMPT, InsightResponse, validateInsight, createFallbackInsight } from "@/lib/insight-prompt";

/**
 * Generate structured insight from retrieved context using multi-provider LLM fallback
 * 
 * Fallback chain:
 * 1. Tries Gemini API first
 * 2. If Gemini returns 429 (quota), automatically tries Groq
 * 3. If Groq fails or is unavailable, automatically tries Local Ollama
 * 4. Returns response text and provider info
 */
async function generateInsightFromContext_UPDATED(
    question: string,
    retrievedContext: string,
    recordCount: number
): Promise<InsightResponse> {
    try {
        const userPrompt = `User Question: ${question}

RETRIEVED CONTEXT:
${retrievedContext}

Based ONLY on the retrieved context above, provide a structured analytical insight response.`;

        const fullPrompt = `${INSIGHT_SYSTEM_PROMPT}\n\n${userPrompt}`;

        // ✅ This uses the new fallback system
        // Automatically: Gemini → Groq → Ollama
        const result = await generateLLMResponse(fullPrompt);

        // Log which provider was used for monitoring
        console.log(
            `[Insight Generation] Using ${result.provider} (${result.model})`
        );

        // Parse JSON response - same as before
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return createFallbackInsight(retrievedContext);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const validated = validateInsight(parsed);

        // Add actual record count
        validated.dataPoints.totalRecords = recordCount;

        return validated;
    } catch (error: any) {
        console.error("Error generating insight from context:", error);

        // --- LOCAL INTELLIGENCE FALLBACK (for when all providers fail) ---
        // This is the ultimate fallback when even Ollama is unavailable
        const fallback = createFallbackInsight(retrievedContext);
        return fallback;
    }
}

// ============================================================================
// IMPORT CHANGES NEEDED IN chat/route.ts
// ============================================================================

/*
OLD IMPORT:
import { generateWithGemini } from "@/lib/gemini";

NEW IMPORT:
import { generateLLMResponse } from "@/lib/llmFallback";

ALTERNATIVE (if keeping both):
import { generateWithGemini } from "@/lib/gemini";
import { generateLLMResponse } from "@/lib/llmFallback";

Then decide which one to use based on use case:
- generateLLMResponse for general insights (preferred - has fallback)
- generateWithGemini for specialized Gemini features if needed
*/

// ============================================================================
// KEY CHANGES SUMMARY
// ============================================================================

/*
CHANGE 1: Import statement
  FROM: import { generateWithGemini } from "@/lib/gemini";
  TO:   import { generateLLMResponse } from "@/lib/llmFallback";

CHANGE 2: Function call within generateInsightFromContext
  FROM: const response = await generateWithGemini(fullPrompt, { ... });
        const text = response;

  TO:   const result = await generateLLMResponse(fullPrompt);
        const text = result.text;
        // Optional: Log provider  
        console.log(`Used provider: ${result.provider}`);

CHANGE 3: Error handling (mostly stays the same)
  No changes needed - both throw errors, just wrapped differently

KEY BENEFITS:
  ✅ Automatic fallback from Gemini to Groq to Ollama
  ✅ No single point of failure - quota errors are handled
  ✅ Better resilience during API outages
  ✅ Can track which provider is being used
  ✅ Can add more providers easily later
*/

// ============================================================================
// ADVANCED: Health Check Endpoint
// ============================================================================

import { NextResponse } from "next/server";
import { testAllProviders } from "@/lib/llmFallback";

/**
 * Optional health check endpoint to monitor provider status
 * Add this to src/app/api/health/providers/route.ts
 */
export async function GET() {
    try {
        const health = await testAllProviders();

        const allHealthy = health.gemini && health.groq && health.ollama;
        const anyAvailable = health.gemini || health.groq || health.ollama;

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            providers: {
                gemini: {
                    status: health.gemini ? "healthy" : "unavailable",
                },
                groq: {
                    status: health.groq ? "healthy" : "unavailable",
                },
                ollama: {
                    status: health.ollama ? "healthy" : "unavailable",
                },
            },
            system: {
                allHealthy,
                anyAvailable,
                message: anyAvailable
                    ? "System is operational"
                    : "All LLM providers are unavailable",
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: "Health check failed",
                message: error.message,
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// ADVANCED: Provider-Specific Routes
// ============================================================================

/**
 * Optional: Create specialized routes if you need to force a specific provider
 * Add this to src/app/api/chat/gemini/route.ts
 */
export async function POST_GEMINI_ONLY(request: any) {
    try {
        const { prompt } = await request.json();

        const result = await generateLLMResponse(prompt, {
            forceProvider: 'gemini',
        });

        return NextResponse.json({
            text: result.text,
            provider: result.provider,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

/**
 * Optional: Route to skip expensive provider and go directly to cheaper ones
 * Add this to src/app/api/chat/fast/route.ts
 */
export async function POST_FAST(request: any) {
    try {
        const { prompt } = await request.json();

        // Skip Gemini, try Groq → Ollama (faster/cheaper path)
        const result = await generateLLMResponse(prompt, {
            skipProviders: ['gemini'],
        });

        return NextResponse.json({
            text: result.text,
            provider: result.provider,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/*
□ 1. Copy llmFallback.ts to src/lib/
□ 2. Ensure .env has necessary keys:
    - GOOGLE_API_KEY_1 (or GOOGLE_API_KEY)
    - GROQ_API_KEY_1 (or GROQ_API_KEY)
    - Optional: Configure Ollama at localhost:11434
□ 3. Update import in chat/route.ts:
    Old: import { generateWithGemini } from "@/lib/gemini";
    New: import { generateLLMResponse } from "@/lib/llmFallback";
□ 4. Update generateInsightFromContext function:
    Old: const response = await generateWithGemini(...)
    New: const result = await generateLLMResponse(...)
         const text = result.text;
□ 5. Run the application and test:
    npm run dev
□ 6. Monitor logs for [LLM Fallback] messages to see which providers are used
□ 7. (Optional) Set up health check endpoint to monitor providers
□ 8. (Optional) Create provider-specific routes if needed
*/
