import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateLLMResponse } from "@/lib/llmFallback";
import { analyticsRouter, RouterResponse } from "@/lib/analyticsRouter";
import {
    INSIGHT_SYSTEM_PROMPT,
    InsightResponse,
    validateInsight,
    createFallbackInsight,
} from "@/lib/insight-prompt";


// Note: In-memory cache removed for development to ensure fresh responses.
// Can be re-implemented with Redis for production scalability if needed.


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
        { text: row.title, weight: 10 }, // Significantly boosted title weight (from 4 to 10)
        { text: row.fileName ?? "", weight: 3 },
        { text: row.category ?? "", weight: 2 },
        { text: row.tags ?? "", weight: 2 },
        { text: row.content, weight: 1 },
    ];

    let score = 0;
    let uniqueMatches = 0;

    for (const keyword of keywords) {
        let keywordMatched = false;
        let best = 0;
        for (const field of fields) {
            if (field.text && field.text.toLowerCase().includes(keyword)) {
                best = Math.max(best, field.weight);
                keywordMatched = true;
            }
        }
        if (parsed) {
            for (const key of Object.keys(parsed)) {
                if (normalizeKey(key).includes(keyword)) {
                    best = Math.max(best, 2);
                    keywordMatched = true;
                }
            }
        }

        if (keywordMatched) uniqueMatches++;
        score += best;
    }

    // MULTI-KEYWORD BOOST: Heavily favor items that match multiple distinct keywords
    // This is the "Secret Sauce" for finding ACME Tech Solutions (matching 3 keywords)
    // over generic machines matching just one keyword ("solutions").
    if (uniqueMatches > 1) {
        score += (uniqueMatches * 15); // Huge boost for each additional keyword
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
 * Generate structured insight from retrieved context using the Analytics Router
 * Transforms the response to match frontend expectations
 */
async function generateInsightFromContext(
    question: string,
    retrievedContext: string,
    recordCount: number
) {
    const routerResponse = await analyticsRouter(question, retrievedContext, recordCount);

    // Transform RouterResponse to frontend-compatible format
    if (routerResponse.type === 'text') {
        // For text responses, return a simple answer
        return {
            type: 'text',
            answer: routerResponse.data.text || "I couldn't generate a response for that."
        };
    }

    // For analytics/chart responses, return the insight data with type="insight"
    // The frontend checks for data?.type === "insight"
    return {
        ...routerResponse.data,
        type: 'insight',  // Frontend expects this
        answer: routerResponse.data.keyInsight || "Analysis complete."
    };
}

// Helper to format machine product into text context
const formatMachineProduct = (product: any) => {
    const coreSpecs = [
        `Model: ${product.modelNumber}`,
        `Speed: ${product.machineSpeed ? product.machineSpeed + ' ' + (product.speedUnit || '') : 'N/A'}`,
        `Power: ${product.powerKw ? product.powerKw + ' kW' : 'N/A'}`,
        `Price (Domestic Avg): ${product.domesticPriceAvg ? '₹' + product.domesticPriceAvg : 'N/A'}`,
        `Dimensions: ${product.dimensionsP1 || 'N/A'}`,
        `Category: ${product.productCategory || 'N/A'}`
    ].join('\n');

    let metadataStr = '';
    if (product.metadata && typeof product.metadata === 'object') {
        // limit metadata to avoid token overflow
        metadataStr = JSON.stringify(product.metadata).slice(0, 500);
    }

    return `PRODUCT DATA:\n${coreSpecs}\n\nAdditional Details:\n${metadataStr}`;
};

async function searchKnowledgeBase(keywordFilters: any[]) {
    // Search KnowledgeBase
    const take = 100; // Increased significantly to ensure buried matches are found
    const results = await prisma.knowledgeBase.findMany({
        where: { OR: keywordFilters },
        orderBy: { id: 'desc' }, // Favor newer records
        take,
    });

    return results.map(row => ({
        type: 'document',
        id: row.id.toString(),
        title: row.title,
        content: row.content,
        category: row.category,
        tags: row.tags,
        fileName: row.fileName,
        original: row
    }));
}

async function searchMachineProducts(keywords: string[]) {
    // Search MachineProduct
    // We construct a specific filter for machine products
    const take = 15; // Increased to ensure we catch relevant machines even with common keywords

    // Create text search filters
    const filters = keywords.map(keyword => ({
        OR: [
            { productName: { contains: keyword, mode: "insensitive" as const } },
            { modelNumber: { contains: keyword, mode: "insensitive" as const } },
            { productCategory: { contains: keyword, mode: "insensitive" as const } },
            { searchText: { contains: keyword, mode: "insensitive" as const } }
        ]
    }));

    const results = await prisma.machineProduct.findMany({
        where: { OR: filters },
        take,
    });

    return results.map(product => ({
        type: 'machine',
        id: product.id,
        title: product.productName,
        content: formatMachineProduct(product),
        category: product.productCategory,
        tags: product.tags.join(', '),
        fileName: product.sourceFile,
        original: product
    }));
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
                    "## Welcome to NESSCO Intelligence\n\nHi! I can help you with machine specifications, pricing, and comparisons from your product catalog.\n\n### Try asking:\n- **Specs**: \"What is the speed of NS-200?\"\n- **Pricing**: \"Show me the price of paper cup machines\"\n- **Knowledge Base**: \"When was ACME Tech founded?\" or \"Show me the policy on X\"\n- **Technical**: \"Which machines have power < 5kW?\"\n\nI have access to both your Product Catalog and your Knowledge Base documents!",
            });
        }

        // Extract keywords
        const keywords = extractKeywords(question);

        if (keywords.length === 0) {
            return NextResponse.json({
                type: "error",
                answer:
                    "I couldn't identify specific keywords to search for. Please try mentioning a Model Number (e.g., NS-220), a Product Name, or specific features like 'speed' or 'power'.",
            });
        }

        // --- PARALLEL SEARCH STRATEGY ---

        // 1. Prepare filters for KnowledgeBase
        const kbFilters = keywords.map((keyword) => ({
            OR: [
                { content: { contains: keyword, mode: "insensitive" as const } },
                { title: { contains: keyword, mode: "insensitive" as const } },
                { tags: { contains: keyword, mode: "insensitive" as const } },
                { category: { contains: keyword, mode: "insensitive" as const } },
                { fileName: { contains: keyword, mode: "insensitive" as const } },
            ],
        }));

        // 2. Execute both searches simultaneously
        const [kbResults, mpResults] = await Promise.all([
            searchKnowledgeBase(kbFilters),
            searchMachineProducts(keywords)
        ]);

        // 3. Combine results
        const allResults = [...mpResults, ...kbResults];

        if (allResults.length === 0) {
            return NextResponse.json({
                type: "error",
                answer: FALLBACK_MESSAGE,
            });
        }

        // 4. Score and Rank merged results
        const ranked = allResults
            .map((item) => {
                const parsed = parseContent(item.content); // For documents
                const score = scoreRow(item, keywords, parsed);

                // Boost score for exact model number matches in machine products
                let finalScore = score;
                if (item.type === 'machine') {
                    const original = item.original as any;
                    // Strong boost if model number is in keywords
                    if (keywords.some(k => original.modelNumber?.toLowerCase() === k)) {
                        finalScore += 5;
                    }
                    // Boost if product name matches
                    if (keywords.some(k => original.productName?.toLowerCase().includes(k))) {
                        finalScore += 3;
                    }
                }

                return { item, score: finalScore };
            })
            .sort((a, b) => b.score - a.score);

        // 5. Select top results
        const topResults = ranked.slice(0, 6).map((r) => r.item);

        // 6. Build Context
        const retrievedContext = topResults
            .map((item, idx) => {
                const title = item.title || "Unknown Source";

                let contentStr = item.content;

                // For legacy docs, truncate
                if (item.type === 'document' && contentStr.length > 1500) {
                    contentStr = contentStr.substring(0, 1500) + "...";
                }

                return `[Result ${idx + 1}] (${item.type.toUpperCase()}) ${title}\nSource: ${item.fileName}\n${contentStr}`;
            })
            .join("\n\n---\n\n");

        console.log(`Generated context with ${topResults.length} items (KB: ${kbResults.length}, MP: ${mpResults.length})`);


        // Generate insight using Analytics Router
        const responseData = await generateInsightFromContext(
            question,
            retrievedContext,
            topResults.length
        );

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("Chat query error:", error);
        return NextResponse.json(
            { error: "Failed to process chat request." },
            { status: 500 }
        );
    }
}
