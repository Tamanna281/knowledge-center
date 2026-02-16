"use client"
import { useState, Suspense } from 'react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { useRouter, useSearchParams } from 'next/navigation'

function VerifyUsernameContent() {
    const router = useRouter()
    const search = useSearchParams()
    const identifier = search.get('identifier') || ''

    const [otp, setOtp] = useState('')
    const [type, setType] = useState(identifier.includes('@') ? 'EMAIL' : 'PHONE')
    const [username, setUsername] = useState('')
    const [newUsername, setNewUsername] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/auth/verify-otp-username', { identifier, otp, type })
            setUsername(res.data.username)
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Verification failed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
                <div className="text-center mb-8">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-3">
                        Security Recovery
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">NESSCO</h2>
                    <p className="text-gray-500 mt-1">Username Recovery Service</p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 text-sm flex items-center">
                        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                {username ? (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="py-4">
                            <p className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-widest">Initial Account Identity</p>
                            <div className="text-2xl font-bold font-mono py-4 px-6 rounded-xl bg-gray-50 text-gray-400 border border-dashed border-gray-200 break-all mb-4">
                                {username}
                            </div>

                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 text-left">
                                <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Set New Identity
                                </h3>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Enter new username"
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-gray-900 font-bold"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                    />
                                    <button
                                        onClick={async () => {
                                            setLoading(true);
                                            setError('');
                                            try {
                                                const res = await api.post('/auth/reset-username', { identifier, otp, type, newUsername });
                                                setSuccessMessage('Identity updated successfully!');
                                                setUsername(res.data.username);
                                            } catch (err: unknown) {
                                                setError(getApiErrorMessage(err, 'Failed to update identity'));
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading || !newUsername.trim()}
                                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                    >
                                        {loading ? 'Updating...' : 'Confirm New Username'}
                                    </button>
                                </div>
                                {successMessage && (
                                    <p className="mt-3 text-xs font-bold text-emerald-600 flex items-center">
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        {successMessage}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg flex items-center justify-center font-sans tracking-wide"
                                onClick={() => router.push('/login')}
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h12" />
                                </svg>
                                Back to Verification Login
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 tracking-widest text-center text-xl font-bold"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="000000"
                                />
                            </div>
                            <p className="mt-2 text-xs text-gray-400 text-center">Enter the {type === 'EMAIL' ? 'email' : 'SMS'} code sent to your device</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-200 flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying Code...
                                </>
                            ) : (
                                'Securely Verify'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default function VerifyUsernamePage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <VerifyUsernameContent />
        </Suspense>
    )
}
