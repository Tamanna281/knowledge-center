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
      privileges: 'VIEW_TREE,ADD_USER,EDIT_USER,DELETE_USER,VIEW_ROLES,MANAGE_ROLES,VIEW_TRANSACTIONS,ADD_TRANSACTION,EDIT_TRANSACTION,DELETE_TRANSACTION,ItemName,Category,Quantity,Units,Price,TotalCost,PurchaseDate,Supplier,Buyer'
    }
  })

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: {
      name: 'MANAGER',
      privileges: 'VIEW_TREE,ADD_USER,VIEW_TRANSACTIONS,ADD_TRANSACTION,ItemName,Quantity,Price,TotalCost,Supplier,Buyer'
    }
  })

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      privileges: 'VIEW_TREE,VIEW_TRANSACTIONS'
    }
  })

  const dataAnalystRole = await prisma.role.upsert({
    where: { name: 'DATA_ANALYST' },
    update: {},
    create: {
      name: 'DATA_ANALYST',
      privileges: 'VIEW_TREE,VIEW_TRANSACTIONS,ADD_TRANSACTION,ItemName,Quantity,Price,PurchaseDate,Supplier,Buyer,TotalCost'
    }
  })

  console.log('✅ Roles created')

  // 2. Create Default Admin in Admin table (separate from users)
  console.log('Creating default admin...')

  const hashedAdminPassword = await bcrypt.hash('admin123', 10)

  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      phoneNumber: '+1234567890',
      password: hashedAdminPassword,
      isActive: true
    }
  })

  console.log('✅ Default Admin created')
  console.log('   Username: admin')
  console.log('   Password: admin123')

  // 3. Create Admin User (for hierarchy purposes)
  const hashedPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@papercup.com' },
    update: { name: 'Admin', roleId: adminRole.id },
    create: {
      username: 'adminuser',
      email: 'admin@papercup.com',
      name: 'Admin',
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
      emailVerified: true
    }
  })

  console.log('✅ Admin user linked to ADMIN role')

  // 4. Create Sample Users with Hierarchy
  console.log('Creating sample hierarchy...')

  const manager1Password = await bcrypt.hash('manager123', 10)
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager1@example.com' },
    update: {},
    create: {
      username: 'manager1',
      name: 'Sales Manager',
      email: 'manager1@example.com',
      phone: '+2222222222',
      password: manager1Password,
      roleId: managerRole.id,
      isActive: true,
      emailVerified: true
    }
  })

  const employee1Password = await bcrypt.hash('user123', 10)
  await prisma.user.upsert({
    where: { email: 'employee1@example.com' },
    update: {},
    create: {
      username: 'employee1',
      name: 'Sales Rep 1',
      email: 'employee1@example.com',
      password: employee1Password,
      roleId: userRole.id,
      managerId: manager1.id,
      isActive: true,
      emailVerified: true
    }
  })

  const employee2Password = await bcrypt.hash('user123', 10)
  await prisma.user.upsert({
    where: { email: 'employee2@example.com' },
    update: {},
    create: {
      username: 'employee2',
      name: 'Sales Rep 2',
      email: 'employee2@example.com',
      password: employee2Password,
      roleId: userRole.id,
      managerId: manager1.id,
      isActive: true,
      emailVerified: true
    }
  })

  console.log('✅ Sample users created with hierarchy')
  console.log('🎉 Database seeding completed!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
