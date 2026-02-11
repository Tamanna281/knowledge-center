/**
 * Test script to verify all optimizations are working
 */

import { generateLLMResponse } from '../src/lib/llmFallback';
import { llmCache } from '../src/lib/llmCache';

async function testOptimizations() {
    console.log('🧪 Testing Chatbot Optimizations\n');

    // Test 1: Cache functionality
    console.log('Test 1: Cache Functionality');
    console.log('----------------------------');

    const testPrompt = 'What is 2+2?';

    console.log('First request (should hit LLM)...');
    const start1 = Date.now();
    try {
        const response1 = await generateLLMResponse(testPrompt);
        const duration1 = Date.now() - start1;
        console.log(`✅ Response received in ${duration1}ms`);
        console.log(`   Provider: ${response1.provider}`);
        console.log(`   Model: ${response1.model}`);
        console.log(`   Text: ${response1.text.substring(0, 50)}...`);
    } catch (error: any) {
        console.log(`❌ First request failed: ${error.message}`);
    }

    console.log('\nSecond request (should hit cache)...');
    const start2 = Date.now();
    try {
        const response2 = await generateLLMResponse(testPrompt);
        const duration2 = Date.now() - start2;
        console.log(`✅ Response received in ${duration2}ms`);
        console.log(`   Provider: ${response2.provider}`);

        if (duration2 < 100) {
            console.log('   🎉 CACHE HIT! Response was instant!');
        } else {
            console.log('   ⚠️  Cache might not be working (response took > 100ms)');
        }
    } catch (error: any) {
        console.log(`❌ Second request failed: ${error.message}`);
    }

    // Test 2: Cache stats
    console.log('\n\nTest 2: Cache Statistics');
    console.log('----------------------------');
    const stats = llmCache.getStats();
    console.log(`Cache size: ${stats.size}/${stats.maxSize}`);
    console.log(`TTL: ${stats.ttlMinutes} minutes`);

    // Test 3: Provider fallback (optional, might fail if providers are down)
    console.log('\n\nTest 3: Provider Fallback');
    console.log('----------------------------');

    const providers = ['gemini', 'groq', 'ollama'] as const;

    for (const provider of providers) {
        console.log(`\nTesting ${provider}...`);
        const start = Date.now();
        try {
            const response = await generateLLMResponse('Say "ok"', {
                forceProvider: provider,
            });
            const duration = Date.now() - start;
            console.log(`  ✅ ${provider} responded in ${duration}ms`);
        } catch (error: any) {
            const duration = Date.now() - start;
            console.log(`  ❌ ${provider} failed in ${duration}ms: ${error.message.substring(0, 80)}`);
        }
    }

    console.log('\n\n✨ Testing Complete!\n');
}

testOptimizations().catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
});
