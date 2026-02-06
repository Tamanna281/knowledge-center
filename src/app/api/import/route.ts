import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from "@/lib/prisma";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;



export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('file') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        let totalRecords = 0;
        const processedFiles = [];

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: `File ${file.name} exceeds 10MB limit` }, { status: 400 });
            }

            const validTypes = [
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv'
            ];

            const isValidType = validTypes.includes(file.type) ||
                file.name.endsWith('.csv') ||
                file.name.endsWith('.xlsx') ||
                file.name.endsWith('.xls');

            if (!isValidType) {
                return NextResponse.json(
                    { error: `File ${file.name} has invalid type. Please upload Excel or CSV files only.` },
                    { status: 400 }
                );
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON with raw values to preserve data types
            const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (rawData.length === 0) {
                continue; // Skip empty files
            }

            // Map the Excel/CSV rows to your KnowledgeBase schema
            const processedData = rawData.map((row) => ({
                title: row.title || row.Name || file.name,
                content: JSON.stringify(row),
                category: row.category || 'General',
                tags: row.tags ? String(row.tags) : "",
                fileName: file.name // Store the filename
            }));

            // Bulk insert into DB via Prisma
            const result = await (prisma.knowledgeBase as any).createMany({
                data: processedData as any,
                skipDuplicates: false,
            });

            totalRecords += result.count;
            processedFiles.push(file.name);
        }

        return NextResponse.json({
            success: true,
            message: `${totalRecords} records stored successfully from ${processedFiles.length} files.`,
            recordsProcessed: totalRecords,
            processedFiles: processedFiles
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { error: 'Failed to process files and store in database.' },
            { status: 500 }
        );
    }
}
