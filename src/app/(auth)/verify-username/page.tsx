"use client"
import { useState } from 'react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { useRouter, useSearchParams } from 'next/navigation'

export default function VerifyUsernamePage() {
    const router = useRouter()
    const search = useSearchParams()
    const identifier = search.get('identifier') || ''

    const [otp, setOtp] = useState('')
    const [type, setType] = useState(identifier.includes('@') ? 'EMAIL' : 'PHONE')
    const [username, setUsername] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/verify-otp-username', { identifier, otp, type })
            setUsername(res.data.username)
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Verification failed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Verify OTP to Recover Username</h2>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                {username ? (
                    <div className="text-center">
                        <p className="text-green-700 mb-4">Your username is:</p>
                        <div className="text-xl font-mono bg-gray-50 p-3 rounded">{username}</div>
                        <div className="mt-4">
                            <button className="text-blue-600 hover:underline" onClick={() => router.push('/login')}>Go to Login</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">One-Time Password ({type})</label>
                            <input
                                type="text"
                                required
                                className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 tracking-widest text-center"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
