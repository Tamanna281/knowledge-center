// src/actions/update-user.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyToken } from '@/lib/tokens'
import { cookies } from 'next/headers'

export async function updateUser(userId: string, formData: FormData) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) throw new Error('Unauthorized')

    const currentUser = verifyToken(token) as { userId: string, role: string }
    const adminEmail = 'bhavya.jn2804@gmail.com'

    // 1. Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    })

    if (!targetUser) {
      throw new Error('User not found. They may have been deleted.')
    }

    // 2. Permission Logic
    if (currentUser.role !== 'ADMIN') {
      if (currentUser.role === 'MANAGER') {
        if (targetUser.managerId !== currentUser.userId) {
          throw new Error('You can only update users who report directly to you.')
        }
        if (targetUser.role.name === 'ADMIN' || targetUser.role.name === 'MANAGER') {
          throw new Error('You do not have permission to modify this user.')
        }
      } else {
        throw new Error('You do not have permission to update users.')
      }
    }

    const name = formData.get('name') as string
    const roleName = formData.get('role') as string

    // 3. Prevent Promoting to ADMIN
    const normalizedRole = roleName.toUpperCase().trim()
    if (normalizedRole === 'ADMIN' && targetUser.role.name !== 'ADMIN') {
      throw new Error("Cannot promote user to 'ADMIN'. Only one admin is allowed.")
    }

    // 4. Find or Create the Role
    let role = await prisma.role.findUnique({
      where: { name: normalizedRole }
    })

    if (!role) {
      role = await prisma.role.create({
        data: { name: normalizedRole, privileges: [] }
      })
    }

    // 5. Update User
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        roleId: role.id
      }
    })

    revalidatePath('/dashboard/admin')
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new Error('Update failed: The user no longer exists.')
    }
    console.error('Error updating user:', error)
    if (error.message) throw new Error(error.message)
    throw new Error('An unexpected error occurred during update.')
  }
}
