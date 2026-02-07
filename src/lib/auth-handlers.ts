// src/lib/auth-handlers-prisma.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { generateToken, generateOtp, verifyToken } from '@/lib/tokens'
import { sendEmailOtp, sendSmsOtp } from '@/lib/notifications'

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? getErrorMessage(error) : 'Unknown error'

// ============================================
// ADMIN LOGIN
// ============================================
// ============================================
// USER LOGIN
// ============================================
export async function handleUserLogin(req: NextRequest) {
    try {
        const body = await req.json()
        const { identifier, email, password } = body

        if (!password) {
            return NextResponse.json({ message: 'Password required' }, { status: 400 })
        }

        // Find user by email or username (case-insensitive)
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: identifier || email, mode: 'insensitive' } },
                    { username: { equals: identifier, mode: 'insensitive' } }
                ]
            },
            include: {
                role: true
            }
        })

        if (!user) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 400 })
        }

        const validPass = await bcrypt.compare(password, user.password)
        if (!validPass) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 400 })
        }

        if (!user.isActive) {
            return NextResponse.json({ message: 'Account not active. Verify OTP.' }, { status: 403 })
        }

        const token = generateToken(user.id, user.role.name)

        const response = NextResponse.json({
            message: 'Login successful',
            user: { id: user.id, username: user.username || user.name, role: user.role.name }
        })

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60,
            path: '/'
        })

        return response
    } catch (error: unknown) {
        console.error('User login error:', error)
        return NextResponse.json({ message: 'Internal server error', error: getErrorMessage(error) }, { status: 500 })
    }
}

// ============================================
// SIGNUP (USER ONLY - Admins created manually)
// ============================================
export async function handleSignup(req: Request) {
    try {
        const body = await req.json()
        const { username, name, email, phone, password, role, roleId, managerId } = body

        if (role !== 'ADMIN') {
            return NextResponse.json({ message: 'Signup is restricted to Administrators only.' }, { status: 403 })
        }

        // Use username as name if name not provided
        const finalName = name || username

        if (!finalName || !email || !password) {
            return NextResponse.json({ message: 'Name/Username, email and password are required' }, { status: 400 })
        }

        // Check if user already exists (case-insensitive)
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: email, mode: 'insensitive' } },
                    username ? { username: { equals: username, mode: 'insensitive' } } : undefined,
                    phone ? { phone } : undefined
                ].filter(Boolean) as any
            }
        })

        if (existingUser) {
            if (existingUser.email.toLowerCase() === email.toLowerCase()) {
                return NextResponse.json({ message: 'Email is already registered' }, { status: 400 })
            }
            if (username && existingUser.username?.toLowerCase() === username.toLowerCase()) {
                return NextResponse.json({ message: 'Username is already taken' }, { status: 400 })
            }
            if (phone && existingUser.phone === phone) {
                return NextResponse.json({ message: 'Phone number is already registered' }, { status: 400 })
            }
            return NextResponse.json({ message: 'User already exists with these details' }, { status: 400 })
        }

        // Convert role name to roleId if role is provided as a string
        let finalRoleId = roleId
        if (!finalRoleId && role) {
            // Role came as a string (e.g., "ADMIN", "USER"), look it up
            let roleRecord = await prisma.role.findFirst({
                where: { name: role }
            })

            // Auto-create role if it doesn't exist
            if (!roleRecord) {
                roleRecord = await prisma.role.create({
                    data: {
                        name: role,
                        privileges: role === 'ADMIN' ? ['VIEW_TREE', 'ADD_USER', 'DELETE_USER'] : ['VIEW_TREE']
                    }
                })
            }
            finalRoleId = roleRecord.id
        }

        // If still no roleId, default to USER role
        if (!finalRoleId) {
            let defaultRole = await prisma.role.findFirst({
                where: { name: 'USER' }
            })

            // Auto-create default USER role if it doesn't exist
            if (!defaultRole) {
                defaultRole = await prisma.role.create({
                    data: {
                        name: 'USER',
                        privileges: ['VIEW_TREE']
                    }
                })
            }
            finalRoleId = defaultRole.id
        }

        const passwordHash = await bcrypt.hash(password, 10)

        // ===== ADMIN ORGANIZATION HIERARCHY =====
        // ADMIN users create their own independent organization
        // Force managerId to null for ADMIN, regardless of any provided value
        let finalManagerId = managerId || null

        if (role?.toUpperCase() === 'ADMIN') {
            finalManagerId = null
            console.log('🔹 ADMIN signup detected - creating independent organization (managerId forced to null)')
        }

        const user = await prisma.user.create({
            data: {
                username,
                name: finalName,  // Use finalName (name or username)
                email,
                phone,
                password: passwordHash,
                roleId: finalRoleId,
                managerId: finalManagerId,
                // TODO: Change these to false in production and require OTP verification
                emailVerified: true,  // Auto-verify for development
                phoneVerified: true,  // Auto-verify for development
                isActive: true        // Auto-activate for development
            }
        })

        console.log(`✅ User created: ${user.email} | Role: ${role} | ManagerID: ${user.managerId}`)


        // Generate and Send OTPs
        const emailOtp = generateOtp()
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

        await prisma.otp.create({
            data: {
                userId: user.id,
                otp: emailOtp,
                type: 'EMAIL',
                expiresAt: otpExpires
            }
        })

        const emailSent = await sendEmailOtp(email, emailOtp)
        if (!emailSent) {
            return NextResponse.json({ message: 'Failed to send verification email.' }, { status: 500 })
        }

        if (phone) {
            const phoneOtp = generateOtp()
            await prisma.otp.create({
                data: {
                    userId: user.id,
                    otp: phoneOtp,
                    type: 'PHONE',
                    expiresAt: otpExpires
                }
            })
            const smsSent = await sendSmsOtp(phone, phoneOtp)
            if (!smsSent) {
                // Note: If SMS fails but email succeeded, we might still want to proceed or warn.
                // For now, let's just log it but not block since email is primary for many flows.
                console.warn('Failed to send SMS OTP')
            }
        }

        return NextResponse.json({ message: 'User created. Please verify OTP.', userId: user.id }, { status: 201 })
    } catch (error: unknown) {
        console.error('Signup error:', error)
        return NextResponse.json({ message: 'Internal server error', error: getErrorMessage(error) }, { status: 500 })
    }
}

