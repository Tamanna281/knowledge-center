// In-memory mock database
export interface User {
    id: string
    username: string
    email: string
    phone?: string | null
    passwordHash: string
    role: string
    emailVerified: boolean
    phoneVerified: boolean
    isActive: boolean
    createdAt: Date
}

export interface Otp {
    id: string
    userId: string
    otp: string
    type: 'EMAIL' | 'PHONE'
    expiresAt: Date
}

class Database {
    users: User[] = []
    otps: Otp[] = []

    constructor() {
        console.log('[MockDB] Initialized in-memory database')
    }
}

const globalForDb = globalThis as unknown as {
    db: Database | undefined
}

export const db = globalForDb.db ?? new Database()

if (process.env.NODE_ENV !== 'production') globalForDb.db = db
