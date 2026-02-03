// src/actions/move-user.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function moveUser(userId: string, newManagerId: string) {
  if (userId === newManagerId) return // Can't report to yourself

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { managerId: newManagerId }
    })
    revalidatePath('/dashboard/admin')
  } catch (error) {
    console.error("Failed to move user", error)
    // In a real app, you'd check for circular dependency errors here
  }
}
