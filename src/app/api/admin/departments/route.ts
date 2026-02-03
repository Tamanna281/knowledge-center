import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/tokens'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const decoded = verifyToken(token) as { userId: string; role: string }
        if (decoded.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const body = await req.json()
        const { name, branchId } = body

        if (!name || !branchId) return NextResponse.json({ error: 'Name and Branch ID are required' }, { status: 400 })

        const department = await prisma.department.create({
            data: {
                name,
                branchId
            }
        })

        return NextResponse.json(department)
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
