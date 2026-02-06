// scripts/check-users.ts
// Check which tables contain user data
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== Checking User Tables ===\n')

    // Check User table
    const users = await prisma.user.findMany({
        include: { role: true }
    })

    console.log(`📋 User Table (${users.length} users):`)
    users.forEach(u => {
        console.log(`  - ${u.email} | ${u.name} (${u.username || 'no username'}) | Role: ${u.role.name} | Active: ${u.isActive}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
