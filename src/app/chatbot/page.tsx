"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { chatApi } from "@/lib/api";

type Message = {
    id: string;
    role: "user" | "bot";
    content: string;
};

const GREETING_MESSAGE =
    "Hi! Ask me anything about your uploaded knowledge base, and I'll do my best to help.";

const createId = () =>
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function ChatbotPage() {
    const [messages, setMessages] = useState<Message[]>([
        { id: "greeting", role: "bot", content: GREETING_MESSAGE },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const sendMessage = async () => {
        const question = input.trim();
        if (!question || isLoading) return;

        const userMessage: Message = {
            id: createId(),
            role: "user",
            content: question,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const data = await chatApi.sendMessage(question);

            const botMessage: Message = {
                id: createId(),
                role: "bot",
                content:
                    typeof data?.answer === "string"
                        ? data.answer
                        : "I couldn't generate a response for that.",
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error: any) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                {
                    id: createId(),
                    role: "bot",
                    content: error.response?.data?.error || "Sorry, something went wrong. Please try again.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-6 py-12">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <header className="text-center">
                    <h1 className="mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-5xl font-bold text-transparent">
                        Knowledge Chatbot
                    </h1>
                    <p className="text-lg text-slate-300">
                        Ask questions about your imported data and get instant answers.
                    </p>
                </header>

                <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                    <div className="flex h-[60vh] flex-col gap-4 overflow-y-auto pr-2">
                        {messages.map((message) => {
                            const isUser = message.role === "user";
                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl border px-4 py-3 shadow-lg ${isUser
                                                ? "border-purple-400/30 bg-purple-500/20 text-white"
                                                : "border-white/10 bg-white/10 text-slate-100"
                                            }`}
                                    >
                                        <div
                                            className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""
                                                }`}
                                        >
                                            <span
                                                className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${isUser
                                                        ? "bg-purple-500/30 text-purple-200"
                                                        : "bg-emerald-500/20 text-emerald-200"
                                                    }`}
                                            >
                                                {isUser ? (
                                                    <User className="h-4 w-4" />
                                                ) : (
                                                    <Bot className="h-4 w-4" />
                                                )}
                                            </span>
                                            <p className="text-sm leading-relaxed">
                                                {message.content}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-slate-100 shadow-lg">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
                                            <Bot className="h-4 w-4" />
                                        </span>
                                        <p className="text-sm leading-relaxed text-slate-200">
                                            Thinking...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={endRef} />
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            sendMessage();
                        }}
                        className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Ask about your data..."
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                            {isLoading ? "Sending..." : "Send"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
