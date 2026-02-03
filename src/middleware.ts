import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check for the "token" cookie.
    const token = request.cookies.get('token')?.value

    const { pathname } = request.nextUrl

    // Protected routes pattern
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/chatbot') || pathname.startsWith('/import')
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/verify') || pathname.startsWith('/forgot') || pathname.startsWith('/reset')

    if (isProtectedRoute && !token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Role-based access: if user tries to access admin dashboard ensure token contains role=ADMIN
    if (pathname.startsWith('/dashboard/admin')) {
        if (!token) return NextResponse.redirect(new URL('/login', request.url))
        try {
            const parts = token.split('.')
            if (parts.length === 3) {
                const payload = parts[1]
                const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
                const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
                const json = atob(padded)
                const data = JSON.parse(json)
                const role = data?.role
                if (role !== 'ADMIN') {
                    // Redirect non-admins to shared dashboard
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            }
        } catch {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/chatbot/:path*',
        '/import/:path*',
        '/login',
        '/signup',
        '/verify',
        '/forgot-password',
        '/forgot-username',
        '/reset-password',
        '/verify-username'
    ],
}
