// src/actions/hierarchy.ts
'use server'

import { prisma } from '@/lib/prisma'

type User = {
  id: string
  name: string
  role: { name: string } // The shape matches the Prisma include
  managerId: string | null
  children?: User[]
}

export async function getHierarchy() {
  console.log('🔍 Fetching hierarchy...')

  try {
    // 1. Fetch users AND their role data
    const allUsers = await prisma.user.findMany({
      include: { role: true }
    })

    console.log(`📊 Found ${allUsers.length} users in database`)

    if (allUsers.length === 0) {
      console.warn('⚠️ No users found in database! Did you run the seed script?')
      return []
    }

    const userMap = new Map<string, User>()

    // 2. Initialize map
    allUsers.forEach(user => {
      userMap.set(user.id, { ...user, children: [] })
    })

    // 3. Build Tree
    const rootUsers: User[] = []

    allUsers.forEach(user => {
      const userWithChildren = userMap.get(user.id)!

      if (user.managerId) {
        const manager = userMap.get(user.managerId)
        if (manager) {
          manager.children?.push(userWithChildren)
        }
      } else {
        rootUsers.push(userWithChildren)
      }
    })

    console.log(`🌳 Built hierarchy with ${rootUsers.length} root users`)
    return { tree: rootUsers, totalUsers: allUsers.length }
  } catch (error) {
    console.error('❌ Error fetching hierarchy:', error)
    throw error
  }
}