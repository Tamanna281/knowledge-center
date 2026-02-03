'use client'

import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function LogoutButton() {
    const router = useRouter()

    const handleLogout = async () => {
        try {
            await api.post('/logout')
        } catch {
            // ignore
        } finally {
            router.push('/login')
            router.refresh() // Ensure server components re-render if needed
        }
    }

    return (
        <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
        >
            Logout
        </button>
    )
}
