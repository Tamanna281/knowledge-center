
import Link from "next/link";
import { Upload, Database, MessageSquare, Shield } from "lucide-react";

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <main className="container mx-auto px-6 py-16">
                {/* Header */}
                <div className="mb-16 text-center">
                    <h1 className="mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-6xl font-bold text-transparent">
                        Knowledge Center
                    </h1>
                    <p className="text-xl text-slate-300">
                        Your enterprise data management platform
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Import Data Card */}
                    <Link href="/import">
                        <div className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.05] hover:border-purple-400/50 hover:bg-white/10">
                            <div className="mb-4 inline-block rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-3">
                                <Upload className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-white">
                                Import Data
                            </h2>
                            <p className="text-sm text-slate-300">
                                Upload Excel or CSV files to import data into the knowledge base
                            </p>
                            <div className="mt-4 flex items-center text-sm font-medium text-purple-400 transition-all group-hover:translate-x-1">
                                Get Started →
                            </div>
                        </div>
                    </Link>

                    {/* Database Card */}
                    <Link href="/database">
                        <div className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.05] hover:border-blue-400/50 hover:bg-white/10">
                            <div className="mb-4 inline-block rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 p-3">
                                <Database className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-white">
                                Database
                            </h2>
                            <p className="text-sm text-slate-300">
                                Secure and scalable data storage with PostgreSQL
                            </p>
                            <div className="mt-4 flex items-center text-sm font-medium text-blue-400 transition-all group-hover:translate-x-1">
                                View Data →
                            </div>
                        </div>
                    </Link>

                    {/* Chat Interface Card */}
                    <Link href="/chatbot">
                        <div className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.05] hover:border-purple-400/50 hover:bg-white/10">
                            <div className="mb-4 inline-block rounded-full bg-gradient-to-br from-green-500 to-emerald-500 p-3">
                                <MessageSquare className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-white">
                                Chat Interface
                            </h2>
                            <p className="text-sm text-slate-300">
                                AI-powered chatbot for querying your knowledge base
                            </p>
                            <div className="mt-4 flex items-center text-sm font-medium text-purple-400 transition-all group-hover:translate-x-1">
                                Open Chat →
                            </div>
                        </div>
                    </Link>

                    {/* Authentication Card */}
                    <Link href="/login">
                        <div className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.05] hover:border-purple-400/50 hover:bg-white/10">
                            <div className="mb-4 inline-block rounded-full bg-gradient-to-br from-orange-500 to-red-500 p-3">
                                <Shield className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-white">
                                Authentication
                            </h2>
                            <p className="text-sm text-slate-300">
                                Login to access secure resources
                            </p>
                            <div className="mt-4 flex items-center text-sm font-medium text-purple-400 transition-all group-hover:translate-x-1">
                                Login →
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Quick Start Section */}
                <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-xl">
                    <h2 className="mb-6 text-2xl font-semibold text-white">
                        Quick Start Guide
                    </h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                                1
                            </div>
                            <div>
                                <h3 className="mb-1 font-semibold text-white">Import Your Data</h3>
                                <p className="text-sm text-slate-300">
                                    Upload Excel or CSV files with your knowledge base content
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                                2
                            </div>
                            <div>
                                <h3 className="mb-1 font-semibold text-white">Organize Content</h3>
                                <p className="text-sm text-slate-300">
                                    Categorize and tag your data for easy retrieval
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                                3
                            </div>
                            <div>
                                <h3 className="mb-1 font-semibold text-white">Query with AI</h3>
                                <p className="text-sm text-slate-300">
                                    Use the chatbot to find information instantly
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
