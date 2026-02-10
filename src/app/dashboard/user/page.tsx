"use client"
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'

type UserSummary = {
    email?: string | null
}

type UserProfile = Record<string, unknown>

export default function UserDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<UserSummary | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)

    useEffect(() => {
        api.get('/auth/me').then(res => setUser(res.data)).catch(() => router.push('/login'))
        api.get('/user/profile').then(res => setProfile(res.data)).catch(() => { })
    }, [router])

    const handleLogout = async () => {
        await api.post('/auth/logout')
        router.push('/login')
    }

    // Mock roles counts -- replace with API if available
    const roles = [
        { name: 'IT', count: 4 },
        { name: 'Sales', count: 12 },
        { name: 'Export', count: 2 },
        { name: 'Accounts', count: 3 },
    ]

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            User Dashboard
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">View your profile and assigned roles.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-semibold text-gray-800">{user?.email?.split('@')[0]}</div>
                            <div className="text-xs text-gray-500">{user?.email}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-lg font-medium transition-colors border border-red-200"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h2 className="text-xl font-semibold mb-2">Roles Overview</h2>
                    <p className="text-gray-600 mb-4">You can see how many people are assigned to each role.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {roles.map(r => (
                            <div key={r.name} className="p-4 border rounded text-center">
                                <div className="text-sm text-gray-500">{r.name}</div>
                                <div className="text-2xl font-bold">{r.count}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h3 className="text-lg font-semibold mb-2">Your Profile</h3>
                    <pre className="bg-gray-50 p-3 rounded text-sm">{JSON.stringify(profile || {}, null, 2)}</pre>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
                    <div className="text-gray-600">Request access, view your assignments, or contact admin.</div>
                </div>
            </div>
        </div>
    )
}
