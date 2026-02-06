
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Cleaning up extra admins...')

    // The ONE true admin email
    const TRUE_ADMIN_EMAIL = 'admin@company.com'

    // Find all users with ADMIN role
    const admins = await prisma.user.findMany({
        where: {
            role: {
                name: 'ADMIN'
            }
        },
        include: { role: true }
    })

    console.log(`Found ${admins.length} admins.`)

    for (const admin of admins) {
        if (admin.email !== TRUE_ADMIN_EMAIL) {
            console.log(`Demoting/Deleting extra admin: ${admin.email} (${admin.name})`)

            // Option 1: Delete them (simplest for cleanup)
            // Option 2: Demote to USER

            // We will DELETE them to strictly enforce "One Admin" and remove the test garbage
            await prisma.user.delete({
                where: { id: admin.id }
            })
            console.log('Deleted.')
        } else {
            console.log(`Keeping TRUE admin: ${admin.email}`)
        }
    }

    console.log('Cleanup complete.')
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
