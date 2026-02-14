import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from "@/lib/prisma";

// Use a more stable PDF extraction library
const pdf = require('pdf-extraction');

// Maximum file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Column mapping configuration - maps various CSV column names to our database fields
const COLUMN_MAPPINGS: Record<string, string[]> = {
    productCategory: ['PRODUCT CATEGORY', 'Category', 'Product Category', 'Type'],
    productName: ['PRODUCT NAME', 'Name', 'Product Name', 'Product'],
    modelNumber: ['NESSCO MODEL NO.', 'Model No', 'Model Number', 'Model', 'NESSCO MODEL NO'],
    variant: ['VARIANT', 'Variant', 'Model Variant'],
    productId: ['PRODUCT ID', 'Product ID', 'ID'],
    productStatus: ['PRODUCT STATUS', 'Status', 'Product Status'],
    machineSpeed: ['MACHINE SPEED', 'Speed', 'Machine Speed', 'Production Speed'],
    stableSpeed: ['STABLE SPEED', 'Stable Speed'],
    speedUnit: ['UoM Speed', 'Speed Unit', 'Unit'],
    weightKg: ['WEIGHT (kg)', 'Weight', 'Weight (kg)', 'Machine Weight'],
    powerKw: ['POWER (kW)', 'Power', 'Power (kW)', 'Power Consumption'],
    domesticPriceMin: ['DOMESTIC PRICE\n(min)', 'Domestic Price Min', 'Price Min'],
    domesticPriceMax: ['DOMESTIC PRICE\n(max)', 'Domestic Price Max', 'Price Max'],
    domesticPriceAvg: ['DOMESTIC PRICE\n(Avg)', 'Domestic Price Avg', 'Price Avg'],
    exportPriceMin: ['EXPORT PRICE\n(min)', 'Export Price Min'],
    exportPriceMax: ['EXPORT PRICE\n(max)', 'Export Price Max'],
    exportPriceAvg: ['EXPORT PRICE\n(avg)', 'Export Price Avg'],
    operatingVoltage: ['OPERATING VOLTAGE', 'Voltage', 'Operating Voltage'],
    phaseRequirement: ['PHASE REQUIREMENT', 'Phase', 'Phase Requirement'],
    startingLoadKw: ['PRODCUT STARTING LOAD (kW)', 'Starting Load', 'Starting Load (kW)'],
    runningLoadKw: ['PRODCUT RUNNING LOAD (kW)', 'Running Load', 'Running Load (kW)'],
    dimensionsP1: ['P1 DIMENSION (mm)', 'Dimension 1', 'Dimensions'],
    dimensionsP2: ['P2 DIMENSION (mm)', 'Dimension 2'],
    dimensionsP3: ['P3 DIMENSION (mm)', 'Dimension 3'],
};

/**
 * Extract text from PDF file using pdf-extraction
 * This library is more stable for server-side Next.js
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

/**
 * Find matching column name from various possible names
 */
function findColumnValue(row: any, possibleNames: string[]): any {
    for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return row[name];
        }
    }
    return null;
}

/**
 * Parse numeric value safely
 */
function parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
}

/**
 * Build searchable text from product data
 */
function buildSearchText(data: any, rawRow: any): string {
    const parts: string[] = [];

    if (data.productName) parts.push(data.productName);
    if (data.modelNumber) parts.push(data.modelNumber);
    if (data.productCategory) parts.push(data.productCategory);

    Object.values(rawRow).forEach(value => {
        if (value && typeof value === 'string') {
            parts.push(value);
        }
    });

    return parts.join(' ').toLowerCase();
}

/**
 * Extract product tags from data
 */
