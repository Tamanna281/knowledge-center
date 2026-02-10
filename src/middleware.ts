import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check for the "token" cookie.
    const token = request.cookies.get('token')?.value

    const { pathname } = request.nextUrl

    // Protected routes pattern (home page requires auth but doesn't redirect)
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/chatbot') || pathname.startsWith('/import') || pathname.startsWith('/database') || pathname.startsWith('/hierarchy')
    const isAuthRoute = pathname.startsWith('/login')

    // If accessing root without token, redirect to login
    if (pathname === '/' && !token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If logged in and accessing auth routes, redirect to home
    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // Protect other routes
    if (isProtectedRoute && !token) {
        return NextResponse.redirect(new URL('/login', request.url))
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
                    // Redirect non-admins to home
                    return NextResponse.redirect(new URL('/', request.url))
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
        '/',
        '/dashboard/:path*',
        '/chatbot/:path*',
        '/import/:path*',
        '/database/:path*',
        '/hierarchy/:path*',
        '/login',
        '/signup',
        '/verify',
        '/forgot-password',
        '/forgot-username',
        '/reset-password',
        '/verify-username'
    ],
}
