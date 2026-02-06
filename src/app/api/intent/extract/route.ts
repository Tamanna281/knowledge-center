// src/app/api/intent/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractStructuredData } from '@/lib/gemini';
import {
    ExtractedIntentSchema,
    validateIntent,
    type ExtractedIntent
} from '@/lib/intent-extraction';
import { INTENT_EXTRACTION_SYSTEM_PROMPT } from '@/lib/prompts/intent-extraction-prompt';

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { question } = body;

        // Validate input
        if (!question || typeof question !== 'string' || question.trim() === '') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Question is required and must be a non-empty string'
                },
                { status: 400 }
            );
        }

        console.log('📥 Extracting intent for question:', question);

        // Step 1: Call Gemini to extract intent
        const rawIntent = await extractStructuredData<ExtractedIntent>(
            question,
            INTENT_EXTRACTION_SYSTEM_PROMPT,
            {
                temperature: 0.1, // Low temperature for consistent structured output
                maxOutputTokens: 512,
            }
        );

        // Heuristic: if the user's question doesn't contain data keywords, treat as unsupported
        const isLikelyDataQuestion = (q: string) => {
            const lc = q.toLowerCase();
            
            // Explicit non-data patterns
            const nonDataPatterns = ['company vision', 'how do i', 'tell me about', 'what is the company'];
            for (const p of nonDataPatterns) {
                if (lc.includes(p)) return false;
            }

            const dataKeywords = ['total', 'sum', 'average', 'avg', 'max', 'min', 'count', 'by', 'sales', 'orders', 'products', 'customers', 'revenue', 'quantity', 'price', 'total amount'];
            return dataKeywords.some(k => lc.includes(k));
        };

        if (!isLikelyDataQuestion(question) && rawIntent && !('unsupported' in rawIntent)) {
            console.log('ℹ️ Question appears non-data; overriding to unsupported');
            return NextResponse.json({ success: true, intent: { unsupported: true } });
        }

        console.log('🤖 Raw Gemini output:', JSON.stringify(rawIntent, null, 2));

        // Step 2: Validate with Zod schema
        const zodValidation = ExtractedIntentSchema.safeParse(rawIntent);

        if (!zodValidation.success) {
            console.error('❌ Zod validation failed:', zodValidation.error);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid intent structure',
                    details: zodValidation.error.format(),
                },
                { status: 422 }
            );
        }

        const validatedIntent = zodValidation.data;

        // Step 3: Apply business logic validation (metric vs table)
        const businessValidation = validateIntent(validatedIntent);

        if (!businessValidation.valid) {
            console.error('❌ Business validation failed:', businessValidation.error);
            return NextResponse.json(
                {
                    success: false,
                    error: businessValidation.error,
                },
                { status: 422 }
            );
        }

        console.log('✅ Intent validated successfully');

        // Return successful response
        return NextResponse.json({
            success: true,
            intent: validatedIntent,
        });

    } catch (error: any) {
        console.error('❌ Intent extraction error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to extract intent',
                message: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
