import { ImportedRecord } from '../types/import';

/**
 * Validates that required fields are present in the imported data
 */
export function validateRequiredFields(
    data: ImportedRecord[],
    requiredFields: string[]
): { valid: boolean; missingFields?: string[] } {
    if (data.length === 0) {
        return { valid: false };
    }

    const firstRecord = data[0];
    const missingFields = requiredFields.filter(
        (field) => !(field in firstRecord)
    );

    if (missingFields.length > 0) {
        return { valid: false, missingFields };
    }

    return { valid: true };
}

/**
 * Sanitizes imported data by trimming strings and removing empty rows
 */
export function sanitizeData(data: ImportedRecord[]): ImportedRecord[] {
    return data
        .filter((record) => {
            // Remove completely empty rows
            return Object.values(record).some(
                (value) => value !== null && value !== undefined && value !== ''
            );
        })
        .map((record) => {
            // Trim string values
            const sanitized: ImportedRecord = {};
            for (const [key, value] of Object.entries(record)) {
                if (typeof value === 'string') {
                    sanitized[key] = value.trim();
                } else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        });
}

/**
 * Converts imported data to a specific format
 * Customize this based on your database schema
 */
export function transformData<T>(
    data: ImportedRecord[],
    transformer: (record: ImportedRecord) => T
): T[] {
    return data.map(transformer);
}

/**
 * Validates file extension
 */
export function isValidFileExtension(filename: string): boolean {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    return validExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Detects duplicate records based on a unique key
 */
export function findDuplicates(
    data: ImportedRecord[],
    uniqueKey: string
): ImportedRecord[] {
    const seen = new Set<string | number>();
    const duplicates: ImportedRecord[] = [];

    for (const record of data) {
        const keyValue = record[uniqueKey];
        if (keyValue !== undefined && keyValue !== null) {
            const key = String(keyValue);
            if (seen.has(key)) {
                duplicates.push(record);
            } else {
                seen.add(key);
            }
        }
    }

    return duplicates;
}
