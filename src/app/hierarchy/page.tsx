"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import axios from 'axios'
import TreeContext from '@/components/hierarchy/TreeContext'
import OrgNode from '@/components/hierarchy/OrgNode'
import AddUserForm from '@/components/hierarchy/AddUserForm'

type OrgUser = {
    id: string
    name: string
    email: string
    role: { name: string }
    managerId?: string | null
    children: OrgUser[]
}

type RoleOption = {
    id: string
    name: string
}

export default function HierarchyPage() {
    const router = useRouter()
    const [hierarchy, setHierarchy] = useState<OrgUser[]>([])
    const [roles, setRoles] = useState<RoleOption[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchHierarchy()
    }, [])

    const fetchHierarchy = async () => {
        try {
            const response = await axios.get('/api/admin/stats', {
                withCredentials: true
            })
            const { users, roles: fetchedRoles } = response.data

            // Build hierarchy
            const userMap = new Map<string, OrgUser>()

            // Initialize nodes
            users.forEach((u: any) => {
                userMap.set(u.id, {
                    ...u,
                    name: u.username || u.email || 'Unknown',
                    email: u.email,
                    role: { name: u.role?.name || u.role },
                    children: []
                })
            })

            // Build tree
            const roots: OrgUser[] = []
            userMap.forEach((user) => {
                if (user.managerId && userMap.has(user.managerId)) {
                    userMap.get(user.managerId)!.children.push(user)
                } else {
                    roots.push(user)
                }
            })

            setHierarchy(roots)
            setRoles(fetchedRoles || [])
            setLoading(false)
        } catch (error) {
            console.error('Failed to fetch hierarchy:', error)
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="flex items-center gap-3 text-xl text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Loading hierarchy...
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white transition-all hover:bg-white/20"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            Back to Home
                        </button>
                        <h1 className="text-4xl font-bold text-white">Organization Hierarchy</h1>
                    </div>
                </div>

                {/* Hierarchy Tree - Full Width */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-xl">
                    <h2 className="mb-6 text-2xl font-semibold text-white">
                        Organizational Structure
                    </h2>

                    <div className="min-h-[400px]">
                        <TreeContext>
                            {hierarchy.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center">
                                    <div className="mb-4 text-slate-400">
                                        <p className="mb-2 text-lg">No hierarchy data available</p>
                                        <p className="text-sm">Add users to see the organizational structure</p>
                                    </div>
                                    <AddUserForm managerId="" existingRoles={roles} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {hierarchy.map((node) => (
                                        <OrgNode
                                            key={node.id}
                                            node={node}
                                            existingRoles={roles}
                                        />
                                    ))}
                                </div>
                            )}
                        </TreeContext>
                    </div>
                </div>
            </div>
        </div>
    )
}
