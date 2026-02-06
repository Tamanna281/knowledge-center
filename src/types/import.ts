// Type definitions for the import functionality

export interface ImportedRecord {
    [key: string]: string | number | boolean | null;
}

export interface ImportResponse {
    success: boolean;
    message: string;
    recordsProcessed: number;
    sampleData?: ImportedRecord[];
}

export interface ImportError {
    error: string;
}

export type ImportResult = ImportResponse | ImportError;

// Example: Define your specific data model here
// This should match your database schema
export interface KnowledgeBaseRecord {
    id?: number;
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}
