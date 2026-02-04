import { NextResponse } from 'next/server'

// Department model has been removed from schema.prisma
export async function POST() {
    return NextResponse.json({ error: 'Department model has been removed from schema' }, { status: 501 })
}
