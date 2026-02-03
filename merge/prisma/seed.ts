// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Create ONLY the Admin Role
  // We give it 'ALL_ACCESS' so the code knows this role can do everything
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', privileges: ['ALL_ACCESS'] }
  })

  console.log("✅ ADMIN Role Created")

  // 2. Create the Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@papercup.com' },
    update: { name: 'Admin', roleId: adminRole.id },
    create: {
      email: 'admin@papercup.com',
      name: 'Admin',
      password: hashedPassword,
      roleId: adminRole.id,
    }
  })

  console.log("✅ Admin user created and linked to ADMIN role")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })