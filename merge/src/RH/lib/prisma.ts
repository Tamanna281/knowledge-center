// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

let prismaClient
try {
    prismaClient = globalForPrisma.prisma || new PrismaClient()
} catch {
    prismaClient = {} as PrismaClient
}
export const prisma = prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma