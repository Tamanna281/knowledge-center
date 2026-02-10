import nodemailer from 'nodemailer'
import twilio from 'twilio'

const getTransporter = () => {
    const user = process.env.GMAIL_USER?.trim()
    const pass = process.env.GMAIL_PASS?.trim()
    if (!user || !pass) return null

    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    })
}

const getTwilioClient = () => {
    const sid = process.env.TWILIO_SID?.trim()
    const token = process.env.TWILIO_AUTH_TOKEN?.trim()
    if (!sid || !token) return null
    return twilio(sid, token)
}

export const sendEmailOtp = async (email: string, otp: string) => {
    const user = process.env.GMAIL_USER?.trim()
    const pass = process.env.GMAIL_PASS?.trim()

    // In production, failure to have credentials should be an error.
    // In dev, we might want to mock, but for this specific issue (OTP not sending),
    // we want to catch the configuration error.
    if (!user || !pass) {
        console.error(`[EMAIL ERROR] Missing Env Config. Cannot send OTP to ${email}`)
        return false
    }

    const transporter = getTransporter()
    if (!transporter) {
        console.error(`[EMAIL ERROR] Transporter not configured. Cannot send OTP to ${email}`)
        return false
    }

    try {
        await transporter.sendMail({
            from: user,
            to: email,
            subject: 'Your OTP Code',
            text: `Your verification code is: ${otp}`
        })
        console.log(`[EMAIL] Sent OTP to ${email}`)
        return true
    } catch (error) {
        console.error('[EMAIL ERROR]', error)
        return false
    }
}

export const sendSmsOtp = async (phone: string, otp: string) => {
    const twClient = getTwilioClient()
    const fromPhone = process.env.TWILIO_PHONE?.trim()
    if (!twClient || !fromPhone) {
        console.log(`[MOCK SMS] Missing Twilio Config. OTP for ${phone}: ${otp}`)
        return true
    }

    try {
        await twClient.messages.create({
            body: `Your verification code is: ${otp}`,
            from: fromPhone,
            to: phone
        })
        console.log(`[SMS] Sent OTP to ${phone}`)
        return true
    } catch (error) {
        console.error('[SMS ERROR]', error)
        return false
    }
}
