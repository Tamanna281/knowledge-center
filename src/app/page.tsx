"use client"

import Link from "next/link";
import { Upload, Database, MessageSquare, Network, LogOut } from "lucide-react";

export default function Home() {
    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.location.href = '/login'
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Navigation Header */}
            <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="container mx-auto flex items-center justify-between px-6 py-4">
                    <h2 className="text-xl font-bold text-white">Knowledge Center</h2>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-red-300 transition-all hover:bg-red-500/30"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </nav>

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

                    {/* Admin Hierarchy Card */}
                    <Link href="/dashboard/admin">
                        <div className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.05] hover:border-orange-400/50 hover:bg-white/10">
                            <div className="mb-4 inline-block rounded-full bg-gradient-to-br from-orange-500 to-red-500 p-3">
                                <Network className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold text-white">
                                Organisation Hierarchy
                            </h2>
                            <p className="text-sm text-slate-300">
                                View and manage organizational structure and user roles
                            </p>
                            <div className="mt-4 flex items-center text-sm font-medium text-orange-400 transition-all group-hover:translate-x-1">
                                View Hierarchy →
                            </div>
                        </div>
                    </Link>
                </div>



            </main>
        </div>
    );
}
