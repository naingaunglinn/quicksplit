import { NextResponse } from 'next/server'
import { sendEmailSchema } from '@/lib/validate'
import { sendEmail } from '@/lib/mailer'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = sendEmailSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { to, subject, body: text } = parsed.data
    await sendEmail({ to, subject, text })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