// ============================================
// LOGOUT
// ============================================
export async function handleLogoutPost(req: Request) {
    const response = NextResponse.json({ message: 'Logged out' })
    response.cookies.delete('token')
    return response
}

export async function handleLogoutGet(req: Request) {
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('token')
    return response
}

// ============================================
// ME (Get current user/admin)
// ============================================
export async function handleMe(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value
        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
        }

        const decoded = verifyToken(token) as any

        // Fetch user from User table
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true }
        })

        if (user) {
            return NextResponse.json({
                id: user.id,
                username: user.username || user.name,
                email: user.email,
                role: user.role.name
            })
        }

        // User not found
        const response = NextResponse.json({ message: 'User not found' }, { status: 404 })
        response.cookies.delete('token')
        return response

    } catch (error: unknown) {
        const response = NextResponse.json({ message: 'Invalid token' }, { status: 403 })
        response.cookies.delete('token')
        return response
    }
}

// ============================================
// ADMIN STATS
// ============================================
export async function handleAdminStats(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value
        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
        }

        const decoded = verifyToken(token) as any
        if (!decoded || decoded.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Not authorized' }, { status: 403 })
        }

        const totalUsers = await prisma.user.count()
        const users = await prisma.user.findMany({
            include: {
                role: true,
                manager: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                children: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        const roles = await prisma.role.findMany()

        const byRole: Record<string, number> = {}
        users.forEach(u => {
            const roleName = u.role?.name || 'UNKNOWN';
            byRole[roleName] = (byRole[roleName] || 0) + 1
        })

        return NextResponse.json({
            totalUsers,
            byRole,
            users: users.map(u => ({
                id: u.id,
                username: u.username || u.name,
                email: u.email,
                role: u.role?.name || 'UNKNOWN',
                roleId: u.roleId,
                managerId: u.managerId,
                managerName: u.manager?.name,
                childrenCount: u.children.length
            })),
            roles: roles.map(r => ({ id: r.id, name: r.name, privileges: r.privileges }))
        })
    } catch (error: unknown) {
        console.error('Stats API Error:', error)
        return NextResponse.json({ message: 'Internal server error', error: getErrorMessage(error) }, { status: 500 })
    }
}

// ============================================
// RESEND OTP
// ============================================
export async function handleResendOtp(req: Request) {
    try {
        const body = await req.json()
        const { email, phone, userId, type } = body

        let user;
        if (userId) {
            user = await prisma.user.findUnique({ where: { id: userId } })
        } else {
            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        email ? { email } : undefined,
                        phone ? { phone } : undefined
                    ].filter(Boolean) as any
                }
            })
        }

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 })
        }

        const otp = generateOtp()
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

        const isEmail = (userId && type === 'EMAIL') || email
        const isPhone = (userId && type === 'PHONE') || phone

        if (isEmail && user.email) {
            await prisma.otp.create({
                data: {
                    userId: user.id,
                    otp,
                    type: 'EMAIL',
                    expiresAt: otpExpires
                }
            })
            const sent = await sendEmailOtp(user.email, otp)
            if (!sent) {
                return NextResponse.json({ message: 'Failed to send OTP via Email' }, { status: 500 })
            }
        } else if (isPhone && (user.phone || phone)) {
            const targetPhone = user.phone || phone
            if (targetPhone) {
                await prisma.otp.create({
                    data: {
                        userId: user.id,
                        otp,
                        type: 'PHONE',
                        expiresAt: otpExpires
                    }
                })
                const sent = await sendSmsOtp(targetPhone, otp)
                if (!sent) {
                    return NextResponse.json({ message: 'Failed to send OTP via SMS' }, { status: 500 })
                }
            }
        } else {
            return NextResponse.json({ message: 'Could not determine OTP destination' }, { status: 400 })
        }

        return NextResponse.json({ message: 'OTP resent' })
    } catch (error: unknown) {
        return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 })
    }
}

