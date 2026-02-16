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
    const [conversationId, setConversationId] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    // Load chat history from localStorage on mount
    useEffect(() => {
        const savedMessages = localStorage.getItem("chatMessages");
        const savedConversationId = localStorage.getItem("conversationId");

        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed) && parsed.length > 1) {
                    setMessages(parsed);
                }
            } catch (error) {
                console.error("Error loading saved messages:", error);
            }
        }

        if (savedConversationId) {
            setConversationId(savedConversationId);
        }
    }, []);

    // Save to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 1) { // Don't save if only greeting
            localStorage.setItem("chatMessages", JSON.stringify(messages));
        }
    }, [messages]);

    // Save to database periodically (debounced)
    useEffect(() => {
        if (messages.length <= 1) return; // Don't save greeting-only

        const timeoutId = setTimeout(() => {
            saveChatToDatabase();
        }, 3000); // Save 3 seconds after last message

        return () => clearTimeout(timeoutId);
    }, [messages]);

    const saveChatToDatabase = async () => {
        try {
            const messagesToSave = messages.filter(m => m.id !== "greeting");
            if (messagesToSave.length === 0) return;

            const response = await fetch("/api/chat/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId,
                    messages: messagesToSave,
                }),
            });

            const data = await response.json();
            if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId);
                localStorage.setItem("conversationId", data.conversationId);
            }
        } catch (error) {
            console.error("Error saving to database:", error);
        }
    };

    const clearChat = () => {
        const confirmed = window.confirm("Are you sure you want to clear the chat history?");
        if (confirmed) {
            setMessages([{ id: "greeting", role: "bot", content: GREETING_MESSAGE }]);
            setConversationId(null);
            localStorage.removeItem("chatMessages");
            localStorage.removeItem("conversationId");
        }
    };

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
        if (messages.length <= 1) {
            alert("No chat messages to download.");
            return;
        }

        setIsGeneratingPdf(true);

        try {
            const { jsPDF } = await import("jspdf");
            const html2canvas = (await import("html2canvas")).default;

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;
            let y = margin;
            let pageNumber = 1;

            const addPageNumber = () => {
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 8, { align: "center" });
            };

            const checkPageBreak = (neededHeight: number) => {
                if (y + neededHeight > pageHeight - 20) {
                    addPageNumber();
                    pdf.addPage();
                    pageNumber++;
                    y = margin;
                }
            };

            const wrapText = (text: string, maxWidth: number): string[] => {
                const lines: string[] = [];
                const paragraphs = text.split("\n");
                for (const para of paragraphs) {
                    if (para.trim() === "") {
                        lines.push("");
                        continue;
                    }
                    const wrapped = pdf.splitTextToSize(para, maxWidth);
                    lines.push(...wrapped);
                }
                return lines;
            };

            // --- Title ---
            pdf.setFontSize(20);
            pdf.setTextColor(80, 40, 120);
            pdf.text("Knowledge Chatbot Report", pageWidth / 2, y, { align: "center" });
            y += 10;

            // --- Timestamp ---
            pdf.setFontSize(10);
            pdf.setTextColor(120);
            const timestamp = new Date().toLocaleString();
            pdf.text(`Generated: ${timestamp}`, pageWidth / 2, y, { align: "center" });
            y += 8;

            // --- Separator line ---
            pdf.setDrawColor(180);
            pdf.setLineWidth(0.5);
            pdf.line(margin, y, pageWidth - margin, y);
            y += 10;

            // --- Messages ---
            const chatMessages = messages.filter((m) => m.id !== "greeting");

            for (const message of chatMessages) {
                const isUser = message.role === "user";
                const roleLabel = isUser ? "You" : "Bot";
                const hasInsight = message.insight && message.insight.type === "insight";

                // Estimate space needed
                checkPageBreak(20);

                // Role label
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(isUser ? 100 : 34, isUser ? 40 : 139, isUser ? 150 : 34);
                pdf.text(`${roleLabel}:`, margin, y);
                y += 6;

                // Message content
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(10);
                pdf.setTextColor(50);

                if (hasInsight && message.insight) {
                    // Key Insight
                    if (message.insight.keyInsight) {
                        checkPageBreak(14);
                        pdf.setFont("helvetica", "bold");
                        pdf.setTextColor(0, 128, 90);
                        pdf.text("Key Insight:", margin + 2, y);
                        y += 5;
                        pdf.setFont("helvetica", "normal");
                        pdf.setTextColor(50);
                        const insightLines = wrapText(message.insight.keyInsight, contentWidth - 4);
                        for (const line of insightLines) {
                            checkPageBreak(5);
                            pdf.text(line, margin + 4, y);
                            y += 5;
                        }
                        y += 3;
                    }

                    // Sections
                    if (message.insight.sections && message.insight.sections.length > 0) {
                        for (const section of message.insight.sections) {
                            checkPageBreak(12);
                            pdf.setFont("helvetica", "bold");
                            pdf.setTextColor(80, 40, 120);
                            pdf.text(section.title, margin + 2, y);
                            y += 5;
                            pdf.setFont("helvetica", "normal");
                            pdf.setTextColor(50);
                            for (const item of section.items) {
                                const itemLines = wrapText(`• ${item}`, contentWidth - 8);
                                for (const line of itemLines) {
                                    checkPageBreak(5);
                                    pdf.text(line, margin + 6, y);
                                    y += 5;
                                }
                            }
                            y += 2;
                        }
                    }

                    // Analytical Summary
                    if (message.insight.analyticalSummary) {
                        checkPageBreak(12);
                        pdf.setFont("helvetica", "bold");
                        pdf.setTextColor(40, 80, 160);
                        pdf.text("Summary:", margin + 2, y);
                        y += 5;
                        pdf.setFont("helvetica", "normal");
                        pdf.setTextColor(50);
                        const summaryLines = wrapText(message.insight.analyticalSummary, contentWidth - 4);
                        for (const line of summaryLines) {
                            checkPageBreak(5);
                            pdf.text(line, margin + 4, y);
                            y += 5;
                        }
                        y += 3;
                    }

                    // Data Points
                    if (message.insight.dataPoints) {
                        checkPageBreak(8);
                        pdf.setFontSize(9);
                        pdf.setTextColor(120);
                        pdf.text(
                            `Records: ${message.insight.dataPoints.totalRecords} | Relevance: ${message.insight.dataPoints.relevanceScore}`,
                            margin + 2,
                            y
                        );
                        y += 5;
                        pdf.setFontSize(10);
                    }

                    // --- Capture and Add Chart ---
                    if (message.insight.chart) {
                        const chartId = `chart-${message.id}`;
                        const chartElement = document.getElementById(chartId);
                        if (chartElement) {
                            try {
                                const canvas = await html2canvas(chartElement, {
                                    scale: 2, // Better quality
                                    useCORS: true,
                                    logging: false,
                                    backgroundColor: '#111827', // Fix: Use a standard hex background
                                    onclone: (doc) => {
                                        // ULTRA-AGGRESSIVE FIX for oklab/oklch parsing crash

                                        // 1. Inject a "Safety Stylesheet" that forces standard colors everywhere in the clone
                                        const style = doc.createElement('style');
                                        style.innerHTML = `
                                            * { 
                                                color: #f1f5f9 !important; 
                                                background-color: transparent !important;
                                                border-color: #334155 !important;
                                                background-image: none !important;
                                                filter: none !important;
                                                backdrop-filter: none !important;
                                                box-shadow: none !important;
                                                text-shadow: none !important;
                                            }
                                            svg, path, rect, circle { 
                                                fill: #3b82f6 !important; 
                                                stroke: #334155 !important;
                                            }
                                            h3 { color: #ffffff !important; }
                                            .recharts-cartesian-grid-horizontal line,
                                            .recharts-cartesian-grid-vertical line {
                                                stroke: #334155 !important;
                                                opacity: 0.2 !important;
                                            }
                                            .recharts-text { fill: #94a3b8 !important; }
                                        `;
                                        doc.head.appendChild(style);

                                        // 2. Clear inline styles and classes that might contain "okl" values
                                        const elements = doc.getElementsByTagName('*');
                                        for (let i = 0; i < elements.length; i++) {
                                            const el = elements[i] as HTMLElement;

                                            // Wipe class names to prevent Tailwind 4's modern colors from being parsed
                                            el.removeAttribute('class');

                                            if (el.style) {
                                                // Reset everything to force it to use our safety stylesheet
                                                el.style.color = '';
                                                el.style.backgroundColor = '';
                                                el.style.borderColor = '';
                                                el.style.fill = '';
                                                el.style.stroke = '';
                                            }
                                        }

                                        // 3. Re-apply essential layout and background only to the chart container
                                        const clonedChart = doc.getElementById(chartId);
                                        if (clonedChart) {
                                            clonedChart.style.display = 'block';
                                            clonedChart.style.backgroundColor = '#111827';
                                            clonedChart.style.padding = '40px';
                                            clonedChart.style.width = '1000px';
                                            clonedChart.style.borderRadius = '16px';
                                            clonedChart.style.margin = '0';

                                            // Ensure charts are tall enough
                                            const chartDiv = clonedChart.querySelector('div');
                                            if (chartDiv) chartDiv.style.height = '400px';
                                        }
                                    }
                                });
                                const imgData = canvas.toDataURL("image/png");

                                // Chart dimensions calculation
                                const chartImgWidth = contentWidth - 10;
                                const chartImgHeight = (canvas.height * chartImgWidth) / canvas.width;

                                checkPageBreak(chartImgHeight + 10);
                                pdf.addImage(imgData, "PNG", margin + 5, y, chartImgWidth, chartImgHeight);
                                y += chartImgHeight + 10;
                            } catch (chartErr) {
                                console.error(`Error capturing chart ${chartId}:`, chartErr);
                            }
                        }
                    }
                } else {
                    // Plain text message
                    const contentLines = wrapText(message.content, contentWidth - 4);
                    for (const line of contentLines) {
                        checkPageBreak(5);
                        pdf.text(line, margin + 4, y);
                        y += 5;
                    }
                }

                // Separator between messages
                y += 3;
                checkPageBreak(10);
                pdf.setDrawColor(220);
                pdf.setLineWidth(0.2);
                pdf.line(margin + 5, y, pageWidth - margin - 5, y);
                y += 7;
            }

            // Add page number on last page
            addPageNumber();

            pdf.save(`knowledge-report-${new Date().getTime()}.pdf`);
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
                    <div className="flex gap-2">
                        <button
                            onClick={clearChat}
                            disabled={messages.length <= 1}
                            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="hidden sm:inline">Clear Chat</span>
                            <span className="sm:hidden">Clear</span>
                        </button>
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
                    </div>
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
                                                            <div className="mt-4" id={`chart-${message.id}`}>
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
