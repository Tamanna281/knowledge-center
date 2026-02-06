"use client"
import { useState, Suspense, useEffect } from 'react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { useRouter, useSearchParams } from 'next/navigation'

function VerifyContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const userId = searchParams?.get('userId')

    const [otp, setOtp] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState('EMAIL') // EMAIL or PHONE
    const [timeLeft, setTimeLeft] = useState(60)

    // Timer effect
    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
            return () => clearTimeout(timerId)
        }
    }, [timeLeft])

    const handleResend = async () => {
        if (timeLeft > 0) return
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            await api.post('/auth/resend-otp', { userId, type })
            setSuccess('OTP Resent!')
            setTimeLeft(60)
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Resend failed'))
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await api.post('/auth/verify-otp', { userId, otp, type })
            router.push('/login?verified=true')
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Verification failed'))
        } finally {
            setLoading(false)
        }
    }

    if (!userId) return <div className="p-4 text-center">Missing User ID</div>

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Verify OTP</h2>
                <div className="flex justify-center mb-4 space-x-4">
                    <button
                        onClick={() => setType('EMAIL')}
                        className={`px-3 py-1 rounded text-sm ${type === 'EMAIL' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                    >Email</button>
                    <button
                        onClick={() => setType('PHONE')}
                        className={`px-3 py-1 rounded text-sm ${type === 'PHONE' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                    >Phone</button>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">One-Time Password ({type})</label>
                        <input
                            type="text"
                            required
                            className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 tracking-widest text-center text-lg"
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
                        {loading && !success ? 'Verifying...' : 'Verify'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={handleResend}
                        disabled={timeLeft > 0 || loading}
                        className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                        {timeLeft > 0 ? `Resend code in ${timeLeft}s` : 'Resend Code'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyContent />
        </Suspense>
    )
}
