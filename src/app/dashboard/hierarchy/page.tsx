// src/app/dashboard/hierarchy/page.tsx
import { getHierarchy } from '@/actions/hierarchy'

export const dynamic = 'force-dynamic'
import OrgNode from '@/components/hierarchy/OrgNode'
import TreeContext from '@/components/hierarchy/TreeContext'
import SearchInput from '@/components/hierarchy/SearchInput'
import { prisma } from '@/lib/prisma'

// Next.js 15 needs `searchParams` to be awaited
type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Page({ searchParams }: Props) {
    let tree: any[] = []
    let errorMessage: string | null = null

    try {
        const result = await getHierarchy()
        tree = result.tree
        console.log('✅ Hierarchy loaded, tree length:', tree.length)
    } catch (error: any) {
        console.error('❌ Failed to fetch hierarchy:', error)
        errorMessage = error.message || 'Unknown error'
    }

    // 2. Fetch Roles (for the dropdown in AddUserForm)
    let roles: any[] = []
    try {
        roles = await prisma.role.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
    } catch (error) {
        console.warn('Failed to fetch roles', error)
    }

    // Await params for Next.js 15+ compatibility
    const params = await searchParams
    const query = typeof params.q === 'string' ? params.q : ''

    return (
        <main className="min-h-screen bg-gray-50 p-10">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Role Hierarchy</h1>
                </div>

                {/* Search Bar */}
                <SearchInput />

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[500px] overflow-auto">
                    {errorMessage ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded">
                            <p className="text-red-700 font-semibold">Error loading hierarchy:</p>
                            <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
                        </div>
                    ) : tree.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">No hierarchy found.</p>
                            <p className="text-gray-400 text-sm mb-2">Run the database seed script to create initial users:</p>
                            <code className="text-xs bg-gray-100 px-3 py-1.5 rounded block max-w-2xl mx-auto">
                                npx ts-node --compiler-options {'{"module":"CommonJS"}'} prisma/seed.ts
                            </code>
                        </div>
                    ) : (
                        <TreeContext>
                            {tree.map(rootUser => (
                                <OrgNode
                                    key={rootUser.id}
                                    node={rootUser as any}
                                    isLast={true}
                                    searchQuery={query}
                                    existingRoles={roles}
                                />
                            ))}
                        </TreeContext>
                    )}
                </div>
            </div>
        </main>
    )
}
