import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const fileName = body?.fileName;

        if (fileName === undefined) {
            return NextResponse.json({ error: 'fileName is required.' }, { status: 400 });
        }

        if (fileName !== null && typeof fileName !== 'string') {
            return NextResponse.json({ error: 'fileName must be a string or null.' }, { status: 400 });
        }

        const where = fileName === null ? { fileName: null } : { fileName };
        const result = await prisma.knowledgeBase.deleteMany({ where });

        return NextResponse.json({ success: true, deleted: result.count });
    } catch (error) {
        console.error('Delete file error:', error);
        return NextResponse.json({ error: 'Failed to delete file records.' }, { status: 500 });
    }
}
