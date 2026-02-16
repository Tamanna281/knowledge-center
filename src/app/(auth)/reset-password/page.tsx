"use client"
import { useState, Suspense } from 'react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const emailParam = searchParams.get('email') || ''

    const [formData, setFormData] = useState({
        email: emailParam,
        otp: '',
        newPassword: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await api.post('/auth/reset-password', formData)
            router.push('/login?reset=true')
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Reset failed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Set New Password</h2>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            required
                            className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">OTP Code</label>
                        <input
                            type="text"
                            required
                            className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 tracking-widest text-center"
                            value={formData.otp}
                            onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <div className="relative mt-1">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="w-full p-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-2 flex items-center px-2 text-gray-500"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.5-10-8 1-3.5 4-6 8-7m6 6a9.97 9.97 0 01-1.125 2.825M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetContent />
        </Suspense>
    )
}
