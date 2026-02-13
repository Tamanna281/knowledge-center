import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from "@/lib/prisma";

// Use a more stable PDF extraction library
const pdf = require('pdf-extraction');

// Maximum file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Extract text from PDF file using pdf-extraction
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
    try {
        const data = await pdf(buffer);
        return data.text ? data.text.trim() : '';
    } catch (error: any) {
        console.error('PDF Extraction Error:', error.message);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('file') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        let totalRecords = 0;
        const processedFiles: string[] = [];

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: `File ${file.name} exceeds 20MB limit` }, { status: 400 });
            }

            const fileName = file.name.toLowerCase();
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            let processedData: any[] = [];

            if (fileName.endsWith('.pdf')) {
                try {
                    const text = await extractPdfText(buffer);
                    processedData.push({
                        title: file.name,
                        content: text,
                        category: 'Document',
                        tags: 'pdf,knowledge-base',
                        fileName: file.name
                    });
                } catch (error: any) {
                    console.error(`Error processing PDF ${file.name}:`, error);
                    continue;
                }
            } else if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                try {
                    const workbook = XLSX.read(buffer, { type: 'buffer' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];

                    if (rawData.length === 0) continue;

                    processedData = rawData.map((row) => ({
                        title: row.title || row.Name || file.name,
                        content: JSON.stringify(row),
                        category: row.category || 'General',
                        tags: row.tags ? String(row.tags) : "excel",
                        fileName: file.name
                    }));
                } catch (error) {
                    console.error(`Error processing Excel/CSV ${file.name}:`, error);
                    continue;
                }
            }

            if (processedData.length > 0) {
                const result = await (prisma.knowledgeBase as any).createMany({
                    data: processedData as any,
                    skipDuplicates: false,
                });
                totalRecords += result.count;
                processedFiles.push(file.name);
            }
        }

        return NextResponse.json({
            success: true,
            message: `${totalRecords} records stored successfully.`,
            recordsProcessed: totalRecords,
            processedFiles: processedFiles
        });

    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
