// src/app/intent-test/page.tsx
'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import BackButton from '@/components/BackButton';

interface Intent {
    table?: string;
    aggregation?: string;
    metric?: string;
    group_by?: string | null;
    filters?: Record<string, any> | null;
    sort_by?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    unsupported?: boolean;
}

export default function IntentTestPage() {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        intent?: Intent;
        error?: string;
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!question.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/intent/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });

            const data = await response.json();
            setResult(data);
        } catch (error: any) {
            setResult({
                success: false,
                error: error.message || 'Failed to extract intent',
            });
        } finally {
            setLoading(false);
        }
    };

    const sampleQuestions = [
        'Which product sold the most?',
        'What is the average order amount?',
        'Show me total revenue by region',
        'What is the company vision?',
        'How many customers are in the North region?',
        'What do you think will happen next quarter?',
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <BackButton />
                    <div className="text-right">
                        <h1 className="text-4xl font-bold text-white mb-2">
                            🧠 Intent Extraction Engine
                        </h1>
                        <p className="text-slate-300 text-sm">
                            Test the analytics chatbot intent extraction system
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                    {/* Input Form */}
                    <form onSubmit={handleSubmit} className="mb-6">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="Ask a question..."
                                className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !question.trim()}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Extract
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Sample Questions */}
                    <div className="mb-6">
                        <p className="text-sm text-slate-300 mb-2">Try these sample questions:</p>
                        <div className="flex flex-wrap gap-2">
                            {sampleQuestions.map((sample, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setQuestion(sample)}
                                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-full text-slate-300 transition-colors"
                                    disabled={loading}
                                >
                                    {sample}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results */}
                    {result && (
                        <div className="mt-6">
                            {result.success ? (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle className="w-6 h-6 text-green-400" />
                                        <h3 className="text-lg font-semibold text-green-400">
                                            Intent Extracted Successfully
                                        </h3>
                                    </div>

                                    {result.intent?.unsupported ? (
                                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                            <p className="text-yellow-300 font-medium">
                                                ⚠️ Unsupported Query
                                            </p>
                                            <p className="text-slate-300 text-sm mt-1">
                                                This question cannot be answered with numeric data aggregation.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-slate-400 mb-1">Table</p>
                                                    <p className="text-white font-mono bg-white/5 px-3 py-2 rounded">
                                                        {result.intent?.table}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 mb-1">Aggregation</p>
                                                    <p className="text-white font-mono bg-white/5 px-3 py-2 rounded">
                                                        {result.intent?.aggregation}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 mb-1">Metric</p>
                                                    <p className="text-white font-mono bg-white/5 px-3 py-2 rounded">
                                                        {result.intent?.metric}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 mb-1">Group By</p>
                                                    <p className="text-white font-mono bg-white/5 px-3 py-2 rounded">
                                                        {result.intent?.group_by || 'null'}
                                                    </p>
                                                </div>
                                            </div>

                                            {result.intent?.filters && (
                                                <div>
                                                    <p className="text-xs text-slate-400 mb-1">Filters</p>
                                                    <pre className="text-white font-mono text-sm bg-white/5 px-3 py-2 rounded overflow-auto">
                                                        {JSON.stringify(result.intent.filters, null, 2)}
                                                    </pre>
                                                </div>
                                            )}

                                            <div>
                                                <p className="text-xs text-slate-400 mb-1">Full Intent JSON</p>
                                                <pre className="text-slate-300 font-mono text-xs bg-black/30 px-3 py-2 rounded overflow-auto max-h-48">
                                                    {JSON.stringify(result.intent, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle className="w-6 h-6 text-red-400" />
                                        <h3 className="text-lg font-semibold text-red-400">
                                            Extraction Failed
                                        </h3>
                                    </div>
                                    <p className="text-slate-300 text-sm">
                                        {result.error || 'Unknown error occurred'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Info Panel */}
                <div className="mt-6 bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <h3 className="text-white font-semibold mb-3">ℹ️ How It Works</h3>
                    <ul className="text-slate-300 text-sm space-y-2">
                        <li>• Powered by <strong>Gemini AI</strong> for natural language understanding</li>
                        <li>• Validated with <strong>Zod</strong> schemas for type safety</li>
                        <li>• Extracts structured queries from natural language</li>
                        <li>• Supports: sales, orders, products, customers tables</li>
                        <li>• Rejects non-data questions (opinions, predictions, policies)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
