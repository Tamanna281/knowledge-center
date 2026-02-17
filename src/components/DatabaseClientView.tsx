"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Database, Search, Trash2, X, RefreshCw, FileSpreadsheet, FileText, Tag, Eye } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import BackButton from './BackButton';
import { useRouter } from 'next/navigation';

interface DatabaseClientViewProps {
    data: any[];
}

const PAGE_SIZE = 8;

export default function DatabaseClientView({ data }: DatabaseClientViewProps) {
    const router = useRouter();
    const [records, setRecords] = useState<any[]>(Array.isArray(data) ? data : []);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [tagFilter, setTagFilter] = useState('');
    const [fileFilter, setFileFilter] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [refreshing, startRefresh] = useTransition();

    useEffect(() => {
        setRecords(Array.isArray(data) ? data : []);
    }, [data]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, categoryFilter, tagFilter, fileFilter]);

    const categories = useMemo(() => {
        const unique = new Set<string>();
        records.forEach((item) => {
            const category = item.category?.toString().trim() || 'Uncategorized';
            unique.add(category);
        });
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [records]);

    const filteredRecords = useMemo(() => {
        const searchLower = searchTerm.trim().toLowerCase();
        const tagLower = tagFilter.trim().toLowerCase();

        return records.filter((item) => {
            const title = item.title?.toString().toLowerCase() || '';
            const tags = item.tags?.toString().toLowerCase() || '';
            const category = item.category?.toString().toLowerCase() || 'uncategorized';
            const fileName = item.fileName?.toString().toLowerCase() || '';
            const content = item.content?.toString().toLowerCase() || '';
            const fileKey = item.fileName ?? '__unknown__';

            const matchesSearch = !searchLower ||
                title.includes(searchLower) ||
                tags.includes(searchLower) ||
                category.includes(searchLower) ||
                fileName.includes(searchLower) ||
                content.includes(searchLower);

            const matchesCategory =
                categoryFilter === 'all' ||
                (item.category?.toString().trim() || 'Uncategorized') === categoryFilter;

            const matchesTags = !tagLower || tags.includes(tagLower);

            const matchesFile = !fileFilter || fileKey === fileFilter;

            return matchesSearch && matchesCategory && matchesTags && matchesFile;
        });
    }, [records, searchTerm, categoryFilter, tagFilter, fileFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));

    useEffect(() => {
        setCurrentPage((prev) => Math.min(prev, totalPages));
    }, [totalPages]);

    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pagedRecords = filteredRecords.slice(pageStart, pageStart + PAGE_SIZE);

    const files = useMemo(() => {
        const map = new Map<string, { key: string; label: string; actual: string | null; count: number; lastUpdated: Date | null }>();

        records.forEach((item) => {
            const actual = item.fileName ?? null;
            const key = actual ?? '__unknown__';
            const label = actual ?? 'Unknown File';
            const existing = map.get(key) || { key, label, actual, count: 0, lastUpdated: null };
            existing.count += 1;

            const createdAt = item.createdAt ? new Date(item.createdAt) : null;
            if (createdAt && (!existing.lastUpdated || createdAt > existing.lastUpdated)) {
                existing.lastUpdated = createdAt;
            }

            map.set(key, existing);
        });

        return Array.from(map.values()).sort((a, b) => {
            const aTime = a.lastUpdated ? a.lastUpdated.getTime() : 0;
            const bTime = b.lastUpdated ? b.lastUpdated.getTime() : 0;
            return bTime - aTime;
        });
    }, [records]);

    const handleRefresh = () => {
        startRefresh(() => {
            router.refresh();
        });
    };

    const handleDeleteFile = async (fileKey: string, fileName: string | null) => {
        const displayName = fileName || 'Unknown File';
        if (!window.confirm(`Delete all records imported from "${displayName}"? This cannot be undone.`)) {
            return;
        }

        setDeletingKey(fileKey);
        setDeleteError(null);

        try {
            const response = await fetch('/api/database/files', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName })
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to delete file.');
            }

            setRecords((prev) => prev.filter((record) => (record.fileName ?? null) !== fileName));

            if (selectedItem && (selectedItem.fileName ?? null) === fileName) {
                setSelectedItem(null);
            }

            if (fileFilter === fileKey) {
                setFileFilter(null);
            }
        } catch (error: any) {
            setDeleteError(error?.message || 'Failed to delete file.');
        } finally {
            setDeletingKey(null);
        }
    };

    const activeFileLabel = fileFilter
        ? files.find((file) => file.key === fileFilter)?.label || 'Unknown File'
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="mx-auto max-w-7xl space-y-8">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="mb-4">
                                <BackButton />
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="rounded-full bg-cyan-500/20 p-3 text-cyan-400">
                                    <Database className="h-6 w-6" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">Database Explorer</h1>
                                    <p className="text-slate-300">
                                        Search, filter, and manage your imported knowledge base.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh Files'}
                        </button>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search title or content"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full rounded-xl bg-white/10 border border-white/20 py-3 pl-9 pr-4 text-white placeholder-slate-400 focus:border-blue-400 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Category</label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full rounded-xl bg-white/10 border border-white/20 py-3 px-4 text-white focus:border-blue-400 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
                            >
                                <option value="all">All categories</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Tags</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="e.g. finance, sales"
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    className="w-full rounded-xl bg-white/10 border border-white/20 py-3 pl-9 pr-4 text-white placeholder-slate-400 focus:border-blue-400 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-2xl font-semibold text-white">Records</h2>
                            {activeFileLabel && (
                                <button
                                    onClick={() => setFileFilter(null)}
                                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/20"
                                >
                                    File: {activeFileLabel}
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                        <span className="text-sm text-slate-400">
                            Page {currentPage} of {totalPages}
                        </span>
                    </div>

                    {filteredRecords.length === 0 ? (
                        <p className="text-sm text-slate-300">
                            {searchTerm || tagFilter || categoryFilter !== 'all' || fileFilter
                                ? 'No records match the current filters.'
                                : 'No database records found.'}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Title / File</th>
                                        <th className="px-6 py-4 font-semibold">Category</th>
                                        <th className="px-6 py-4 font-semibold">Tags</th>
                                        <th className="px-6 py-4 font-semibold">Source</th>
                                        <th className="px-6 py-4 font-semibold">Date</th>
                                        <th className="px-6 py-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {pagedRecords.map((item) => (
                                        <tr key={item.id} className="transition-colors hover:bg-white/5">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded bg-purple-500/20 p-2 text-purple-400">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">{item.title}</div>
                                                        <div className="text-xs text-slate-400">
                                                            {item.fileName || 'Unknown File'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                                                    {item.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="truncate max-w-[200px] block" title={item.tags}>
                                                    {item.tags || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.sourceTable === 'MachineProduct'
                                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/10'
                                                    }`}>
                                                    {item.sourceTable === 'MachineProduct' ? 'Product Catalog' : 'Knowledge Base'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : '-'}
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
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-between">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <div className="rounded-lg bg-purple-500/20 px-3 py-1 text-sm font-semibold text-purple-200">
                            {currentPage}
                        </div>
                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-2xl font-semibold text-white">Imported Files</h2>
                        <span className="text-sm text-slate-400">{files.length} file(s)</span>
                    </div>

                    {deleteError && (
                        <p className="mb-4 text-sm text-rose-300">{deleteError}</p>
                    )}

                    {files.length === 0 ? (
                        <p className="text-sm text-slate-300">No imported files found.</p>
                    ) : (
                        <div className="divide-y divide-white/10">
                            {files.map((file) => (
                                <div key={file.key} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300">
                                            <FileSpreadsheet className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{file.label}</div>
                                            <div className="text-xs text-slate-400">
                                                {file.count} records
                                                {file.lastUpdated ? ` - Last updated ${format(file.lastUpdated, 'MMM d, yyyy')}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setFileFilter(file.key);
                                                setSearchTerm('');
                                                setCategoryFilter('all');
                                                setTagFilter('');
                                            }}
                                            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                                        >
                                            View Records
                                        </button>
                                        <button
                                            onClick={() => handleDeleteFile(file.key, file.actual)}
                                            disabled={deletingKey === file.key}
                                            className="inline-flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            {deletingKey === file.key ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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

