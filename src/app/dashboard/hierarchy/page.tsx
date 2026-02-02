// src/app/dashboard/hierarchy/page.tsx
import { getHierarchy } from '@/actions/hierarchy'
import OrgNode from '@/components/hierarchy/OrgNode'
import TreeContext from '@/components/hierarchy/TreeContext'
import SearchInput from '@/components/hierarchy/SearchInput'
import { prisma } from '@/lib/prisma' // <--- 1. Import Prisma

// Next.js 15 needs `searchParams` to be awaited
type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Page({ searchParams }: Props) {
  const tree = await getHierarchy()
  
  // 2. Fetch Roles History (for the dropdown)
  const roles = await prisma.role.findMany({ 
    select: { id: true, name: true },
    orderBy: { name: 'asc' } 
  })

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
          {tree.length === 0 ? (
            <p className="text-gray-500">No users found.</p>
          ) : (
            <TreeContext>
              {tree.map(rootUser => (
                <OrgNode 
                  key={rootUser.id} 
                  node={rootUser as any} 
                  isLast={true} 
                  searchQuery={query}
                  existingRoles={roles} // <--- 3. Pass the roles list down here
                />
              ))}
            </TreeContext>
          )}
        </div>
      </div>
    </main>
  )
}