function extractTags(data: any): string[] {
    const tags: Set<string> = new Set();
    if (data.productCategory) tags.add(data.productCategory.toLowerCase());
    if (data.productStatus) tags.add(data.productStatus.toLowerCase());
    if (data.modelNumber) tags.add(data.modelNumber.toLowerCase());
    return Array.from(tags);
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
        const errors: string[] = [];

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`File ${file.name} exceeds 20MB limit`);
                continue;
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            let rawData: any[] = [];
            let sourceType = '';

            if (file.name.toLowerCase().endsWith('.pdf')) {
                sourceType = 'PDF';
                try {
                    const pdfText = await extractPdfText(buffer);
                    rawData = [{
                        'PRODUCT NAME': file.name.replace(/\.pdf$/i, ''),
                        'Name': file.name.replace(/\.pdf$/i, ''),
                        'PRODUCT CATEGORY': 'PDF Manual',
                        'PDF_TEXT': pdfText,
                        'SOURCE_FILE': file.name,
                        'tags': 'pdf,manual,nessco'
                    }];
                } catch (error: any) {
                    errors.push(`PDF ${file.name}: ${error.message}`);
                    continue;
                }
            } else if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                sourceType = file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'EXCEL';
                try {
                    const workbook = XLSX.read(buffer, { type: 'buffer' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    rawData = XLSX.utils.sheet_to_json(worksheet) as any[];
                } catch (error: any) {
                    errors.push(`File ${file.name}: ${error.message}`);
                    continue;
                }
            }

            if (rawData.length === 0) continue;

            const productsToCreate = rawData.map((row) => {
                const productData: any = {
                    productCategory: findColumnValue(row, COLUMN_MAPPINGS.productCategory) || 'Machine',
                    productName: findColumnValue(row, COLUMN_MAPPINGS.productName) || file.name,
                    modelNumber: findColumnValue(row, COLUMN_MAPPINGS.modelNumber) || 'N/A',
                    variant: findColumnValue(row, COLUMN_MAPPINGS.variant),
                    productId: findColumnValue(row, COLUMN_MAPPINGS.productId),
                    productStatus: findColumnValue(row, COLUMN_MAPPINGS.productStatus),
                    machineSpeed: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.machineSpeed)),
                    stableSpeed: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.stableSpeed)),
                    speedUnit: findColumnValue(row, COLUMN_MAPPINGS.speedUnit),
                    weightKg: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.weightKg)),
                    powerKw: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.powerKw)),
                    domesticPriceMin: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.domesticPriceMin)),
                    domesticPriceMax: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.domesticPriceMax)),
                    domesticPriceAvg: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.domesticPriceAvg)),
                    exportPriceMin: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.exportPriceMin)),
                    exportPriceMax: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.exportPriceMax)),
                    exportPriceAvg: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.exportPriceAvg)),
                    currency: 'INR',
                    operatingVoltage: findColumnValue(row, COLUMN_MAPPINGS.operatingVoltage),
                    phaseRequirement: findColumnValue(row, COLUMN_MAPPINGS.phaseRequirement),
                    startingLoadKw: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.startingLoadKw)),
                    runningLoadKw: parseNumber(findColumnValue(row, COLUMN_MAPPINGS.runningLoadKw)),
                    dimensionsP1: findColumnValue(row, COLUMN_MAPPINGS.dimensionsP1),
                    dimensionsP2: findColumnValue(row, COLUMN_MAPPINGS.dimensionsP2),
                    dimensionsP3: findColumnValue(row, COLUMN_MAPPINGS.dimensionsP3),
                    metadata: row,
                    sourceFile: file.name,
                    sourceType: sourceType,
                };

                productData.searchText = buildSearchText(productData, row);
                productData.tags = row.tags ? String(row.tags).split(',') : extractTags(productData);

                return productData;
            });

            const result = await prisma.machineProduct.createMany({
                data: productsToCreate,
                skipDuplicates: true,
            });

            totalRecords += result.count;
            processedFiles.push(file.name);
        }

        return NextResponse.json({
            success: true,
            message: `Imported ${totalRecords} products successfully.`,
            recordsProcessed: totalRecords,
            processedFiles: processedFiles,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error: any) {
        console.error('Import Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
