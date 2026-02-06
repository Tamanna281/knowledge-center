// src/app/actions/update-user.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateUser(userId: string, formData: FormData) {
    const name = formData.get('name') as string
    const roleName = formData.get('role') as string

    // 1. Find or Create the Role
    const normalizedRole = roleName.toUpperCase().trim()

    let role = await prisma.role.findUnique({
        where: { name: normalizedRole }
    })

    if (!role) {
        role = await prisma.role.create({
            data: {
                name: normalizedRole,
                privileges: [] // Default empty privileges for new roles
            }
        })
    }

    // 2. Update User with new Role ID
    await prisma.user.update({
        where: { id: userId },
        data: {
            name,
            roleId: role.id
        }
    })

    revalidatePath('/dashboard/hierarchy')
}