// ============================================
// FORGOT USERNAME
// ============================================
export async function handleForgotUsername(req: Request) {
    try {
        const body = await req.json()
        const { email, phone } = body

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    email ? { email } : undefined,
                    phone ? { phone } : undefined
                ].filter(Boolean) as any
            }
        })

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 })
        }

        const otp = generateOtp()
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

        if (email && user.email) {
            await prisma.otp.create({
                data: {
                    userId: user.id,
                    otp,
                    type: 'EMAIL',
                    expiresAt: otpExpires
                }
            })
            const sent = await sendEmailOtp(user.email, otp)
            if (!sent) {
                return NextResponse.json({ message: 'Failed to send Username to Email' }, { status: 500 })
            }
        } else if (phone && (user.phone || phone)) {
            const targetPhone = user.phone || phone
            if (targetPhone) {
                await prisma.otp.create({
                    data: {
                        userId: user.id,
                        otp,
                        type: 'PHONE',
                        expiresAt: otpExpires
                    }
                })
                const sent = await sendSmsOtp(targetPhone, otp)
                if (!sent) {
                    return NextResponse.json({ message: 'Failed to send Username to SMS' }, { status: 500 })
                }
            }
        } else {
            return NextResponse.json({ message: 'No valid destination for OTP' }, { status: 400 })
        }

        return NextResponse.json({ message: 'OTP sent for username recovery' })
    } catch (error: unknown) {
        return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 })
    }
}

// ============================================
// RESET PASSWORD
// ============================================
export async function handleResetPassword(req: Request) {
    try {
        const body = await req.json()
        const { email, otp, newPassword } = body

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 })
        }

        const otpRecord = await prisma.otp.findFirst({
            where: {
                userId: user.id,
                otp,
                type: 'EMAIL',
                expiresAt: {
                    gt: new Date()
                }
            }
        })

        if (!otpRecord) {
            return NextResponse.json({ message: 'Invalid or expired OTP' }, { status: 400 })
        }

        const passwordHash = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { id: user.id },
            data: { password: passwordHash }
        })

        await prisma.otp.delete({
            where: { id: otpRecord.id }
        })

        return NextResponse.json({ message: 'Password reset successful' })
    } catch (error: unknown) {
        return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 })
    }
}

// ============================================
// VERIFY OTP
// ============================================
export async function handleVerifyOtp(req: Request) {
    try {
        const body = await req.json()
        const { userId, otp, type } = body

        const otpRecord = await prisma.otp.findFirst({
            where: {
                userId,
                otp,
                type,
                expiresAt: {
                    gt: new Date()
                }
            }
        })

        if (!otpRecord) {
            return NextResponse.json({ message: 'Invalid or expired OTP' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (user) {
            if (type === 'EMAIL') {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        emailVerified: true,
                        isActive: true
                    }
                })
            } else if (type === 'PHONE') {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        phoneVerified: true
                    }
                })
            }
        }

        // Delete used OTP
        await prisma.otp.delete({
            where: { id: otpRecord.id }
        })

        return NextResponse.json({ message: 'Verification successful' })
    } catch (error: unknown) {
        return NextResponse.json({ message: 'Internal server error', error: getErrorMessage(error) }, { status: 500 })
    }
}

// ============================================
// VERIFY OTP USERNAME
// ============================================
export async function handleVerifyOtpUsername(req: Request) {
    try {
        const body = await req.json()
        const { identifier, otp, type } = body

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { phone: identifier }
                ]
            }
        })

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 })
        }

        const otpRecord = await prisma.otp.findFirst({
            where: {
                userId: user.id,
                otp,
                type,
                expiresAt: {
                    gt: new Date()
                }
            }
        })

        if (!otpRecord) {
            return NextResponse.json({ message: 'Invalid or expired OTP' }, { status: 400 })
        }

        // Remove used otp
        await prisma.otp.delete({
            where: { id: otpRecord.id }
        })

        // Return username for recovery
        return NextResponse.json({ message: 'OTP verified', username: user.username || user.name })
    } catch (error: unknown) {
        return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 })
    }
}

// ============================================
// USER PROFILE
// ============================================
export async function handleUserProfile(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value
        if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

        const decoded = verifyToken(token) as any

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true }
        })

        if (!user) {
            const response = NextResponse.json({ message: 'User not found' }, { status: 404 })
            response.cookies.delete('token')
            return response
        }

        return NextResponse.json({
            id: user.id,
            username: user.username || user.name,
            email: user.email,
            phone: user.phone,
            role: user.role.name
        })
    } catch (error: unknown) {
        const response = NextResponse.json({ message: 'Invalid token' }, { status: 403 })
        response.cookies.delete('token')
        return response
    }
}
