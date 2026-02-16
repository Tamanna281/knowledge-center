import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Retrieve chat history for a conversation
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const conversationId = searchParams.get("conversationId");

        if (!conversationId) {
            return NextResponse.json(
                { error: "conversationId is required" },
                { status: 400 }
            );
        }

        const conversation = await prisma.chatConversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!conversation) {
            return NextResponse.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        // Parse insight data for each message
        const messages = conversation.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            insight: msg.insightData ? JSON.parse(msg.insightData) : undefined,
            createdAt: msg.createdAt,
        }));

        return NextResponse.json({
            conversationId: conversation.id,
            messages,
        });
    } catch (error) {
        console.error("Error fetching chat history:", error);
        return NextResponse.json(
            { error: "Failed to fetch chat history" },
            { status: 500 }
        );
    }
}

// POST: Save chat messages to a conversation
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { conversationId, messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: "messages array is required" },
                { status: 400 }
            );
        }

        let finalConversationId = conversationId;

        // Create new conversation if not provided
        if (!finalConversationId) {
            const newConversation = await prisma.chatConversation.create({
                data: {
                    title: "Chat Session",
                },
            });
            finalConversationId = newConversation.id;
        }

        // Save all messages using createMany for efficiency and to reduce connection pressure
        await prisma.chatMessage.createMany({
            data: messages.map((msg: any) => ({
                conversationId: finalConversationId,
                role: msg.role,
                content: msg.content,
                insightData: msg.insight
                    ? JSON.stringify(msg.insight)
                    : null,
            })),
        });

        return NextResponse.json({
            conversationId: finalConversationId,
            savedCount: messages.length,
        });
    } catch (error) {
        console.error("Error saving chat history:", error);
        return NextResponse.json(
            { error: "Failed to save chat history" },
            { status: 500 }
        );
    }
}

// DELETE: Clear a conversation
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const conversationId = searchParams.get("conversationId");

        if (!conversationId) {
            return NextResponse.json(
                { error: "conversationId is required" },
                { status: 400 }
            );
        }

        await prisma.chatConversation.delete({
            where: { id: conversationId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting conversation:", error);
        return NextResponse.json(
            { error: "Failed to delete conversation" },
            { status: 500 }
        );
    }
}
