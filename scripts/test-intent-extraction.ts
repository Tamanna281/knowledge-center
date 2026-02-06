// scripts/test-intent-extraction.ts
/**
 * Test script for Intent Extraction API
 * 
 * This script tests the intent extraction endpoint with various sample questions
 * to validate that it correctly extracts structured intents.
 * 
 * Usage: ts-node scripts/test-intent-extraction.ts
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api/intent/extract';

interface TestCase {
    question: string;
    expectedType: 'supported' | 'unsupported';
    description: string;
}

const TEST_CASES: TestCase[] = [
    // ===== SUPPORTED QUERIES =====
    {
        question: 'Which product sold the most?',
        expectedType: 'supported',
        description: 'Simple aggregation with grouping and sorting',
    },
    {
        question: 'What is the average order amount?',
        expectedType: 'supported',
        description: 'Simple average aggregation',
    },
    {
        question: 'Show me total revenue by region',
        expectedType: 'supported',
        description: 'Sum aggregation with group by',
    },
    {
        question: 'How many customers are in the North region?',
        expectedType: 'supported',
        description: 'Count with filter',
    },
    {
        question: 'What is the maximum price in the products table?',
        expectedType: 'supported',
        description: 'Max aggregation',
    },
    {
        question: 'Show me total sales quantity by product for 2024',
        expectedType: 'supported',
        description: 'Aggregation with grouping and date filter',
    },
    {
        question: 'What is the minimum order amount?',
        expectedType: 'supported',
        description: 'Min aggregation',
    },
    {
        question: 'Total revenue by category',
        expectedType: 'supported',
        description: 'Sum with category grouping',
    },

    // ===== UNSUPPORTED QUERIES =====
    {
        question: 'What is the company vision?',
        expectedType: 'unsupported',
        description: 'Non-data question (policy/document)',
    },
    {
        question: 'What do you think will happen next quarter?',
        expectedType: 'unsupported',
        description: 'Prediction/opinion question',
    },
    {
        question: 'How do I reset my password?',
        expectedType: 'unsupported',
        description: 'Action/help question',
    },
    {
        question: 'Tell me about the sales team',
        expectedType: 'unsupported',
        description: 'Non-numeric narrative question',
    },
    {
        question: 'Delete all orders from yesterday',
        expectedType: 'unsupported',
        description: 'Destructive action request',
    },
];

const DELAY_MS = Number(process.env.INTENT_TEST_DELAY_MS ?? 1200);

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
    cyan: '\x1b[36m',
};

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testIntentExtraction() {
    console.log('\n🧪 Starting Intent Extraction Tests\n');
    console.log('='.repeat(80));

    let passed = 0;
    let failed = 0;

    for (let i = 0; i < TEST_CASES.length; i++) {
        const testCase = TEST_CASES[i];
        const testNum = i + 1;

        console.log(`\n${colors.cyan}Test ${testNum}/${TEST_CASES.length}${colors.reset}`);
        console.log(`${colors.gray}Description: ${testCase.description}${colors.reset}`);
        console.log(`Question: "${testCase.question}"`);

        try {
            const response = await axios.post(API_URL, {
                question: testCase.question,
            });

            const { success, intent } = response.data;

            if (!success) {
                console.log(`${colors.red}❌ FAILED - API returned success: false${colors.reset}`);
                console.log('Error:', response.data.error);
                failed++;
                continue;
            }

            // Check if the response matches expected type
            const isUnsupported = 'unsupported' in intent && intent.unsupported === true;
            const actualType = isUnsupported ? 'unsupported' : 'supported';

            if (actualType === testCase.expectedType) {
                console.log(`${colors.green}✅ PASSED${colors.reset}`);
                console.log(`${colors.gray}Intent:${colors.reset}`, JSON.stringify(intent, null, 2));
                passed++;
            } else {
                console.log(`${colors.red}❌ FAILED - Expected ${testCase.expectedType}, got ${actualType}${colors.reset}`);
                console.log('Intent:', JSON.stringify(intent, null, 2));
                failed++;
            }

        } catch (error: any) {
            console.log(`${colors.red}❌ FAILED - Request error${colors.reset}`);
            if (error.response) {
                console.log('Status:', error.response.status);
                console.log('Error:', error.response.data);
            } else {
                console.log('Error:', error.message);
            }
            failed++;
        }
        if (DELAY_MS > 0 && i < TEST_CASES.length - 1) {
            await sleep(DELAY_MS);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Test Summary:`);
    console.log(`   ${colors.green}✅ Passed: ${passed}${colors.reset}`);
    console.log(`   ${colors.red}❌ Failed: ${failed}${colors.reset}`);
    console.log(`   Total: ${TEST_CASES.length}`);
    console.log(`   Success Rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%\n`);

    if (failed === 0) {
        console.log(`${colors.green}🎉 All tests passed!${colors.reset}\n`);
    } else {
        console.log(`${colors.yellow}⚠️  Some tests failed. Review the output above.${colors.reset}\n`);
    }
}

// Run tests
testIntentExtraction().catch((error) => {
    console.error('Test suite error:', error);
    process.exit(1);
});
