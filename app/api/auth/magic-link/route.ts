import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/mailer'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

const TOKEN_TTL_MINUTES = 60

const schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const email   = parsed.data.email.trim().toLowerCase()
    const appUrl  = config.NEXT_PUBLIC_APP_URL
    const token   = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString()

    const supabase = createAdminClient()
    const { error: insertErr } = await supabase
      .from('auth_tokens')
      .insert({ email, token, expires_at: expires })

    if (insertErr) {
      throw new Error(insertErr.message)
    }

    const link = `${appUrl}/auth/callback?token=${token}`

    await sendEmail({
      to:      email,
      subject: 'Sign in to QuickSplit',
      text: [
        'Hi,',
        '',
        'Click the link below to sign in to QuickSplit:',
        '',
        link,
        '',
        `This link expires in ${TOKEN_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
        '',
        '— QuickSplit',
      ].join('\n'),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send sign-in email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
