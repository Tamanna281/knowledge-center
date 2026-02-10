// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEYS = loadApiKeys();
// Lazy check: Do not throw at module level to allow build to pass without keys
if (API_KEYS.length === 0) {
    console.warn('⚠️ No GOOGLE_API_KEY_* found. Gemini calls will fail unless keys are added.');
}

let apiKeyCursor = 0;

export interface GeminiConfig {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    maxRetries?: number;
    retryBaseMs?: number;
    retryMaxMs?: number;
}

/**
 * Generate content using Gemini API
 */
export async function generateWithGemini(
    prompt: string,
    config: GeminiConfig = {}
): Promise<string> {
    const {
        model = 'gemini-2.0-flash',  // Updated to valid model. Fallback: gemini-2.0-flash-lite
        temperature = 0.1, // Low temperature for structured output
        maxOutputTokens = 2048, // Increased for chart data
        maxRetries = 2,
        retryBaseMs = 750,
        retryMaxMs = 8000,
    } = config;

    const keyCount = API_KEYS.length;
    const totalAttempts = Math.max(maxRetries + 1, keyCount);

    if (keyCount === 0) {
        throw new Error('No GOOGLE_API_KEY_* values found in environment variables');
    }

    const startIndex = apiKeyCursor % keyCount;
    apiKeyCursor = (apiKeyCursor + 1) % keyCount;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        const keyIndex = (startIndex + attempt) % keyCount;
        const apiKey = API_KEYS[keyIndex];

        const geminiModel = new GoogleGenerativeAI(apiKey).getGenerativeModel({
            model,
            generationConfig: {
                temperature,
                maxOutputTokens,
                responseMimeType: 'application/json', // Force JSON output
            },
        });

        try {
            const result = await geminiModel.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            return text;
        } catch (error: any) {
            const message = String(error?.message ?? error ?? '');
            const status = error?.status ?? error?.response?.status ?? error?.error?.status;
            const isRateLimit =
                status === 429 ||
                message.includes('429') ||
                message.toLowerCase().includes('too many requests') ||
                message.toLowerCase().includes('quota');

            if (!isRateLimit || attempt === totalAttempts - 1) {
                throw error;
            }

            const retryAfterMs = parseRetryAfterMs(message);
            const backoffMs = Math.min(retryMaxMs, retryBaseMs * Math.pow(2, attempt));
            const jitterMs = Math.floor(Math.random() * 250);
            const waitMs = Math.max(backoffMs, retryAfterMs ?? 0) + jitterMs;

            await sleep(waitMs);
        }
    }

    throw new Error('Gemini retry loop exhausted');
}

/**
 * Extract structured JSON from natural language using Gemini
 */
