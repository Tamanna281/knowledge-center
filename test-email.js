
const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from the current directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const testEmail = async () => {
    const user = process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : null;
    const pass = process.env.GMAIL_PASS ? process.env.GMAIL_PASS.trim() : null;

    console.log('User:', user);
    console.log('Pass:', pass ? '******' : 'Missing');

    if (!user || !pass) {
        console.error('Missing credentials');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    try {
        console.log('Sending email...');
        const info = await transporter.sendMail({
            from: user,
            to: user, // Send to self for testing
            subject: 'Test OTP',
            text: 'This is a test email from the debug script.'
        });
        console.log('Email sent:', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

testEmail();
