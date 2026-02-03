'use server'

import { prisma } from '@/lib/prisma' // <--- IMPORT FROM LIB
import { revalidatePath } from 'next/cache'

export async function deleteUser(userId: string) {
  try {
    await prisma.user.updateMany({
      where: { managerId: userId },
      data: { managerId: null } 
    })

    await prisma.user.delete({
      where: { id: userId }
    })
    
    revalidatePath('/dashboard/admin')
  } catch (error) {
    console.error("Failed to delete user:", error)
  }
}
