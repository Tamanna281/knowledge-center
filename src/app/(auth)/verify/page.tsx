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
        <div className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4 font-sans">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">NESSCO</h2>
                    <p className="text-gray-500 mt-2 font-medium tracking-wide italic">Account Authentication</p>
                </div>

                <div className="flex p-1 bg-gray-100 rounded-xl mb-8">
                    <button
                        onClick={() => setType('EMAIL')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${type === 'EMAIL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >Email Channel</button>
                    <button
                        onClick={() => setType('PHONE')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${type === 'PHONE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >Phone Channel</button>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 text-sm flex items-center animate-in slide-in-from-top duration-300">
                        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-6 text-sm flex items-center animate-in zoom-in duration-300">
                        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3 text-center uppercase tracking-widest">
                            {type === 'EMAIL' ? 'Email' : 'SMS'} Verification Code
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-4 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none text-gray-900 tracking-[1em] text-center text-2xl font-black bg-gray-50 transition-all placeholder:tracking-normal placeholder:text-lg"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="000000"
                        />
                        <p className="mt-3 text-xs text-gray-400 text-center font-medium">Verify your identity to complete account initialization</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-500/10 flex items-center justify-center text-lg mt-2"
                    >
                        {loading && !success ? (
                            <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Authenticating...
                            </div>
                        ) : 'Securely Verify'}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-gray-100">
                    <button
                        onClick={handleResend}
                        disabled={timeLeft > 0 || loading}
                        className="text-sm font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:no-underline flex items-center justify-center mx-auto transition-colors"
                    >
                        {timeLeft > 0 ? (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Resend available in {timeLeft}s
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Resend Authentication Code
                            </>
                        )}
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
