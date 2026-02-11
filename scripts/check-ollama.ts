/**
 * Ollama Health Check and Setup Script
 * 
 * This script checks if Ollama is running and provides setup instructions
 */

import axios from 'axios';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const REQUIRED_MODEL = 'llama3.2';

interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

interface OllamaTagsResponse {
    models: OllamaModel[];
}

async function checkOllamaService(): Promise<boolean> {
    try {
        const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
            timeout: 3000,
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

async function listModels(): Promise<string[]> {
    try {
        const response = await axios.get<OllamaTagsResponse>(`${OLLAMA_BASE_URL}/api/tags`, {
            timeout: 5000,
        });
        return response.data.models.map(m => m.name);
    } catch {
        return [];
    }
}

async function testModel(modelName: string): Promise<boolean> {
    try {
        console.log(`Testing model: ${modelName}...`);
        const response = await axios.post(
            `${OLLAMA_BASE_URL}/api/generate`,
            {
                model: modelName,
                prompt: 'Say "ok"',
                stream: false,
            },
            {
                timeout: 15000,
            }
        );
        return !!response.data?.response;
    } catch (error: any) {
        console.error(`  ❌ Model test failed: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🔍 Checking Ollama Setup...\n');

    // Step 1: Check if Ollama service is running
    console.log('1. Checking Ollama service...');
    const isRunning = await checkOllamaService();

    if (!isRunning) {
        console.log('  ❌ Ollama service is NOT running\n');
        console.log('📋 Setup Instructions:');
        console.log('  1. Start Ollama service:');
        console.log('     > ollama serve');
        console.log('  2. In a new terminal, pull the required model:');
        console.log(`     > ollama pull ${REQUIRED_MODEL}`);
        console.log('  3. Run this script again to verify\n');
        process.exit(1);
    }

    console.log('  ✅ Ollama service is running\n');

    // Step 2: List available models
    console.log('2. Checking installed models...');
    const models = await listModels();

    if (models.length === 0) {
        console.log('  ❌ No models installed\n');
        console.log('📋 Install a model:');
        console.log(`  > ollama pull ${REQUIRED_MODEL}`);
        console.log('  OR');
        console.log('  > ollama pull llama3');
        console.log('  > ollama pull mistral\n');
        process.exit(1);
    }

    console.log(`  ✅ Found ${models.length} model(s):`);
    models.forEach(m => console.log(`     - ${m}`));
    console.log('');

    // Step 3: Check if required model is available
    console.log(`3. Checking for required model: ${REQUIRED_MODEL}...`);
    const hasRequiredModel = models.some(m => m.includes(REQUIRED_MODEL.split(':')[0]));

    if (!hasRequiredModel) {
        console.log(`  ⚠️  Required model '${REQUIRED_MODEL}' not found\n`);
        console.log('📋 Install the required model:');
        console.log(`  > ollama pull ${REQUIRED_MODEL}\n`);
        console.log('Available models you have:');
        models.forEach(m => console.log(`  - ${m}`));
        console.log('');
    } else {
        console.log(`  ✅ Required model '${REQUIRED_MODEL}' is installed\n`);
    }

    // Step 4: Test the model
    console.log('4. Testing model response...');
    const modelToTest = hasRequiredModel ? REQUIRED_MODEL : models[0];
    const testPassed = await testModel(modelToTest);

    if (!testPassed) {
        console.log(`  ❌ Model test failed\n`);
        console.log('📋 Troubleshooting:');
        console.log('  1. Restart Ollama:');
        console.log('     > taskkill /F /IM ollama.exe');
        console.log('     > ollama serve');
        console.log('  2. Re-pull the model:');
        console.log(`     > ollama pull ${modelToTest}`);
        console.log('  3. Check Ollama logs for errors\n');
        process.exit(1);
    }

    console.log('  ✅ Model is responding correctly\n');

    // Success!
    console.log('✨ All checks passed! Ollama is ready to use.\n');
    console.log('Configuration:');
    console.log(`  - Service URL: ${OLLAMA_BASE_URL}`);
    console.log(`  - Active Model: ${modelToTest}`);
    console.log(`  - Available Models: ${models.join(', ')}\n`);
}

main().catch(error => {
    console.error('❌ Script error:', error.message);
    process.exit(1);
});
