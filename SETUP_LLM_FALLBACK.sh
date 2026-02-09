#!/bin/bash
# LLM Fallback System - Setup & Testing Guide
# Run this file step-by-step to verify your setup and test the fallback system

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   LLM Fallback System - Setup & Testing Guide              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: Verify Environment Variables
# ============================================================================
echo "📋 STEP 1: Checking Environment Variables..."
echo ""

if [ -z "$GOOGLE_API_KEY_1" ]; then
    echo "❌ GOOGLE_API_KEY_1 not set"
else
    echo "✅ GOOGLE_API_KEY_1 found"
fi

if [ -z "$GROQ_API_KEY_1" ]; then
    echo "❌ GROQ_API_KEY_1 not set"
else
    echo "✅ GROQ_API_KEY_1 found"
fi

echo ""
echo "Currently using .env file at:"
echo "$(pwd)/.env"
echo ""

# ============================================================================
# STEP 2: Verify File Structure
# ============================================================================
echo "📁 STEP 2: Verifying File Structure..."
echo ""

if [ -f "src/lib/llmFallback.ts" ]; then
    echo "✅ src/lib/llmFallback.ts exists"
else
    echo "❌ src/lib/llmFallback.ts not found"
fi

if [ -f "src/lib/llmFallback-integration-guide.ts" ]; then
    echo "✅ src/lib/llmFallback-integration-guide.ts exists"
else
    echo "❌ src/lib/llmFallback-integration-guide.ts not found"
fi

if [ -f "README_LLM_FALLBACK.md" ]; then
    echo "✅ README_LLM_FALLBACK.md exists"
else
    echo "❌ README_LLM_FALLBACK.md not found"
fi

echo ""

# ============================================================================
# STEP 3: Check Dependencies
# ============================================================================
echo "📦 STEP 3: Checking Dependencies..."
echo ""

if grep -q '"axios"' package.json; then
    echo "✅ axios is installed"
else
    echo "❌ axios not found in package.json"
fi

if grep -q '"typescript"' package.json; then
    echo "✅ TypeScript is configured"
else
    echo "❌ TypeScript not found in package.json"
fi

echo ""

# ============================================================================
# STEP 4: Test Provider Connectivity (Requires curl)
# ============================================================================
echo "🔌 STEP 4: Testing Provider Connectivity..."
echo ""

# Test Gemini API
if command -v curl &> /dev/null; then
    echo "Testing Gemini API..."
    if [ -n "$GOOGLE_API_KEY_1" ]; then
        GEMINI_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=$GOOGLE_API_KEY_1" \
            -H "Content-Type: application/json" \
            -d '{"contents":[{"parts":[{"text":"Say ok"}]}]}' \
            --connect-timeout 5)
        
        HTTP_CODE=$(echo "$GEMINI_RESPONSE" | tail -n 1)
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ Gemini API is reachable and authenticated"
        elif [ "$HTTP_CODE" = "429" ]; then
            echo "⚠️  Gemini API: Quota exceeded (expected - fallback will handle)"
        else
            echo "❌ Gemini API: HTTP $HTTP_CODE (check key validity)"
        fi
    else
        echo "⏭️  Skipping Gemini test (no API key in environment)"
    fi
    echo ""

    # Test Groq API
    echo "Testing Groq API..."
    if [ -n "$GROQ_API_KEY_1" ]; then
        GROQ_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -X POST "https://api.groq.com/openai/v1/chat/completions" \
            -H "Authorization: Bearer $GROQ_API_KEY_1" \
            -H "Content-Type: application/json" \
            -d '{"model":"mixtral-8x7b-32768","messages":[{"role":"user","content":"Say ok"}]}' \
            --connect-timeout 5)
        
        HTTP_CODE=$(echo "$GROQ_RESPONSE" | tail -n 1)
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ Groq API is reachable and authenticated"
        else
            echo "❌ Groq API: HTTP $HTTP_CODE (check key validity)"
        fi
    else
        echo "⏭️  Skipping Groq test (no API key in environment)"
    fi
    echo ""

    # Test Ollama
    echo "Testing Local Ollama..."
    OLLAMA_STATUS=$(curl -s -w "\n%{http_code}" \
        "http://localhost:11434/api/tags" \
        --connect-timeout 2)
    
    HTTP_CODE=$(echo "$OLLAMA_STATUS" | tail -n 1)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Ollama is running locally"
    else
        echo "❌ Ollama not accessible at localhost:11434"
        echo "   To start Ollama: ollama serve"
        echo "   To pull a model: ollama pull mistral"
    fi
else
    echo "⏭️  curl not found - skipping connectivity tests"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📝 NEXT STEPS:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  The core implementation is ready at:"
echo "   src/lib/llmFallback.ts"
echo ""
echo "2️⃣  To use it in your code, import and call:"
echo "   import { generateLLMResponse } from '@/lib/llmFallback';"
echo "   const result = await generateLLMResponse('Your prompt');"
echo ""
echo "3️⃣  Start your development server:"
echo "   npm run dev"
echo ""
echo "4️⃣  Monitor the logs:"
echo "   Look for '[LLM Fallback]' messages showing which provider is used"
echo ""
echo "5️⃣  Optional: Set up local Ollama for complete fallback chain:"
echo "   brew install ollama  # or download from https://ollama.ai"
echo "   ollama serve"
echo "   ollama pull mistral   # or any other model"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📚 For detailed documentation, see:"
echo "   - README_LLM_FALLBACK.md (Full guide)"
echo "   - QUICK_REFERENCE_LLM.md (Quick reference)"
echo "   - src/lib/llmFallback-integration-guide.ts (Code examples)"
echo ""
echo "✨ Your multi-provider LLM fallback system is ready!"
echo ""
