// scripts/delete-user-by-email.ts
// Delete a user by email to allow re-signup
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Change this to the email you want to delete
    const emailToDelete = process.argv[2]

    if (!emailToDelete) {
        console.error('❌ Please provide an email address as argument')
        console.log('Usage: npx tsx scripts/delete-user-by-email.ts your@email.com')
        process.exit(1)
    }

    console.log(`🗑️ Deleting user with email: ${emailToDelete}\n`)

    // Delete from User table
    const deletedUser = await prisma.user.deleteMany({
        where: { email: emailToDelete }
    })

    console.log(`✅ Deleted ${deletedUser.count} user(s) from User table`)

    console.log('\n✨ Done! You can now signup with this email again.')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
