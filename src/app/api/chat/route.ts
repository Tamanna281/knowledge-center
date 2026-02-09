import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateLLMResponse } from "@/lib/llmFallback";
import {
    INSIGHT_SYSTEM_PROMPT,
    InsightResponse,
    validateInsight,
    createFallbackInsight,
} from "@/lib/insight-prompt";

// Simple in-memory cache to reduce API calls (max 100 entries)
const responseCache = new Map<string, InsightResponse>();
const MAX_CACHE_SIZE = 100;

const FALLBACK_MESSAGE =
    "I'm sorry, I don't have any information about that in your knowledge base. Please try a more specific question or mention a particular field, category, or metric.";

const STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "but",
    "by",
    "can",
    "could",
    "did",
    "do",
    "does",
    "for",
    "from",
    "had",
    "has",
    "have",
    "he",
    "her",
    "his",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "she",
    "should",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "to",
    "us",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "will",
    "with",
    "would",
    "you",
    "your",
]);

const GREETING_WORDS = new Set([
    "hi",
    "hello",
    "hey",
    "thanks",
    "thank",
    "bye",
    "good",
    "morning",
    "afternoon",
    "evening",
]);

const INTENT_WORDS = new Set([
    "total",
    "sum",
    "average",
    "avg",
    "mean",
    "highest",
    "max",
    "maximum",
    "lowest",
    "min",
    "minimum",
    "count",
    "number",
    "top",
    "most",
    "least",
    "largest",
    "smallest",
]);

const GROUP_HINTS = new Set([
    "region",
    "state",
    "city",
    "country",
    "department",
    "category",
    "type",
    "branch",
    "team",
    "employee",
    "product",
    "item",
    "campaign",
]);

const MIN_KEYWORD_LENGTH = 3;
const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) || [];

const isGreeting = (question: string) => {
    const tokens = tokenize(question).filter((token) => token.length >= 2);
    if (tokens.length === 0) return false;
    if (tokens.length <= 3 && tokens.some((token) => GREETING_WORDS.has(token))) {
        return true;
    }
    return tokens.every((token) => GREETING_WORDS.has(token));
};

const detectIntent = (tokens: string[]) => {
    if (tokens.some((token) => ["total", "sum"].includes(token))) return "sum";
    if (tokens.some((token) => ["average", "avg", "mean"].includes(token)))
        return "avg";
    if (tokens.some((token) => ["highest", "max", "maximum", "top", "most", "largest"].includes(token)))
        return "max";
    if (tokens.some((token) => ["lowest", "min", "minimum", "least", "smallest"].includes(token)))
        return "min";
    if (tokens.some((token) => ["count", "number"].includes(token))) return "count";
    return "lookup";
};

const isValidKeyword = (token: string) =>
    token.length >= MIN_KEYWORD_LENGTH || /\d/.test(token);

const extractKeywords = (question: string) => {
    const tokens = tokenize(question);
    const filtered = tokens.filter(
        (token) =>
            isValidKeyword(token) && !STOPWORDS.has(token) && !INTENT_WORDS.has(token)
    );
    if (filtered.length > 0) return filtered;
    const fallback = tokens.filter(
        (token) => isValidKeyword(token) && !STOPWORDS.has(token)
    );
    if (fallback.length > 0) return fallback;
    const trimmed = question.trim();
    return trimmed ? [trimmed.toLowerCase()] : [];
};

const normalizeKey = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const toNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const cleaned = value.replace(/[%,$]/g, "").replace(/\s+/g, "");
        const parsed = Number.parseFloat(cleaned);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
};

const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

const summarizeRow = (row: {
    title: string;
    content: string;
    category: string | null;
}) => {
    try {
        const parsed = JSON.parse(row.content);
        if (parsed && typeof parsed === "object") {
            const entries = Object.entries(parsed).slice(0, 4);
            const pairs = entries.map(([key, value]) => `${key}: ${formatValue(value)}`);
            const prefix = row.title ? `From "${row.title}": ` : "";
            return `${prefix}${pairs.join(", ")}.`;
        }
    } catch {
        // Fall through to plain text summary.
    }

    const normalized = row.content.replace(/\s+/g, " ").trim();
    const snippet =
        normalized.length > 160 ? `${normalized.slice(0, 160)}...` : normalized;
    const prefix = row.title ? `From "${row.title}": ` : "";
    return `${prefix}${snippet}`;
};

