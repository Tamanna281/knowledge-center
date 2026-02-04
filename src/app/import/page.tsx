'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X, Plus } from 'lucide-react';
import { chatApi } from '@/lib/api';

interface UploadStatus {
    status: 'idle' | 'uploading' | 'success' | 'error';
    message?: string;
    recordsProcessed?: number;
    processedFiles?: string[];
}

export default function ImportPage() {
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

            // Reset input so same files can be selected again if needed
            e.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const isValidFile = (file: File): boolean => {
        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];
        return validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploadStatus({ status: 'uploading' });

        const formData = new FormData();
        files.forEach(file => {
            formData.append('file', file);
        });

        try {
            const data = await chatApi.importData(formData);
            setUploadStatus({
                status: 'success',
                message: data.message,
                recordsProcessed: data.recordsProcessed,
                processedFiles: data.processedFiles
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-5xl font-bold text-transparent">
                        Data Import Center
                    </h1>
                    <p className="text-lg text-slate-300">
                        Upload your Excel or CSV files to import data into the knowledge base
                    </p>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                    {/* Upload Area */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative mb-6 rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300 ${isDragging
                            ? 'border-purple-400 bg-purple-500/10 scale-[1.02]'
                            : 'border-white/20 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'
                            }`}
                    >
                        <input
                            type="file"
                            id="file-upload"
                            accept=".xlsx,.xls,.csv"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <label htmlFor="file-upload" className="cursor-pointer block h-full w-full">
                            <div className="flex flex-col items-center gap-4">
                                <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-6">
                                    <Upload className="h-12 w-12 text-white" />
                                </div>
                                <div>
                                    <p className="mb-2 text-xl font-semibold text-white">
                                        Drop files here or click to browse
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        Upload multiple Excel (.xlsx, .xls) and CSV (.csv) files at once
                                    </p>
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="mb-6 space-y-3">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Selected Files ({files.length})</h3>
                            <div className="grid gap-3 max-h-60 overflow-y-auto pr-2">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between rounded-lg bg-white/10 p-3 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="h-6 w-6 text-purple-400" />
                                            <div className="text-left">
                                                <p className="font-medium text-white text-sm truncate max-w-[300px]">{file.name}</p>
                                                <p className="text-xs text-slate-400">
                                                    {(file.size / 1024).toFixed(2)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="rounded-full p-1.5 transition-colors hover:bg-red-500/20 text-slate-400 hover:text-red-400"
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
                            className={`mb-6 flex items-center gap-3 rounded-lg p-4 ${uploadStatus.status === 'success'
                                ? 'bg-green-500/10 border border-green-500/20'
                                : uploadStatus.status === 'error'
                                    ? 'bg-red-500/10 border border-red-500/20'
                                    : 'bg-blue-500/10 border border-blue-500/20'
                                }`}
                        >
                            {uploadStatus.status === 'uploading' && (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                                    <p className="text-blue-300">Processing your files...</p>
                                </>
                            )}
                            {uploadStatus.status === 'success' && (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                                    <div className="flex-1">
                                        <p className="font-medium text-green-300">
                                            {uploadStatus.message}
                                        </p>
                                        {uploadStatus.processedFiles && (
                                            <p className="text-sm text-green-400/80 mt-1">
                                                Processed: {uploadStatus.processedFiles.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                            {uploadStatus.status === 'error' && (
                                <>
                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                    <p className="text-red-300">{uploadStatus.message}</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploadStatus.status === 'uploading'}
                        className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {uploadStatus.status === 'uploading' ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Processing {files.length} file{files.length !== 1 ? 's' : ''}...
                            </span>
                        ) : (
                            `Upload ${files.length > 0 ? files.length : ''} File${files.length !== 1 ? 's' : ''}`
                        )}
                    </button>

                    {/* Info Section */}
                    <div className="mt-8 rounded-lg bg-white/5 p-6">
                        <h3 className="mb-3 font-semibold text-white">File Requirements:</h3>
                        <ul className="space-y-2 text-sm text-slate-300">
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                                <span>First row should contain column headers</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                                <span>Supported formats: .xlsx, .xls, .csv</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                                <span>Maximum file size: 10MB per file</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
