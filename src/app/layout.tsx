import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
// Google OAuth removed

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'KB Auth System',
    description: 'Authentication System Demo',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
            </body>
        </html>
    )
}
