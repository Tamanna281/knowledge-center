"use client"
import { useState } from 'react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
// GoogleLogin removed


export default function LoginPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            // use email/password authentication
            const response = await api.post('/auth/login', { identifier: formData.email, password: formData.password })

            // Get user role from response
            const userRole = response.data.user?.role

            // Redirect based on role
            if (userRole === 'ADMIN') {
                router.push('/dashboard/admin')
            } else {
                router.push('/dashboard/user')
            }
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Login failed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Welcome Back</h2>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <div className="relative mt-1">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="w-full p-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                {/* Google login removed */}
                <div className="mt-4 flex justify-between text-sm">
                    <Link href="/signup" className="text-blue-600 hover:underline">Create Account</Link>
                    <div className="flex space-x-4">
                        <Link href="/forgot-password" className="text-gray-500 hover:underline">Forgot Password?</Link>
                        <Link href="/forgot-username" className="text-gray-500 hover:underline">Forgot Username?</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
