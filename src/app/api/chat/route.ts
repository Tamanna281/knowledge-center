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

const extractKeywords = (question: string) => {
    const tokens = question.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    const filtered = tokens.filter((token) => !STOPWORDS.has(token));
    if (filtered.length > 0) return filtered;
    const trimmed = question.trim();
    return trimmed ? [trimmed.toLowerCase()] : [];
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

        const keywords = extractKeywords(question);

        if (keywords.length === 0) {
            return NextResponse.json({ answer: FALLBACK_MESSAGE });
        }

        const results = await prisma.knowledgeBase.findMany({
            where: {
                OR: keywords.map((keyword) => ({
                    content: { contains: keyword, mode: "insensitive" },
                })),
            },
            take: 20,
        });

        if (results.length === 0) {
            return NextResponse.json({ answer: FALLBACK_MESSAGE });
        }

        const loweredKeywords = keywords.map((keyword) => keyword.toLowerCase());
        const ranked = results
            .map((row) => {
                const content = row.content.toLowerCase();
                let score = 0;
                for (const keyword of loweredKeywords) {
                    if (content.includes(keyword)) {
                        score += 1;
                    }
                }
                return { row, score };
            })
            .sort((a, b) => b.score - a.score);

        const topRows = ranked
            .filter((item) => item.score > 0)
            .slice(0, 3)
            .map((item) => item.row);

        if (topRows.length === 0) {
            return NextResponse.json({ answer: FALLBACK_MESSAGE });
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
