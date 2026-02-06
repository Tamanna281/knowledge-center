import { NextRequest, NextResponse } from 'next/server'
import {
    handleUserLogin,
    handleSignup,
    handleLogoutGet,
    handleLogoutPost,
    handleMe,
    handleAdminStats,
    handleResendOtp,
    handleForgotUsername,
    handleResetPassword,
    handleVerifyOtp,
    handleVerifyOtpUsername,
    handleUserProfile
} from '@/lib/auth-handlers'

type RouteContext = {
    params: Promise<{
        auth: string[]
    }>
}

// ============================================
// GET REQUESTS
// ============================================
export async function GET(req: NextRequest, { params }: RouteContext) {
    const slug = (await params).auth
    const endpoint = slug.join('/')

    console.log(`[GET] /api/auth/${endpoint}`)

    // Match endpoints
    if (endpoint === 'me') return handleMe(req)
    if (endpoint === 'logout') return handleLogoutGet(req)
    if (endpoint === 'admin/stats') return handleAdminStats(req)
    if (endpoint === 'user/profile') return handleUserProfile(req)

    return NextResponse.json({ message: 'Endpoint not found' }, { status: 404 })
}

// ============================================
// POST REQUESTS
// ============================================
export async function POST(req: NextRequest, { params }: RouteContext) {
    const slug = (await params).auth
    const endpoint = slug.join('/')

    console.log(`[POST] /api/auth/${endpoint}`)

    // Authentication
    if (endpoint === 'login') return handleUserLogin(req)
    if (endpoint === 'signup') return handleSignup(req)
    if (endpoint === 'logout') return handleLogoutPost(req)

    // Password & Username Recovery
    if (endpoint === 'forgot-password') return handleResendOtp(req)
    if (endpoint === 'forgot-username') return handleForgotUsername(req)
    if (endpoint === 'reset-password') return handleResetPassword(req)

    // OTP
    if (endpoint === 'resend-otp') return handleResendOtp(req)
    if (endpoint === 'verify-otp') return handleVerifyOtp(req)
    if (endpoint === 'verify-otp-username') return handleVerifyOtpUsername(req)

    return NextResponse.json({ message: 'Endpoint not found' }, { status: 404 })
}