const parseContent = (content: string) => {
    try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        // Ignore parse errors.
    }
    return null;
};

const scoreRow = (
    row: { title: string; content: string; category: string | null; tags: string; fileName: string | null },
    keywords: string[],
    parsed: Record<string, unknown> | null
) => {
    const fields = [
        { text: row.title, weight: 4 },
        { text: row.fileName ?? "", weight: 3 },
        { text: row.category ?? "", weight: 2 },
        { text: row.tags ?? "", weight: 2 },
        { text: row.content, weight: 1 },
    ];

    let score = 0;

    for (const keyword of keywords) {
        let best = 0;
        for (const field of fields) {
            if (field.text && field.text.toLowerCase().includes(keyword)) {
                best = Math.max(best, field.weight);
            }
        }
        if (parsed) {
            for (const key of Object.keys(parsed)) {
                if (normalizeKey(key).includes(keyword)) {
                    best = Math.max(best, 2);
                }
            }
        }
        score += best;
    }

    return score;
};

const scoreFieldTokens = (fieldTokens: string[], questionTokens: string[]) => {
    let score = 0;
    for (const token of questionTokens) {
        if (fieldTokens.includes(token)) {
            score += 2;
        } else if (fieldTokens.some((fieldToken) => fieldToken.startsWith(token) || token.startsWith(fieldToken))) {
            score += 1;
        }
    }
    return score;
};

const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

/**
 * Generate structured insight from retrieved context using Gemini LLM
 * Includes a "Local Intelligence" fallback for when API quota is exceeded (429)
 */
