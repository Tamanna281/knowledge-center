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
  // 1. Fetch users AND their role data
  const allUsers = await prisma.user.findMany({
    include: { role: true }
  })

  const userMap = new Map<string, User>()

  // 2. Initialize map
  allUsers.forEach((user: any) => {
    userMap.set(user.id, { ...user, children: [] })
  })

  // 3. Build Tree
  const rootUsers: User[] = []

  allUsers.forEach((user: any) => {
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

  return rootUsers
}