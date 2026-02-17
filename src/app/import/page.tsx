'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Loader2, X, Database, Settings } from 'lucide-react';
import { chatApi } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface UploadStatus {
    status: 'idle' | 'uploading' | 'success' | 'error';
    message?: string;
    recordsProcessed?: number;
    processedFiles?: string[];
    errors?: string[];
}

type ImportType = 'knowledge-base' | 'product-catalog';

export default function ImportPage() {
    const [importType, setImportType] = useState<ImportType>('knowledge-base');
    const [files, setFiles] = useState<File[]>([]);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const isValidFile = (file: File): boolean => {
        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/pdf' // Now supported for both!
        ];
        return validTypes.includes(file.type) ||
            file.name.endsWith('.csv') ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls') ||
            file.name.endsWith('.pdf');
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        const validFiles = droppedFiles.filter(isValidFile);

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
            setUploadStatus({ status: 'idle' });
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            const validFiles = selectedFiles.filter(isValidFile);
            setFiles(prev => [...prev, ...validFiles]);
            setUploadStatus({ status: 'idle' });
            e.target.value = ''; // Reset input
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploadStatus({ status: 'uploading' });

        const formData = new FormData();
        files.forEach(file => {
            formData.append('file', file);
        });

        try {
            let data;
            if (importType === 'product-catalog') {
                // @ts-ignore - method exists in api.ts
                data = await chatApi.importNesscoData(formData);
            } else {
                data = await chatApi.importData(formData);
            }

            setUploadStatus({
                status: 'success',
                message: data.message,
                recordsProcessed: data.recordsProcessed,
                processedFiles: data.processedFiles,
                errors: data.errors
            });
            setFiles([]); // Clear files on success
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Network error. Please try again.';
            setUploadStatus({
                status: 'error',
                message: (error as any).response?.data?.error || message,
            });
        }
    };

    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.pdf')) return <FileText className="h-6 w-6 text-red-400" />;
        return <FileSpreadsheet className="h-6 w-6 text-green-400" />;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 selection:bg-purple-500/30">
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-3 justify-center">
                        <BackButton />
                        <h1 className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-5xl font-bold text-transparent mb-0">
                            Data Import Center
                        </h1>
                    </div>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto text-center">
                        Upload documents or product data to expand the knowledge base
                    </p>
                </div>

                {/* Import Type Switcher */}
                <div className="mb-8 flex justify-center">
                    <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
                        <button
                            onClick={() => setImportType('knowledge-base')}
                            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${importType === 'knowledge-base'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Database className="h-4 w-4" />
                            Knowledge Base Docs
                        </button>
                        <button
                            onClick={() => setImportType('product-catalog')}
                            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${importType === 'product-catalog'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Settings className="h-4 w-4" />
                            Product Catalog Data
                        </button>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {/* Left Panel: Upload */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl transition-colors duration-500"
                            style={{ borderColor: importType === 'product-catalog' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(147, 51, 234, 0.2)' }}>

                            {/* Context Header */}
                            <div className="mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                                {importType === 'product-catalog' ? (
                                    <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <Settings className="h-6 w-6" />
                                    </div>
                                ) : (
                                    <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                                        <Database className="h-6 w-6" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="font-semibold text-white">
                                        {importType === 'product-catalog' ? 'Upload Product Specs' : 'Upload Documentation'}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        {importType === 'product-catalog'
                                            ? 'Create structured machine data from CSV/Excel'
                                            : 'Add to general knowledge base context'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`relative mb-6 rounded-xl border-2 border-dashed p-10 text-center transition-all duration-300 ${isDragging
                                    ? 'border-purple-400 bg-purple-500/10 scale-[1.02]'
                                    : 'border-white/10 bg-white/5 hover:border-purple-400/30 hover:bg-white/10'
                                    }`}
                            >
                                <input
                                    type="file"
                                    id="file-upload"
                                    accept=".xlsx,.xls,.csv,.pdf"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <label htmlFor="file-upload" className="cursor-pointer block h-full w-full">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className={`rounded-full p-5 shadow-lg transition-colors duration-500 ${importType === 'product-catalog'
                                            ? 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-blue-500/20'
                                            : 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/20'
                                            }`}>
                                            <Upload className="h-10 w-10 text-white" />
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xl font-semibold text-white">
                                                Drop files here
                                            </p>
                                            <p className="text-sm text-slate-400 mb-1">
                                                Support for <span className="text-green-400 font-medium">Excel/CSV</span>
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                and <span className="text-red-400 font-medium">PDF</span>
                                            </p>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="mb-6 space-y-3">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Queue ({files.length})</h3>
                                    <div className="grid gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                        {files.map((file, index) => (
                                            <div key={index} className="group flex items-center justify-between rounded-lg bg-white/5 border border-white/5 p-3 hover:bg-white/10 transition-colors">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {getFileIcon(file.name)}
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-slate-200 text-sm truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {(file.size / 1024).toFixed(1)} KB • {file.name.split('.').pop()?.toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(index)}
                                                    className="rounded-full p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    disabled={uploadStatus.status === 'uploading'}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Status Messages */}
                            {uploadStatus.status !== 'idle' && (
                                <div
                                    className={`mb-6 rounded-lg p-4 border ${uploadStatus.status === 'success'
                                        ? 'bg-green-500/10 border-green-500/20'
                                        : uploadStatus.status === 'error'
                                            ? 'bg-red-500/10 border-red-500/20'
                                            : 'bg-blue-500/10 border-blue-500/20'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {uploadStatus.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-blue-400 mt-0.5" />}
                                        {uploadStatus.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />}
                                        {uploadStatus.status === 'error' && <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />}

                                        <div className="flex-1">
                                            {uploadStatus.status === 'uploading' && (
                                                <p className="text-blue-300 font-medium">Processing files...</p>
                                            )}
                                            {uploadStatus.status === 'error' && (
                                                <p className="text-red-300 font-medium">{uploadStatus.message}</p>
                                            )}
                                            {uploadStatus.status === 'success' && (
                                                <div>
                                                    <p className="font-medium text-green-300">{uploadStatus.message}</p>
                                                    {uploadStatus.processedFiles && (
                                                        <p className="text-xs text-green-400/60 mt-1">
                                                            Processed: {uploadStatus.processedFiles.join(', ')}
                                                        </p>
                                                    )}
                                                    {uploadStatus.errors && uploadStatus.errors.length > 0 && (
                                                        <div className="mt-2 text-xs text-orange-300 bg-orange-500/10 p-2 rounded">
                                                            <p className="font-bold">Warnings:</p>
                                                            <ul className="list-disc list-inside">
                                                                {uploadStatus.errors.map((err, i) => (
                                                                    <li key={i}>{typeof err === 'string' ? err : JSON.stringify(err)}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={handleUpload}
                                disabled={files.length === 0 || uploadStatus.status === 'uploading'}
                                className={`w-full relative overflow-hidden rounded-xl bg-gradient-to-r px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100 ${importType === 'product-catalog'
                                    ? 'from-blue-600 to-cyan-600 hover:shadow-blue-500/25'
                                    : 'from-purple-600 to-pink-600 hover:shadow-purple-500/25'
                                    }`}
                            >
                                {uploadStatus.status === 'uploading' ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Importing {files.length} File{files.length !== 1 ? 's' : ''}...</span>
                                    </span>
                                ) : (
                                    <span>Start Import</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Contextual Help */}
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                            <h3 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
                                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors duration-500 ${importType === 'product-catalog' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                                    }`}>1</span>
                                {importType === 'product-catalog' ? 'Structured Data' : 'General Knowledge'}
                            </h3>
                            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                                {importType === 'product-catalog'
                                    ? 'Detailed machine specifications. Columns like "Speed", "Power", and "Price" are automatically mapped to structured database fields for precise querying.'
                                    : 'General documents, policies, and manuals. Content is indexed for text search and summarization.'
                                }
                            </p>

                            <ul className="space-y-3 text-sm text-slate-400 border-t border-white/5 pt-4">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="h-4 w-4 text-green-500/50 mt-0.5 shrink-0" />
                                    <span>
                                        <strong className="text-slate-200">CSV/Excel</strong> Supported
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="h-4 w-4 text-green-500/50 mt-0.5 shrink-0" />
                                    <span>
                                        <strong className="text-slate-200">PDF</strong> {importType === 'product-catalog' ? 'Text Extraction' : 'Full Indexing'}
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 border border-white/5">
                            <div className="flex items-center gap-3 mb-2 text-yellow-400">
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-semibold text-sm">Pro Tip</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {importType === 'product-catalog'
                                    ? 'For new products, ensure your CSV includes "Product Name" and "Model No" columns for automatic identification.'
                                    : 'Use descriptive filenames for your documents. The AI uses the filename to understand the context of the document.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
