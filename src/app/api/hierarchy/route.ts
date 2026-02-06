// src/app/api/hierarchy/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/tokens'
import { cookies } from 'next/headers'

export async function GET() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const decoded = verifyToken(token) as { userId: string; role: string }

        // Get user with their role and privileges
        const currentUser = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true }
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const userPrivileges = currentUser.role?.privileges || []

        // Check if user has VIEW_TREE privilege or is ADMIN
        const canViewTree = decoded.role === 'ADMIN' || userPrivileges.includes('VIEW_TREE')

        if (!canViewTree) {
            return NextResponse.json({
                error: 'Access denied. You need VIEW_TREE privilege to access this page.'
            }, { status: 403 })
        }

        // ===== ORGANIZATION-SPECIFIC FILTERING =====
        // Helper: Recursively get all users under a manager
        function getUsersInTree(managerId: string | null, allUsers: any[]): Set<string> {
            const userIds = new Set<string>()
            const directReports = allUsers.filter(u => u.managerId === managerId)

            for (const user of directReports) {
                userIds.add(user.id)
                const subordinates = getUsersInTree(user.id, allUsers)
                subordinates.forEach(id => userIds.add(id))
            }

            return userIds
        }

        // Fetch ALL users
        const allUsers = await prisma.user.findMany({
            include: { role: true }
        })

        // Filter users based on organization
        let users: any[]

        if (currentUser.role?.name === 'ADMIN' && currentUser.managerId === null) {
            // ADMIN with no manager = root of their own organization
            // Only show users in THEIR tree
            const allowedUserIds = getUsersInTree(currentUser.id, allUsers)
            allowedUserIds.add(currentUser.id) // Include self

            users = allUsers.filter(u => allowedUserIds.has(u.id))

            console.log(`🔹 Admin ${currentUser.email} viewing their org: ${users.length} user(s)`)
        } else {
            // Non-root users see all
            users = allUsers
        }

        // Build hierarchy tree
        const userMap = new Map()
        users.forEach(u => {
            userMap.set(u.id, {
                id: u.id,
                name: u.username || u.name || u.email,
                email: u.email,
                role: { name: u.role?.name || 'Unknown' },
                managerId: u.managerId,
                children: []
            })
        })

        const roots: any[] = []
        userMap.forEach((user) => {
            if (user.managerId && userMap.has(user.managerId)) {
                userMap.get(user.managerId).children.push(user)
            } else {
                roots.push(user)
            }
        })

        // Fetch roles for dropdown (only if user can add users)
        const canAddUser = decoded.role === 'ADMIN' || userPrivileges.includes('ADD_USER')
        let roles: any[] = []
        if (canAddUser) {
            roles = await prisma.role.findMany({
                select: { id: true, name: true }
            })
        }

        return NextResponse.json({
            hierarchy: roots,
            roles,
            userPrivileges,
            currentUserRole: decoded.role,
            currentUserId: decoded.userId
        })

    } catch (error) {
        console.error('Error in /api/hierarchy:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
