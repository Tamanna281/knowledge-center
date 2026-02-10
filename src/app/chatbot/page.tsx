"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, User, Download, Loader2 } from "lucide-react";
import { chatApi } from "@/lib/api";
import ChartRenderer, { ChartConfig } from "@/components/ChartRenderer";

type Message = {
    id: string;
    role: "user" | "bot";
    content: string;
    insight?: {
        type: "insight" | "error";
        keyInsight: string;
        sections: Array<{
            title: string;
            items: string[];
        }>;
        analyticalSummary: string;
        dataPoints: {
            totalRecords: number;
            relevanceScore: "high" | "medium" | "low";
        };
        chart?: ChartConfig;
    };
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
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const endRef = useRef<HTMLDivElement | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const formatResponse = (text: string) => {
        return text
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line) => {
                if (line.startsWith("###")) {
                    return { type: "heading3", content: line.replace("###", "").trim() };
                }
                if (line.startsWith("##")) {
                    return { type: "heading2", content: line.replace("##", "").trim() };
                }
                if (line.startsWith("#")) {
                    return { type: "heading1", content: line.replace("#", "").trim() };
                }
                if (line.startsWith("- ")) {
                    return { type: "bullet", content: line.replace("- ", "").trim() };
                }
                if (line.match(/^\d+\.\s/)) {
                    return { type: "list", content: line.trim() };
                }
                return { type: "paragraph", content: line };
            });
    };

    const downloadReport = async () => {
        const element = document.getElementById("chat-container");
        if (!element) {
            alert("Could not find chat content to download.");
            return;
        }

        setIsGeneratingPdf(true);

        try {
            const { default: html2canvas } = await import("html2canvas");
            const { jsPDF } = await import("jspdf");

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: "#f8fafc",
                logging: false,
                allowTaint: true,
                useCORS: true,
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let yPosition = 10;

            pdf.setFontSize(16);
            pdf.text("Knowledge Analysis Report", pageWidth / 2, yPosition, { align: "center" });
            yPosition += 15;

            pdf.setFontSize(10);
            pdf.setTextColor(100);
            const timestamp = new Date().toLocaleString();
            pdf.text(`Generated: ${timestamp}`, pageWidth / 2, yPosition, { align: "center" });
            yPosition += 10;

            if (imgHeight > pageHeight - yPosition) {
                let heightRemaining = imgHeight;
                let sourceY = 0;

                while (heightRemaining > 0) {
                    const heightToPrint = Math.min(pageHeight - 20, heightRemaining);
                    const sourceHeight = (heightToPrint / imgWidth) * canvas.width;

                    const croppedCanvas = document.createElement("canvas");
                    croppedCanvas.width = canvas.width;
                    croppedCanvas.height = sourceHeight;

                    const ctx = croppedCanvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(canvas, 0, -sourceY, canvas.width, canvas.height);
                        const croppedImgData = croppedCanvas.toDataURL("image/png");
                        pdf.addImage(
                            croppedImgData,
                            "PNG",
                            10,
                            yPosition,
                            imgWidth,
                            heightToPrint
                        );
                    }

                    yPosition = 10;
                    sourceY += sourceHeight;
                    heightRemaining -= heightToPrint;

                    if (heightRemaining > 0) {
                        pdf.addPage();
                    }
                }
            } else {
                pdf.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);
            }

            pdf.save("knowledge-analysis-report.pdf");
        } catch (err) {
            console.error("PDF generation error:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

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
                content: data?.answer || "I couldn't generate a response for that.",
                insight: data?.type === "insight" ? data : undefined,
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
        <div className="min-h-screen h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col overflow-hidden">
            <div className="flex flex-col h-full w-full max-w-full">
                <header className="flex items-center justify-between px-4 sm:px-6 py-4 shrink-0">
                    <div className="flex-1">
                        <h1 className="mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-3xl sm:text-4xl md:text-5xl font-bold text-transparent">
                            Knowledge Chatbot
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg text-slate-300">
                            Ask questions about your imported data and get instant answers.
                        </p>
                    </div>
                    <button
                        onClick={downloadReport}
                        disabled={isGeneratingPdf || messages.length <= 1}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isGeneratingPdf ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="hidden sm:inline">Generating...</span>
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Save Report</span>
                            </>
                        )}
                    </button>
                </header>

                <div className="flex-1 flex flex-col rounded-t-2xl border border-white/10 bg-white/5 mx-2 sm:mx-4 md:mx-6 shadow-2xl backdrop-blur-xl overflow-hidden">
                    <div
                        id="chat-container"
                        ref={chatContainerRef}
                        className="flex-1 flex flex-col gap-4 overflow-y-auto p-3 sm:p-4 md:p-6 bg-white/5"
                        style={{ backgroundColor: '#0f172a' }}
                    >
                        {messages.map((message) => {
                            const isUser = message.role === "user";
                            const hasInsight = message.insight && message.insight.type === "insight";
                            const formattedParts = !isUser && !hasInsight ? formatResponse(message.content) : null;

                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`w-full sm:max-w-[85%] rounded-2xl border px-3 sm:px-4 py-3 shadow-lg break-words whitespace-pre-wrap ${isUser
                                            ? "border-purple-400/30"
                                            : "border-white/10"
                                            }`}
                                        style={{
                                            backgroundColor: isUser ? '#581c87' : '#1e293b',
                                            color: isUser ? '#ffffff' : '#f1f5f9'
                                        }}
                                    >
                                        <div
                                            className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""
                                                }`}
                                        >
                                            <span
                                                className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${isUser
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
                                            <div className="text-xs sm:text-sm leading-relaxed flex-1">
                                                {isUser ? (
                                                    <p>{message.content}</p>
                                                ) : hasInsight && message.insight ? (
                                                    // Render structured insight response
                                                    <div className="space-y-4">
                                                        {/* Key Insight */}
                                                        <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-3">
                                                            <p className="font-semibold text-emerald-300 mb-1">
                                                                Key Insight
                                                            </p>
                                                            <p className="text-slate-100">
                                                                {message.insight?.keyInsight}
                                                            </p>
                                                        </div>

                                                        {/* Sections */}
                                                        {message.insight?.sections &&
                                                            message.insight.sections.length > 0 && (
                                                                <div className="space-y-3">
                                                                    {message.insight.sections.map(
                                                                        (section, sIdx) => (
                                                                            <div key={sIdx}>
                                                                                <h3 className="font-semibold text-purple-300 mb-2">
                                                                                    {section.title}
                                                                                </h3>
                                                                                <ul className="space-y-1 ml-4">
                                                                                    {section.items.map(
                                                                                        (item, iIdx) => (
                                                                                            <li
                                                                                                key={iIdx}
                                                                                                className="flex gap-2 text-slate-200"
                                                                                            >
                                                                                                <span className="text-emerald-400 font-bold flex-shrink-0">
                                                                                                    •
                                                                                                </span>
                                                                                                <span>{item}</span>
                                                                                            </li>
                                                                                        )
                                                                                    )}
                                                                                </ul>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}

                                                        {/* Analytical Summary */}
                                                        {message.insight?.analyticalSummary && (
                                                            <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
                                                                <p className="text-sm text-slate-200">
                                                                    <span className="font-semibold text-blue-300">
                                                                        Summary:{" "}
                                                                    </span>
                                                                    {message.insight.analyticalSummary}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Data Points */}
                                                        <div className="text-xs text-slate-400 border-t border-white/10 pt-2">
                                                            <p>
                                                                Records: {message.insight.dataPoints?.totalRecords} |
                                                                Relevance: {message.insight.dataPoints?.relevanceScore}
                                                            </p>
                                                        </div>

                                                        {/* Chart Rendering */}
                                                        {message.insight?.chart && (
                                                            <div className="mt-4">
                                                                <ChartRenderer config={message.insight.chart} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    // Render markdown formatted response
                                                    <div className="space-y-2">
                                                        {formattedParts?.map((part, idx) => {
                                                            switch (part.type) {
                                                                case "heading1":
                                                                    return (
                                                                        <h1 key={idx} className="text-lg sm:text-xl font-bold text-white mt-4 mb-2">
                                                                            {part.content}
                                                                        </h1>
                                                                    );
                                                                case "heading2":
                                                                    return (
                                                                        <h2 key={idx} className="text-base sm:text-lg font-bold text-emerald-300 mt-3 mb-2">
                                                                            {part.content}
                                                                        </h2>
                                                                    );
                                                                case "heading3":
                                                                    return (
                                                                        <h3 key={idx} className="text-sm sm:text-base font-semibold text-purple-300 mt-2 mb-1">
                                                                            {part.content}
                                                                        </h3>
                                                                    );
                                                                case "bullet":
                                                                    return (
                                                                        <div key={idx} className="flex gap-2 ml-2">
                                                                            <span className="text-emerald-400 font-bold">•</span>
                                                                            <p>{part.content}</p>
                                                                        </div>
                                                                    );
                                                                case "list":
                                                                    return (
                                                                        <div key={idx} className="ml-2">
                                                                            <p>{part.content}</p>
                                                                        </div>
                                                                    );
                                                                default:
                                                                    return (
                                                                        <p key={idx}>{part.content}</p>
                                                                    );
                                                            }
                                                        })}
                                                    </div>
                                                )}
                                            </div>
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
                                            Analyzing your data...
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
                        className="p-3 sm:p-4 md:p-6 flex items-center gap-3 rounded-b-xl border-t border-white/10 bg-white/5"
                    >
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Ask about your data..."
                            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none px-2"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                            <span className="hidden sm:inline">{isLoading ? "Sending..." : "Send"}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
