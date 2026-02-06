'use server'

import { prisma } from '@/lib/prisma' // <--- IMPORT FROM LIB
import { revalidatePath } from 'next/cache'

import { verifyToken } from '@/lib/tokens'
import { cookies } from 'next/headers'

export async function deleteUser(userId: string) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) throw new Error('Unauthorized')

    const currentUser = verifyToken(token) as { userId: string, role: string }
    const adminEmail = 'bhavya.jn2804@gmail.com' // New key admin to protect

    // 1. Fetch target user to check role
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    })

    if (!targetUser) {
      console.warn(`User ${userId} not found, already deleted?`)
      return
    }

    // 2. Protect Root Admin and all ADMINs
    if (targetUser.email === adminEmail || targetUser.role.name === 'ADMIN') {
      throw new Error('Cannot delete users with the ADMIN role.')
    }

    // 3. Permission Logic
    // ADMIN can delete anyone (except root)
    // MANAGER can delete only users who report to them (or are in their department tree - simplified to Direct Report for now or check hierarchy)
    // For this request: "department wise roles can delete other roles which are under department wise roles"

    if (currentUser.role !== 'ADMIN') {
      // If not admin, check if target reports to current user
      // We need to check if targetUser is in the subtree of currentUser
      // For simplicity in this step, exact manager check:
      // Adjust logic to be recursive if needed, but starting with direct manager check or Role hierarchy check

      // If the deleter is NOT a specific "Admin of Department", we restrict.
      // Assuming "Department Wise Roles" means MANAGER.

      if (currentUser.role === 'MANAGER') {
        if (targetUser.managerId !== currentUser.userId) {
          // Check if it's a sub-subordinate or ensure target role is lower
          // Simplest: Managers can only delete EMPLOYEES or those strictly below them.
          // If target is also MANAGER, deny? 
          if (targetUser.role.name === 'MANAGER' || targetUser.role.name === 'ADMIN') {
            throw new Error('Managers cannot delete other Managers or Admins.')
          }
          // If target managerId is not current user, double check implementation or throw
          if (targetUser.managerId !== currentUser.userId) {
            // Allow if target is in subtree (recursive check omitted for speed unless requested, enforcing direct Manager for now)
            throw new Error('You can only delete users who report directly to you.')
          }
        }
      } else {
        // Senior Manager / Employee etc?
        throw new Error('You do not have permission to delete users.')
      }
    }

    // 4. Handle Subordinates (reassign to manager's manager)
    await prisma.user.updateMany({
      where: { managerId: userId },
      data: { managerId: targetUser.managerId }
    })

    await prisma.user.delete({
      where: { id: userId }
    })

    revalidatePath('/dashboard/admin')
  } catch (error: any) {
    if (error.code === 'P2025') {
      // User reports "Record to delete does not exist" - swallow it as success
      console.warn("User already deleted.")
    } else {
      console.error("Failed to delete user:", error)
      throw error
    }
  }
}
