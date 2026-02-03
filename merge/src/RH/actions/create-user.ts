// src/actions/create-user.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const managerId = formData.get('managerId') as string
  
  // === ROLE LOGIC ===
  const existingRoleId = formData.get('roleId') as string
  const newRoleName = formData.get('newRoleName') as string
  const privileges = formData.getAll('privilege') as string[] // Get all checked boxes

  // 1. Hash the password
  const hashedPassword = await bcrypt.hash(password, 10)

  let finalRoleId = existingRoleId

  // 2. If creating a NEW Role
  if (newRoleName) {
    const normalizedName = newRoleName.toUpperCase().trim()
    
    // Check if it exists (to prevent duplicates if they typed an existing name)
    const existingRole = await prisma.role.findUnique({
      where: { name: normalizedName }
    })

    if (existingRole) {
      finalRoleId = existingRole.id
    } else {
      // Create new role with the specific privileges checked
      const newRole = await prisma.role.create({
        data: {
          name: normalizedName,
          privileges: privileges // Save ["VIEW_TREE", "ADD_USER", etc.]
        }
      })
      finalRoleId = newRole.id
    }
  }

  // 3. Create User linked to the Role ID
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      roleId: finalRoleId,
      managerId: managerId || null,
    },
  })

  revalidatePath('/dashboard/hierarchy')
}