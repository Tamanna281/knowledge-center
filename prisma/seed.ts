// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // 1. Create Roles
  console.log('Creating roles...')

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      privileges: [
        'VIEW_TREE',
        'ADD_USER',
        'EDIT_USER',
        'DELETE_USER',
        'VIEW_ROLES',
        'MANAGE_ROLES',
        'VIEW_TRANSACTIONS',
        'ADD_TRANSACTION',
        'EDIT_TRANSACTION',
        'DELETE_TRANSACTION',
        'VIEW_ITEMNAME',
        'VIEW_CATEGORY',
        'VIEW_QUANTITY',
        'VIEW_UNITS',
        'VIEW_PRICE',
        'VIEW_TOTALCOST',
        'VIEW_PURCHASEDATE',
        'VIEW_SUPPLIER',
        'VIEW_BUYER'
      ]
    }
  })

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: {
      name: 'MANAGER',
      privileges: [
        'VIEW_TREE',
        'ADD_USER',
        'VIEW_TRANSACTIONS',
        'ADD_TRANSACTION',
        'VIEW_ITEMNAME',
        'VIEW_QUANTITY',
        'VIEW_PRICE',
        'VIEW_TOTALCOST',
        'VIEW_SUPPLIER',
        'VIEW_BUYER'
      ]
    }
  })

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      privileges: ['VIEW_TREE', 'VIEW_TRANSACTIONS']
    }
  })

  console.log('✅ Roles created')

  // 2. Create Admin User (ROOT of hierarchy - no manager)
  console.log('Creating admin user...')

  const hashedPassword = await bcrypt.hash('admin123', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      name: 'System Admin',
      password: hashedPassword,
      roleId: adminRole.id,
      managerId: null, // No manager - this is the root
      isActive: true,
      emailVerified: true
    }
  })

  console.log('✅ Admin user created')
  console.log('   📧 Email: admin@company.com')
  console.log('   🔑 Password: admin123')

  // 3. Create Sample Manager under Admin
  console.log('Creating sample hierarchy...')

  const manager1Password = await bcrypt.hash('manager123', 10)
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      name: 'Sales Manager',
      email: 'manager@company.com',
      phone: '+1234567890',
      password: manager1Password,
      roleId: managerRole.id,
      managerId: adminUser.id, // Reports to Admin
      isActive: true,
      emailVerified: true
    }
  })

  // 4. Create Sample Employee under Manager
  const employee1Password = await bcrypt.hash('user123', 10)
  await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: {},
    create: {
      name: 'Sales Representative',
      email: 'employee@company.com',
      password: employee1Password,
      roleId: userRole.id,
      managerId: manager1.id, // Reports to Manager
      isActive: true,
      emailVerified: true
    }
  })

  console.log('✅ Sample hierarchy created:')
  console.log('   🛡️  Admin')
  console.log('   └── 👤 Sales Manager')
  console.log('       └── 👤 Sales Representative')

  console.log('\n🎉 Database seeding completed!')
  console.log('\n📌 Login Credentials:')
  console.log('   Admin: admin@company.com / admin123')
  console.log('   Manager: manager@company.com / manager123')
  console.log('   Employee: employee@company.com / user123')
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
