import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FALLBACK_MESSAGE =
    "I'm sorry, I don't have any information about that, Please ask another question.";

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

const tokenize = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

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

        if (isGreeting(question)) {
            return NextResponse.json({
                answer:
                    "Hi! Ask me about a specific file, field, or value from your uploaded data, and I'll help you find it.",
            });
        }

        const tokens = tokenize(question);
        const intent = detectIntent(tokens);
        const keywords = extractKeywords(question);

        if (keywords.length === 0) {
            return NextResponse.json({
                answer:
                    "I could not find any keywords in your question. Try mentioning a specific field like budget, region, or sales.",
            });
        }

        const keywordFilters = keywords.map((keyword) => ({
            OR: [
                { content: { contains: keyword, mode: "insensitive" } },
                { title: { contains: keyword, mode: "insensitive" } },
                { tags: { contains: keyword, mode: "insensitive" } },
                { category: { contains: keyword, mode: "insensitive" } },
                { fileName: { contains: keyword, mode: "insensitive" } },
            ],
        }));

        const take = 200;

        let results = await prisma.knowledgeBase.findMany({
            where: { AND: keywordFilters },
            take,
        });

        if (results.length === 0) {
            results = await prisma.knowledgeBase.findMany({
                where: { OR: keywordFilters },
                take,
            });
        }

        if (results.length === 0) {
            return NextResponse.json({ answer: FALLBACK_MESSAGE });
        }

        const ranked = results
            .map((row) => {
                const parsed = parseContent(row.content);
                const score = scoreRow(row, keywords, parsed);
                return { row, score, parsed };
            })
            .sort((a, b) => b.score - a.score);

        const minScore = Math.min(2, keywords.length);
        const scoped = ranked.filter((item) => item.score >= minScore);

        const candidates = scoped.length > 0 ? scoped : ranked;
        const topRows = candidates.slice(0, 3).map((item) => item.row);

        if (topRows.length === 0) {
            return NextResponse.json({ answer: FALLBACK_MESSAGE });
        }

        const questionTokens = tokens.filter((token) => !STOPWORDS.has(token));
        const fieldStats = new Map<
            string,
            {
                key: string;
                normalized: string;
                tokens: string[];
                numericCount: number;
                stringCount: number;
            }
        >();

        for (const item of candidates) {
            if (!item.parsed) continue;
            for (const [key, value] of Object.entries(item.parsed)) {
                const normalized = normalizeKey(key);
                const tokensForKey = normalized ? normalized.split(/\s+/) : [];
                const existing =
                    fieldStats.get(key) ||
                    {
                        key,
                        normalized,
                        tokens: tokensForKey,
                        numericCount: 0,
                        stringCount: 0,
                    };

                const numericValue = toNumber(value);
                if (numericValue !== null) {
                    existing.numericCount += 1;
                } else if (value !== null && value !== undefined) {
                    existing.stringCount += 1;
                }

                fieldStats.set(key, existing);
            }
        }

        const fields = Array.from(fieldStats.values()).map((field) => ({
            ...field,
            matchScore: scoreFieldTokens(field.tokens, questionTokens),
        }));

        const numericField = fields
            .filter((field) => field.numericCount > 0)
            .sort((a, b) => b.matchScore - a.matchScore || b.numericCount - a.numericCount)[0];

        const groupToken = questionTokens.find((token) => GROUP_HINTS.has(token));
        const groupField = groupToken
            ? fields.find(
                  (field) =>
                      field.tokens.includes(groupToken) && field.stringCount >= field.numericCount
              )
            : undefined;

        const rowsWithNumbers = numericField
            ? candidates.reduce((acc, item) => {
                  const value = item.parsed ? toNumber(item.parsed[numericField.key]) : null;
                  if (value !== null) {
                      acc.push({ value, item });
                  }
                  return acc;
              }, [] as { value: number; item: any }[])
            : [];

        if (intent !== "lookup") {
            if (intent === "count") {
                const count = candidates.length;
                return NextResponse.json({
                    answer: `I found ${count} matching record${count === 1 ? "" : "s"}.`,
                });
            }

            if (numericField && rowsWithNumbers.length > 0) {
                if (intent === "sum" || intent === "avg") {
                    const total = rowsWithNumbers.reduce((acc, entry) => acc + entry.value, 0);
                    const value =
                        intent === "avg" ? total / rowsWithNumbers.length : total;
                    return NextResponse.json({
                        answer: `The ${intent === "avg" ? "average" : "total"} ${
                            numericField.key
                        } is ${formatNumber(value)} based on ${rowsWithNumbers.length} matching record${
                            rowsWithNumbers.length === 1 ? "" : "s"
                        }.`,
                    });
                }

                if (intent === "max" || intent === "min") {
                    if (groupField) {
                        const groupTotals = new Map<string, { total: number; count: number }>();
                        for (const entry of rowsWithNumbers) {
                            const rawGroup =
                                entry.item.parsed?.[groupField.key] ?? "Unknown";
                            const groupLabel = String(rawGroup || "Unknown");
                            const existing = groupTotals.get(groupLabel) || {
                                total: 0,
                                count: 0,
                            };
                            existing.total += entry.value;
                            existing.count += 1;
                            groupTotals.set(groupLabel, existing);
                        }
                        const sortedGroups = Array.from(groupTotals.entries()).sort(
                            (a, b) =>
                                intent === "max"
                                    ? b[1].total - a[1].total
                                    : a[1].total - b[1].total
                        );
                        const topGroup = sortedGroups[0];
                        if (topGroup) {
                            return NextResponse.json({
                                answer: `${topGroup[0]} has the ${
                                    intent === "max" ? "highest" : "lowest"
                                } ${numericField.key} (total ${formatNumber(
                                    topGroup[1].total
                                )} across ${topGroup[1].count} record${
                                    topGroup[1].count === 1 ? "" : "s"
                                }).`,
                            });
                        }
                    }

                    const sortedRows = rowsWithNumbers.sort(
                        (a, b) => (intent === "max" ? b.value - a.value : a.value - b.value)
                    );
                    const best = sortedRows[0];
                    if (best) {
                        return NextResponse.json({
                            answer: `The ${
                                intent === "max" ? "highest" : "lowest"
                            } ${numericField.key} I found is ${formatNumber(
                                best.value
                            )}. ${summarizeRow(best.item.row)}`,
                        });
                    }
                }
            }
        }

        const summaries = topRows.map(summarizeRow);
        const answer = `Here's what I found: ${summaries.join(" ")}`;

        return NextResponse.json({ answer });
    } catch (error) {
        console.error("Chat query error:", error);
        return NextResponse.json(
            { error: "Failed to process chat request." },
            { status: 500 }
        );
    }
}
