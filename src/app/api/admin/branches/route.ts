import { NextResponse } from 'next/server'

// Branch model has been removed from schema.prisma
export async function POST() {
    return NextResponse.json({ error: 'Branch model has been removed from schema' }, { status: 501 })
}
