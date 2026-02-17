"use client"
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'
import { getApiErrorMessage } from '@/lib/errors'
import BackButton from '@/components/BackButton'

type UserSummary = {
    email?: string | null
    username?: string | null
}

type UserProfile = {
    id: string
    username: string
    email: string
    phone?: string
    role: string
}

export default function UserDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<UserSummary | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isEditingUsername, setIsEditingUsername] = useState(false)
    const [newUsername, setNewUsername] = useState('')
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        api.get('/auth/me').then(res => setUser(res.data)).catch(() => router.push('/login'))
        api.get('/auth/user/profile').then(res => {
            setProfile(res.data)
            setNewUsername(res.data.username || '')
        }).catch(() => { })
    }, [router])

    const handleLogout = async () => {
        await api.post('/auth/logout')
        router.push('/login')
    }

    const updateUsername = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            const res = await api.post('/auth/change-username', { newUsername, otp, type: 'EMAIL' })
            setProfile(prev => prev ? { ...prev, username: res.data.username } : null)
            setUser(prev => prev ? { ...prev, username: res.data.username } : null)
            setSuccess('Username updated successfully!')
            setIsEditingUsername(false)
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to update username'))
        } finally {
            setLoading(false)
        }
    }

    // Mock roles counts -- replace with API if available
    const roles = [
        { name: 'IT Strategy', count: 4, color: 'from-blue-500 to-cyan-400' },
        { name: 'Global Sales', count: 12, color: 'from-indigo-500 to-purple-400' },
        { name: 'Export Ops', count: 2, color: 'from-emerald-500 to-teal-400' },
        { name: 'Accounts', count: 3, color: 'from-amber-500 to-orange-400' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-10 font-sans text-white">
            <div className="max-w-6xl mx-auto">
                {/* Global Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/5 backdrop-blur-xl p-8 rounded-2xl shadow-2xl mb-10 border border-white/10 transition-all hover:shadow-purple-500/5">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <BackButton />
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">N</span>
                                <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
                                    NESSCO Ecosystem
                                </h1>
                            </div>
                            <p className="text-slate-400 font-medium mt-3 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" /></svg>
                                Secure Knowledge Node: {profile?.role || 'User'} Authorization
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 md:mt-0 flex items-center gap-6">
                        <div className="hidden lg:flex flex-col items-end">
                            <div className="text-sm font-bold text-white">{profile?.username}</div>
                            <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{profile?.email}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-gray-900 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-gray-900/20 active:scale-95 flex items-center"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Logout Session
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Role Analytics */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-white flex items-center">
                                    <svg className="w-6 h-6 mr-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    Organizational Map
                                </h2>
                                <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-500/20">Active Database</span>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                {roles.map(r => (
                                    <div key={r.name} className="relative group overflow-hidden p-6 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all bg-white/5">
                                        <div className={`absolute inset-0 bg-gradient-to-br ${r.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                                        <div className="relative flex flex-col items-center">
                                            <div className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors uppercase tracking-widest mb-2">{r.name}</div>
                                            <div className="text-4xl font-black text-white group-hover:scale-110 transition-transform">{r.count}</div>
                                            <div className="text-[10px] font-bold text-slate-500 group-hover:text-white/60 mt-2 transition-colors">ASSIGNED ENTITIES</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Additional Content area */}
                        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl text-white relative overflow-hidden backdrop-blur-xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full filter blur-[100px] opacity-10 -mr-32 -mt-32"></div>
                            <div className="relative">
                                <h3 className="text-xl font-bold mb-4">Ecosystem Intelligence</h3>
                                <p className="text-slate-400 font-medium leading-relaxed">
                                    Welcome to your personalized NESSCO control center. From here, you can monitor global hierarchy assignments, verify security credentials, and manage your localized knowledge access parameters.
                                </p>
                                <button className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20">
                                    Explore Documentation
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Identity Management Section */}
                    <div className="space-y-8">
                        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10 h-full">
                            <h3 className="text-xl font-black text-white mb-8 border-b border-white/5 pb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Security Profile
                            </h3>

                            {success && (
                                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl mb-6 text-sm font-bold border-l-4 border-emerald-500 animate-in zoom-in duration-300">
                                    {success}
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm font-bold border-l-4 border-red-500">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Display Identity</label>
                                    {!isEditingUsername ? (
                                        <div className="flex items-center justify-between group">
                                            <div className="text-xl font-black text-white">{profile?.username || 'NESSCO_USER'}</div>
                                            <button
                                                onClick={() => setIsEditingUsername(true)}
                                                className="p-2 h-9 w-9 flex items-center justify-center text-blue-400 bg-blue-400/10 rounded-lg hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={updateUsername} className="space-y-4 animate-in slide-in-from-right duration-300">
                                            <div>
                                                <input
                                                    type="text"
                                                    value={newUsername}
                                                    onChange={(e) => setNewUsername(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-gray-900 font-bold"
                                                    placeholder="New username"
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-gray-900 font-bold text-center tracking-widest"
                                                    placeholder="Enter OTP"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            setLoading(true);
                                                            await api.post('/auth/resend-otp', { userId: profile?.id, type: 'EMAIL' });
                                                            setSuccess('Verification code sent to your email!');
                                                        } catch (err: unknown) {
                                                            setError(getApiErrorMessage(err, 'Failed to send code'));
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }}
                                                    className="absolute right-2 top-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                                                >
                                                    Send Code
                                                </button>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={loading || !otp}
                                                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                                >
                                                    {loading ? 'Verifying...' : 'Confirm Change'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsEditingUsername(false); setError(''); setSuccess(''); }}
                                                    className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registered Email</label>
                                    <div className="font-bold text-white break-all">{profile?.email}</div>
                                </div>
                                {profile?.phone && (
                                    <div className="pt-6 border-t border-white/5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Authenticated Phone</label>
                                        <div className="font-bold text-white">{profile?.phone}</div>
                                    </div>
                                )}
                                <div className="pt-6 border-t border-white/5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Access Privilege</label>
                                    <div className="inline-flex px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-lg text-xs font-black uppercase tracking-widest border border-indigo-500/20">
                                        {profile?.role || 'Standard_Node'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
