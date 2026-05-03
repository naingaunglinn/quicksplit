import nodemailer from 'nodemailer'
import { config } from './config'

function getTransporter() {
  const port   = parseInt(config.SMTP_PORT || '587', 10)
  const secure = port === 465

  return nodemailer.createTransport({
    host: config.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  })
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to:      string
  subject: string
  text:    string
}) {
  const from = config.SMTP_FROM || config.SMTP_USER
  await getTransporter().sendMail({ from, to, subject, text })
}