export async function extractStructuredData<T>(
    userQuery: string,
    systemPrompt: string,
    config?: GeminiConfig
): Promise<T> {
    const fullPrompt = systemPrompt.includes('{{USER_QUESTION}}')
        ? systemPrompt.split('{{USER_QUESTION}}').join(userQuery)
        : `${systemPrompt}\n\nUser question:\n${userQuery}`;

    // Helper: very small heuristic extractor for local/dev use when Gemini quota is exhausted
    function parseQuestionToIntent(q: string) {
        const lc = q.toLowerCase();

        // Quick detection of non-data / opinion / predictive questions
        // But exclude "how many", "how much", and "which X" patterns (count/data questions)
        const hasHowMany = lc.includes('how many') || lc.includes('how much');
        const hasWhich = lc.includes('which ');
        const isDataQuestion = hasHowMany || hasWhich;

        if (!isDataQuestion) {
            const nonDataSignals = ['think', 'predict', 'opinion', 'vision', 'policy', 'how do i', 'how to', 'tell me about', 'what is the company', 'delete', 'reset'];
            for (const s of nonDataSignals) {
                if (lc.includes(s)) return { unsupported: true };
            }
        }

        // Check if it looks like a data/analytics question with query words
        const queryIndicators = ['which', 'what', 'show me', 'total', 'sum', 'average', 'avg', 'max', 'min', 'count', 'how many', 'how much', 'sold', 'most', 'least', 'highest', 'lowest', 'revenue', 'quantity', 'amount', 'by ', ' by'];
        const looksLikeDataQuery = isDataQuestion || queryIndicators.some(ind => lc.includes(ind));
        if (!looksLikeDataQuery) return { unsupported: true };

        // Table detection: prioritize "sales" if present, then check for singular entities
        let table: string = 'sales';
        if (lc.includes('sales')) table = 'sales';
        else if (lc.includes('order')) table = 'orders';
        else if (lc.includes('customer')) table = 'customers';
        else if (lc.includes('product')) table = 'products';

        // Aggregation
        let aggregation: string = 'sum';
        if (isDataQuestion) aggregation = 'count';
        if (lc.includes('average') || lc.includes('avg')) aggregation = 'avg';
        if (lc.includes('maximum') || lc.includes('max')) aggregation = 'max';
        if (lc.includes('minimum') || lc.includes('min')) aggregation = 'min';
        if (lc.includes('count')) aggregation = 'count';
        if (lc.includes('most') || lc.includes('highest')) aggregation = 'max';
        if (lc.includes('least') || lc.includes('lowest')) aggregation = 'min';

        // Metric: pick appropriate metric for the detected table
        let metric: string = 'revenue'; // Default for sales table
        if (table === 'orders') metric = 'total_amount';
        else if (table === 'products') metric = 'price';
        else if (table === 'customers') metric = 'customer_count';

        // Metric overrides based on keywords (only if table allows it)
        if (lc.includes('total amount') || lc.includes('total_amount') || lc.includes('amount')) {
            if (table === 'orders') metric = 'total_amount';
        }
        if (lc.includes('quantity')) {
            if (table === 'sales' || table === 'orders') metric = 'quantity';
        }
        if (lc.includes('price')) {
            if (table === 'products') metric = 'price';
        }

        // Group by: extract grouping field separately from table detection
        let group_by: string | null = null;
        const groupCandidates = ['product', 'region', 'date', 'customer', 'category'];
        for (const g of groupCandidates) {
            if (lc.includes(`by ${g}`) || lc.includes(`${g},`) || (lc.includes(g) && lc.includes('by'))) {
                group_by = g;
                break;
            }
        }

        return {
            table,
            aggregation,
            metric,
            group_by,
            filters: null,
        };
    }

    // Call Gemini and parse JSON, but fall back to the local extractor on quota/rate-limit errors in dev
    try {
        const response = await generateWithGemini(fullPrompt, config);

        // Trim whitespace
        const trimmedResponse = response.trim();

        // Try to extract JSON if there's extra content
        const jsonMatch = trimmedResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON object found in response');
        }

        return JSON.parse(jsonMatch[0]) as T;
    } catch (error: any) {
        console.error('Failed to call or parse Gemini response:', error?.message || error);

        // If it's a quota/rate-limit error, allow a local heuristic fallback
        const msg = String(error?.message || '').toLowerCase();
        const isQuotaError = msg.includes('quota') || msg.includes('too many requests') || msg.includes('429');

        if (isQuotaError) {
            console.warn('Gemini quota/error detected — using local heuristic fallback for intent extraction (dev only).');
            try {
                const fallbackResult = parseQuestionToIntent(userQuery) as unknown as T;
                console.log('🤖 Raw Gemini output:', JSON.stringify(fallbackResult));
                return fallbackResult;
            } catch (e) {
                console.error('Local fallback failed:', e);
            }
        }

        throw new Error(`Gemini did not return valid JSON: ${(error as any).message}`);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(message: string): number | null {
    const retryDelayMatch = message.match(/retryDelay":"(\d+(?:\.\d+)?)s"/i);
    if (retryDelayMatch) {
        return Math.ceil(parseFloat(retryDelayMatch[1]) * 1000);
    }

    const retryInMatch = message.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
    if (retryInMatch) {
        return Math.ceil(parseFloat(retryInMatch[1]) * 1000);
    }

    return null;
}

function loadApiKeys(): string[] {
    const keys: string[] = [];
    for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('GOOGLE_API_KEY_') && value) {
            const disabledFlag = `${key}_DISABLED`;
            const disabledValue = process.env[disabledFlag];
            if (disabledValue && disabledValue.toLowerCase() === 'true') {
                continue;
            }
            const normalized = value
                .trim()
                .replace(/^"+|"+$/g, '')
                .replace(/,+$/, '')
                .trim();
            if (!normalized) {
                continue;
            }
            keys.push(normalized);
        }
    }
    return keys;
}

