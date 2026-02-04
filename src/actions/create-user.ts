// src/actions/create-user.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcrypt'
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
  console.time('createUser')
  try {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const managerId = formData.get('managerId') as string

    // === ROLE LOGIC ===
    const existingRoleId = formData.get('roleId') as string
    const newRoleName = formData.get('newRoleName') as string
    const privileges = formData.getAll('privilege') as string[] // Get all checked boxes

    // === SECURITY: Prevent creating new ADMIN users ===
    if (newRoleName && newRoleName.trim().toUpperCase() === 'ADMIN') {
      throw new Error("Cannot create a new 'ADMIN' role. Only one admin is allowed.")
    }

    if (existingRoleId) {
      const targetRole = await prisma.role.findUnique({ where: { id: existingRoleId } })
      if (targetRole?.name === 'ADMIN') {
        throw new Error("Cannot assign 'ADMIN' role to new users. Only one admin is allowed.")
      }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      throw new Error(`Email ${email} is already registered. Please use a different email.`)
    }

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
            privileges: privileges // Save as array directly
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
    revalidatePath('/dashboard/admin')
    console.timeEnd('createUser')
  } catch (error: any) {
    console.timeEnd('createUser')
    console.error('Error creating user:', error)

    // Return error message instead of throwing
    if (error.message) {
      throw new Error(error.message)
    } else if (error.code === 'P2002') {
      throw new Error('Email is already in use. Please use a different email address.')
    } else {
      throw new Error('Failed to create user. Please try again.')
    }
  }
}
