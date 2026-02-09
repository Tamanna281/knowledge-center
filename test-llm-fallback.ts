/**
 * LLM Fallback System - Test Script
 * 
 * Run this from your project root to test the fallback system:
 * npx ts-node test-llm-fallback.ts
 * 
 * Or add to package.json scripts:
 * "test:llm": "ts-node test-llm-fallback.ts"
 */

import { 
    generateLLMResponse, 
    testAllProviders, 
    testProvider 
} from './src/lib/llmFallback';

// Color output helpers
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(type: 'success' | 'error' | 'info' | 'warn' | 'test', message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️ ',
        warn: '⚠️ ',
        test: '🧪',
    };

    const color = {
        success: colors.green,
        error: colors.red,
        info: colors.blue,
        warn: colors.yellow,
        test: colors.cyan,
    };

    console.log(
        `${color[type]}${colors.bright}[${timestamp}]${colors.reset} ${icons[type]} ${message}`
    );
}

async function testSingleProvider(provider: 'gemini' | 'groq' | 'ollama') {
    log('test', `Testing ${colors.bright}${provider}${colors.reset}...`);
    try {
        const isHealthy = await testProvider(provider);
        if (isHealthy) {
            log('success', `${colors.bright}${provider}${colors.reset} is healthy`);
            return true;
        } else {
            log('warn', `${colors.bright}${provider}${colors.reset} is unavailable`);
            return false;
        }
    } catch (error: any) {
        log('error', `${colors.bright}${provider}${colors.reset} test failed: ${error.message}`);
        return false;
    }
}

async function testGeneration() {
    const testPrompt = 'What is 2+2? Answer in one sentence.';

    log('test', `Testing generation with prompt: "${testPrompt}"`);
    console.log('');

    try {
        log('info', 'Starting generation with automatic fallback...');
        const result = await generateLLMResponse(testPrompt);

        log('success', `Generation completed!`);
        console.log('');
        console.log(`${colors.bright}Result Details:${colors.reset}`);
        console.log(`  Provider: ${colors.green}${result.provider}${colors.reset}`);
        console.log(`  Model:    ${colors.green}${result.model}${colors.reset}`);
        console.log(`  Time:     ${result.timestamp}`);
        console.log(`  Response: ${colors.cyan}${result.text.substring(0, 100)}...${colors.reset}`);
        console.log('');

        return true;
    } catch (error: any) {
        log('error', `Generation failed: ${error.message}`);
        console.log('');
        return false;
    }
}

async function testSpecificProvider(provider: 'gemini' | 'groq' | 'ollama') {
    const testPrompt = 'Say "test successful" in exactly 3 words.';

    log('test', `Testing ${colors.bright}${provider}${colors.reset} specific generation...`);

    try {
        const result = await generateLLMResponse(testPrompt, {
            forceProvider: provider,
        });

        log('success', `${colors.bright}${provider}${colors.reset} generation successful`);
        console.log(`  Response: ${result.text.substring(0, 80)}`);
        console.log('');

        return true;
    } catch (error: any) {
        log('error', `${colors.bright}${provider}${colors.reset} generation failed: ${error.message}`);
        console.log('');
        return false;
    }
}

async function testFallback() {
    const testPrompt = 'List 3 programming languages.';

    log('test', 'Testing fallback mechanism (Gemini → Groq → Ollama)...');
    console.log('');

    try {
        const result = await generateLLMResponse(testPrompt);

        log('success', 'Fallback test completed');
        console.log(`  Final provider used: ${colors.green}${result.provider}${colors.reset}`);
        console.log(`  Response: ${result.text.substring(0, 80)}`);
        console.log('');

        return true;
    } catch (error: any) {
        log('error', `Fallback test failed: ${error.message}`);
        console.log('');
        return false;
    }
}

