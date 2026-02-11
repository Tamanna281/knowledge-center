
import { generateLLMResponse } from '../lib/llmFallback';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Starting LLM Fallback Verification (Groq Timing)...");

    const start = Date.now();
    try {
        console.log("\n--- Testing Groq Logic ---");
        // Force provider Groq to see how long it takes to fail (expect ~few seconds if 429)
        await generateLLMResponse("test", { forceProvider: 'groq' });
        console.log(`✅ Groq succeeded in ${Date.now() - start}ms`);

    } catch (error) {
        const duration = Date.now() - start;
        console.error(`❌ Groq failed in ${duration}ms`);
        // If duration is like ~8s * 3 = 24s, that's significant.
    }
}

main().catch(console.error);