async function generateInsightFromContext(
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

        // Use multi-provider LLM fallback system (Gemini → Groq → Ollama)
        const result = await generateLLMResponse(fullPrompt);
        const response = result.text;
        
        console.log(`[Chat Route] Generated response using: ${result.provider} (${result.model})`);

        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
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

        // --- LOCAL INTELLIGENCE FALLBACK (when all LLM providers fail) ---
        // At this point, Gemini → Groq → Ollama have all failed
        console.warn("⚠️ All LLM providers failed. Entering 'Local Intelligence Mode'...");

        const { extractNumericDataFromContext, suggestChartType } = await import('@/lib/chart-debug');
        const numericData = extractNumericDataFromContext(retrievedContext);
        const chartType = suggestChartType(question, numericData.length);

        return {
            type: "insight",
            keyInsight: `[Local Intelligence Mode] Based on your documents, I found ${recordCount} relevant records. Note: AI interpretation is currently limited as all LLM providers are unavailable.`,
            sections: [
                {
                    title: "Extracted Data points",
                    items: retrievedContext.split('\n').filter(l => l.includes(':')).slice(0, 5)
                },
                {
                    title: "System Status",
                    items: ["All LLM Providers Unavailable: Using local heuristic extraction.", "Charts generated from raw value mapping."]
                }
            ],
            analyticalSummary: "This analysis was generated locally using statistical extraction because all LLM providers are unavailable.",
            dataPoints: {
                totalRecords: recordCount,
                relevanceScore: "medium"
            },
            chart: numericData.length >= 2 ? {
                type: chartType || 'bar',
                title: `Extracted Data: ${question}`,
                data: numericData,
                description: "Diagram generated via local heuristic extraction."
            } : undefined
        };

        return createFallbackInsight(retrievedContext);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const question =
            typeof body?.question === "string" ? body.question.trim() : "";

        if (!question) {
            return NextResponse.json(
                { error: "Question is required." },
                { status: 400 }
            );
        }

        // Handle greetings
        if (isGreeting(question)) {
            return NextResponse.json({
                type: "insight",
                answer:
                    "## Welcome to Knowledge Analysis\n\nHi! I'm your intelligent data analyst. I'm here to help you extract insights from your uploaded knowledge base.\n\n### How to Get Started\n- **Ask about specific fields**: \"What is the revenue?\" or \"Show me sales data\"\n- **Request calculations**: \"Calculate the average price\" or \"What's the total?\"\n- **Find extremes**: \"Which product has the highest sales?\" or \"Show me the lowest value\"\n- **Get comparisons**: \"Compare sales by region\" or \"Group data by category\"\n\n### Tips\nBe specific with your queries and mention field names from your data. The more details you provide, the better insights I can generate!",
            });
        }

        // Extract keywords
        const tokens = tokenize(question);
        const keywords = extractKeywords(question);

        if (keywords.length === 0) {
            return NextResponse.json({
                type: "error",
                answer:
                    "## Unable to Process Query\n\nI couldn't find any meaningful keywords in your question. Please try rephrasing it with more specific details.\n\n### Suggestions:\n- Mention a specific field name (e.g., \"revenue\", \"price\", \"date\")\n- Use metric keywords like \"total\", \"average\", \"highest\", \"lowest\"\n- Include category names from your data\n- Ask about a specific product, region, or item\n\nExample: Instead of 'tell me about the database', try 'what is the average product price?'",
            });
        }

        // Search knowledge base with keyword filters
        const keywordFilters = keywords.map((keyword) => ({
            OR: [
                { content: { contains: keyword, mode: "insensitive" as const } },
                { title: { contains: keyword, mode: "insensitive" as const } },
                { tags: { contains: keyword, mode: "insensitive" as const } },
                { category: { contains: keyword, mode: "insensitive" as const } },
                { fileName: { contains: keyword, mode: "insensitive" as const } },
            ],
        }));

        const take = 10; // Limit to top relevant results
        let results = await prisma.knowledgeBase.findMany({
            where: { AND: keywordFilters },
            take,
        });

        // Fallback to OR search if AND returns nothing
        if (results.length === 0) {
            results = await prisma.knowledgeBase.findMany({
                where: { OR: keywordFilters },
                take,
            });
        }

        // No results found
        if (results.length === 0) {
            return NextResponse.json({
                type: "error",
                answer: FALLBACK_MESSAGE,
            });
        }

        // Score and rank results
        const ranked = results
            .map((row) => {
                const parsed = parseContent(row.content);
                const score = scoreRow(row, keywords, parsed);
                return { row, score };
            })
            .sort((a, b) => b.score - a.score);

        // Use top-ranked results
        const topResults = ranked.slice(0, 5).map((item) => item.row);

        // Compile context from retrieved documents with structured data
        const retrievedContext = topResults
            .map((row, idx) => {
                const title = row.title || row.fileName || "Document";
                const content = row.content.substring(0, 1500); // Increased limit

                // Try to parse and include structured data
                const parsed = parseContent(row.content);
                let structuredData = '';
                if (parsed) {
                    // Extract numeric fields for potential chart generation
                    const numericFields = Object.entries(parsed)
                        .filter(([_, value]) => typeof value === 'number' || !isNaN(Number(value)))
                        .slice(0, 10);

                    if (numericFields.length > 0) {
                        structuredData = `\nStructured Data (for charts):\n${numericFields.map(([key, value]) => `  - ${key}: ${value}`).join('\n')}`;
                    }
                }

                return `[Document ${idx + 1}] ${title}\n${content}${structuredData}`;
            })
            .join("\n\n---\n\n");

        // Check cache first
        const cacheKey = question.toLowerCase();
        if (responseCache.has(cacheKey)) {
            console.log(`✓ Cache hit for question: "${question}"`);
            return NextResponse.json(responseCache.get(cacheKey));
        }

        // Generate insight using Gemini
        const insight = await generateInsightFromContext(
            question,
            retrievedContext,
            topResults.length
        );

        // Store in cache (keep it under MAX_CACHE_SIZE)
        if (responseCache.size >= MAX_CACHE_SIZE) {
            const firstKey = responseCache.keys().next().value;
            responseCache.delete(firstKey);
        }
        responseCache.set(cacheKey, insight);

        return NextResponse.json(insight);
    } catch (error) {
        console.error("Chat query error:", error);
        return NextResponse.json(
            { error: "Failed to process chat request." },
            { status: 500 }
        );
    }
}
