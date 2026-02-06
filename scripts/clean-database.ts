// scripts/clean-database.ts
// Clean up all users and reset to fresh state
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Cleaning database...\n')

    // Delete all OTPs
    const deletedOtps = await prisma.otp.deleteMany({})
    console.log(`✅ Deleted ${deletedOtps.count} OTP records`)

    // Delete all users
    const deletedUsers = await prisma.user.deleteMany({})
    console.log(`✅ Deleted ${deletedUsers.count} users from User table`)

    console.log('\n✨ Database cleaned! Run `npm run seed` to add fresh test data.')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
