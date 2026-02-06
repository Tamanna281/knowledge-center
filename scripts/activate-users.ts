// scripts/activate-users.ts
// Run this script to activate all inactive users in development
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Activating all inactive users...')

    const result = await prisma.user.updateMany({
        where: {
            isActive: false
        },
        data: {
            isActive: true,
            emailVerified: true,
            phoneVerified: true
        }
    })

    console.log(`✅ Activated ${result.count} users`)

    // Show all users
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            username: true,
            isActive: true,
            role: {
                select: {
                    name: true
                }
            }
        }
    })

    console.log('\nAll users:')
    users.forEach(u => {
        console.log(`  - ${u.email} (${u.username || u.name}) - ${u.role.name} - Active: ${u.isActive}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
