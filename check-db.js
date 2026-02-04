
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDb() {
    try {
        console.log('Checking database content...')
        const users = await prisma.user.findMany({
            include: { role: true }
        })
        console.log(`Found ${users.length} users:`)
        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}) Role: ${u.role?.name} ManagerId: ${u.managerId}`)
        })

        if (users.length === 0) {
            console.log('❌ Database is empty!')
        } else {
            console.log('✅ Database has data.')
        }
    } catch (e) {
        console.error('❌ Error querying database:', e)
    } finally {
        await prisma.$disconnect()
    }
}

checkDb()
