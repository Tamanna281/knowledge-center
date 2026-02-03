"use client";

import { useState } from 'react';
import { Database, Search, ArrowLeft, Calendar, Tag, FileText, Eye, FileSpreadsheet, X } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface DatabaseClientViewProps {
    data: any[];
}

export default function DatabaseClientView({ data }: DatabaseClientViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    // Filter data
    const filteredData = data.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return (
            item.title.toLowerCase().includes(searchLower) ||
            item.tags.toLowerCase().includes(searchLower) ||
            (item.category && item.category.toLowerCase().includes(searchLower)) ||
            (item.fileName && item.fileName.toLowerCase().includes(searchLower))
        );
    });

    // Group by fileName
    const groupedData: Record<string, any[]> = filteredData.reduce((acc, item) => {
        const fileName = item.fileName || 'Unknown File';
        if (!acc[fileName]) {
            acc[fileName] = [];
        }
        acc[fileName].push(item);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white mb-4 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Home
                        </Link>
                        <h1 className="mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent flex items-center gap-3">
                            <Database className="h-10 w-10 text-cyan-400" />
                            Database Contents
                        </h1>
                        <p className="text-slate-300">
                            View and manage your imported data
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by title, tags, or filename..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl bg-white/10 border border-white/20 py-3 pl-10 pr-4 text-white placeholder-slate-400 focus:border-blue-400 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-8">
                    {Object.keys(groupedData).length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                                <Search className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-white">
                                {searchTerm ? 'No matches found' : 'No Data Found'}
                            </h3>
                            <p className="text-slate-400">
                                {searchTerm
                                    ? 'Try adjusting your search criteria'
                                    : 'Your database is currently empty. Upload some files to get started.'}
                            </p>
                            {!searchTerm && (
                                <Link
                                    href="/import"
                                    className="mt-6 inline-block rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-purple-700"
                                >
                                    Go to Import
                                </Link>
                            )}
                        </div>
                    ) : (
                        Object.entries(groupedData).map(([fileName, items]) => (
                            <div key={fileName} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                                <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                                    <div className="rounded-lg bg-green-500/20 p-2 text-green-400">
                                        <FileSpreadsheet className="h-6 w-6" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-white">{fileName}</h2>
                                    <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
                                        {items.length} records
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-300">
                                        <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold">ID</th>
                                                <th className="px-6 py-4 font-semibold">Title / Name</th>
                                                <th className="px-6 py-4 font-semibold">Content</th>
                                                <th className="px-6 py-4 font-semibold">Category</th>
                                                <th className="px-6 py-4 font-semibold">Tags</th>
                                                <th className="px-6 py-4 font-semibold">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {items.map((item) => (
                                                <tr key={item.id} className="transition-colors hover:bg-white/5">
                                                    <td className="px-6 py-4 text-white">#{item.id}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="rounded bg-purple-500/20 p-2 text-purple-400">
                                                                <FileText className="h-4 w-4" />
                                                            </div>
                                                            <span className="font-medium text-white">{item.title}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => setSelectedItem(item)}
                                                            className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            View
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                                                            {item.category || 'Uncategorized'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Tag className="h-3 w-3 text-slate-500" />
                                                            <span className="truncate max-w-[150px] block" title={item.tags}>
                                                                {item.tags || '-'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400">
                                                        {format(new Date(item.createdAt), 'MMM d, yyyy')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* View Content Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/60 p-4">
                    <div className="w-full max-w-2xl transform rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95">
                        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">Record Details</h3>
                                <p className="text-sm text-slate-400">ID: #{selectedItem.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="rounded-full bg-white/10 p-2 text-slate-400 transition-colors hover:bg-white/20 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-black/30 p-4">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-green-300">
                                {(() => {
                                    try {
                                        const parsed = JSON.parse(selectedItem.content);
                                        return JSON.stringify(parsed, null, 2);
                                    } catch (e) {
                                        return selectedItem.content;
                                    }
                                })()}
                            </pre>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
