"use client"
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'
import OrgNode from '@/components/hierarchy/OrgNode'
import AddUserForm from '@/components/hierarchy/AddUserForm'
import TreeContext from '@/components/hierarchy/TreeContext'
import BackButton from '@/components/BackButton'



type RoleOption = {
    id: string
    name: string
    privileges?: string
}

type AdminUser = {
    id: string
    username: string
    email: string
    role: string
    managerId?: string | null
}

type AdminStats = {
    totalUsers: number
    byRole: Record<string, number>
    users: any[]
    roles: RoleOption[]
}

type OrgUser = {
    id: string
    name: string
    email: string
    role: { name: string }
    managerId?: string | null
    children: OrgUser[]
}

export default function AdminDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<AdminUser | null>(null)
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [hierarchy, setHierarchy] = useState<OrgUser[]>([])
    const [roles, setRoles] = useState<RoleOption[]>([])

    // Data Refresh trigger
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        api.get('/auth/me').then(res => setUser(res.data)).catch(() => router.push('/login'))

        api.get('/admin/stats').then(res => {
            const data = res.data
            setStats(data)
            setRoles(data.roles || [])

            // Build Hierarchy
            const users = data.users || []
            const userMap = new Map<string, OrgUser>()

            // 1. Initialize nodes
            users.forEach((u: any) => {
                userMap.set(u.id, {
                    ...u,
                    name: u.username || u.email || 'Unknown',
                    role: { name: u.role?.name || u.role },
                    children: []
                })
            })

            // 2. Build tree
            const roots: OrgUser[] = []
            userMap.forEach(node => {
                if (node.managerId && userMap.has(node.managerId)) {
                    userMap.get(node.managerId)?.children.push(node)
                } else {
                    roots.push(node)
                }
            })

            setHierarchy(roots)
        }).catch((err) => {
            console.error(err)
        })
    }, [router, refreshKey])

    const handleLogout = async () => {
        await api.post('/auth/logout')
        router.push('/login')
    }



    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl p-6 rounded-xl shadow-2xl border border-white/10">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                                Admin Dashboard
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Manage organization, users, and structure.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-semibold text-white">{user?.username}</div>
                            <div className="text-xs text-slate-400">{user?.email}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-5 py-2.5 rounded-lg font-medium transition-colors border border-red-500/20"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Legacy Hierarchy View */}
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-xl shadow-2xl border border-white/10 overflow-x-auto">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <span className="w-2 h-8 bg-purple-500 rounded mr-3"></span>
                        Organization Hierarchy
                    </h3>
                    <div className="min-w-[800px]">
                        <TreeContext>
                            {hierarchy.length === 0 ? (
                                <div className="p-8 border-2 border-dashed border-white/10 rounded-xl text-center bg-white/5">
                                    <p className="text-slate-400 mb-4 text-lg">No hierarchy found.</p>
                                    <div className="inline-block text-left">
                                        <AddUserForm managerId="" existingRoles={roles} />
                                    </div>
                                </div>
                            ) : (
                                hierarchy.map((node) => (
                                    <OrgNode
                                        key={node.id}
                                        node={node}
                                        existingRoles={roles}
                                    />
                                ))
                            )}
                        </TreeContext>
                    </div>
                </div>
            </div>
        </div>
    )
}
