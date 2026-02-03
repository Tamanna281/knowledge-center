'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function deleteUser(userId: string) {
    try {
        // First, reassign any subordinates to have no manager
        await prisma.user.updateMany({
            where: { managerId: userId },
            data: { managerId: null }
        })

        // Then delete the user
        await prisma.user.delete({
            where: { id: userId }
        })

        revalidatePath('/dashboard/hierarchy')
    } catch (error) {
        console.error("Failed to delete user:", error)
    }
}
