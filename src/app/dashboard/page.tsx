import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/tokens'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
        redirect('/login')
    }

    let decoded: { userId: string; role?: string }
    try {
        decoded = verifyToken(token) as { userId: string; role?: string }
    } catch {
        redirect('/api/auth/logout')
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true }
    })

    if (!user) {
        redirect('/api/auth/logout')
    }

    // Automatically redirect to role-specific dashboard
    if (user.role.name === 'ADMIN') {
        redirect('/dashboard/admin')
    } else {
        redirect('/dashboard/user')
    }
}
