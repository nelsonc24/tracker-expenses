import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email notifications will not work.')
}

// Initialize Resend with a fallback to prevent crashes
export const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_development')

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Expense Tracker <noreply@yourdomain.com>'
