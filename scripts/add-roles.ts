
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Adding extra roles...')

    const roles = [
        {
            name: 'SENIOR MANAGER',
            privileges: [
                'VIEW_TREE',
                'ADD_USER',
                'EDIT_USER',
                'VIEW_TRANSACTIONS',
                'ADD_TRANSACTION',
                'EDIT_TRANSACTION',
                'VIEW_ITEMNAME',
                'VIEW_QUANTITY',
                'VIEW_PRICE',
                'VIEW_TOTALCOST',
                'VIEW_SUPPLIER',
                'VIEW_BUYER'
            ]
        },
        {
            name: 'EMPLOYEE',
            privileges: ['VIEW_TREE', 'VIEW_TRANSACTIONS']
        },
        {
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
    ]

    for (const r of roles) {
        const role = await prisma.role.upsert({
            where: { name: r.name },
            update: {}, // Don't overwrite privileges if exists, strictly
            create: {
                name: r.name,
                privileges: r.privileges
            }
        })
        console.log(`Role ${r.name} ensured (ID: ${role.id})`)
    }

    console.log('Done.')
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
