import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/mailer'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

const schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const { email } = parsed.data
    const appUrl    = config.NEXT_PUBLIC_APP_URL

    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.generateLink({
      type:    'magiclink',
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    })

    if (error || !data.properties?.action_link) {
      throw new Error(error?.message ?? 'Failed to generate sign-in link')
    }

    await sendEmail({
      to:      email,
      subject: 'Sign in to QuickSplit',
      text: [
        'Hi,',
        '',
        'Click the link below to sign in to QuickSplit:',
        '',
        data.properties.action_link,
        '',
        'This link expires in 1 hour. If you did not request this, ignore this email.',
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