async function testSkipProvider() {
    const testPrompt = 'Say "skipped" in one word.';

    log('test', 'Testing skip mechanism (skip Gemini, use Groq → Ollama)...');

    try {
        const result = await generateLLMResponse(testPrompt, {
            skipProviders: ['gemini'],
        });

        log('success', 'Skip test completed');
        console.log(`  Provider used: ${colors.green}${result.provider}${colors.reset}`);
        console.log(`  Response: ${result.text.substring(0, 80)}`);
        console.log('');

        return true;
    } catch (error: any) {
        log('error', `Skip test failed: ${error.message}`);
        console.log('');
        return false;
    }
}

async function runAllTests() {
    console.log('');
    console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║  LLM Fallback System - Test Suite          ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════╝${colors.reset}`);
    console.log('');

    let passed = 0;
    let failed = 0;

    // Test 1: Health Check All Providers
    console.log(`${colors.bright}TEST SUITE 1: Provider Health Checks${colors.reset}`);
    console.log('─'.repeat(50));

    try {
        log('test', 'Running all provider health checks...');
        const health = await testAllProviders();
        console.log('');
        console.log('Health Status:');
        Object.entries(health).forEach(([provider, isHealthy]) => {
            const status = isHealthy ? `${colors.green}healthy${colors.reset}` : `${colors.red}unavailable${colors.reset}`;
            console.log(`  ${provider}: ${status}`);
        });
        console.log('');
        passed++;
    } catch (error: any) {
        log('error', `Health check failed: ${error.message}`);
        failed++;
    }

    // Test 2: Individual Provider Tests
    console.log(`${colors.bright}TEST SUITE 2: Individual Provider Tests${colors.reset}`);
    console.log('─'.repeat(50));

    const providers: Array<'gemini' | 'groq' | 'ollama'> = ['gemini', 'groq', 'ollama'];
    for (const provider of providers) {
        const success = await testSingleProvider(provider);
        success ? passed++ : failed++;
    }
    console.log('');

    // Test 3: Generation with Automatic Fallback
    console.log(`${colors.bright}TEST SUITE 3: Generation with Automatic Fallback${colors.reset}`);
    console.log('─'.repeat(50));

    const genSuccess = await testGeneration();
    genSuccess ? passed++ : failed++;

    // Test 4: Force Specific Provider
    console.log(`${colors.bright}TEST SUITE 4: Force Specific Provider${colors.reset}`);
    console.log('─'.repeat(50));

    for (const provider of providers) {
        const success = await testSpecificProvider(provider);
        success ? passed++ : failed++;
    }

    // Test 5: Fallback Mechanism
    console.log(`${colors.bright}TEST SUITE 5: Fallback Mechanism${colors.reset}`);
    console.log('─'.repeat(50));

    const fallbackSuccess = await testFallback();
    fallbackSuccess ? passed++ : failed++;

    // Test 6: Skip Provider
    console.log(`${colors.bright}TEST SUITE 6: Skip Provider${colors.reset}`);
    console.log('─'.repeat(50));

    const skipSuccess = await testSkipProvider();
    skipSuccess ? passed++ : failed++;

    // Summary
    console.log('');
    console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║             TEST SUMMARY                   ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════╝${colors.reset}`);
    console.log('');
    console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
    console.log(`${colors.cyan}Total:  ${passed + failed}${colors.reset}`);
    console.log('');

    if (failed === 0) {
        log('success', 'All tests passed! System is ready to use.');
    } else {
        log('warn', `${failed} test(s) failed. See details above.`);
    }

    console.log('');
    console.log(`${colors.bright}Next Steps:${colors.reset}`);
    console.log('1. Review any failed tests above');
    console.log('2. Check your .env file for required API keys');
    console.log('3. Ensure Ollama is running if you tested it: ollama serve');
    console.log('4. Integrate into your routes: import { generateLLMResponse } from "@/lib/llmFallback"');
    console.log('');
}

// Run all tests
runAllTests().catch((error) => {
    log('error', `Test suite failed: ${error.message}`);
    process.exit(1);
});
