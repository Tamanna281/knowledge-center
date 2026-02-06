import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/tokens'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'


export async function GET() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const decoded = verifyToken(token) as { userId: string; role: string }
        if (decoded.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const totalUsers = await prisma.user.count()
        const users = await prisma.user.findMany({
            include: {
                role: true
            }
        })

        // Group by role for summary
        const byRole = users.reduce((acc, user) => {
            const roleName = user.role?.name || 'Unknown'
            acc[roleName] = (acc[roleName] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const roles = await prisma.role.findMany({
            select: { id: true, name: true, privileges: true }
        })

        return NextResponse.json({
            totalUsers,
            byRole,
            users,
            roles
        })

    } catch (error) {
        console.error('Error in /api/admin/stats:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
