import { NextResponse } from 'next/server'
import { emailSchema } from '@/lib/validate'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = emailSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { summary, language, tone } = parsed.data
    const { draftFollowUpEmail } = config.AI_PROVIDER === 'openai'
      ? await import('@/lib/openai')
      : await import('@/lib/gemini')

    const email = await draftFollowUpEmail(
      { ...summary, tasks: summary.tasks.map(t => ({ ...t, done: false })) },
      language,
      tone
    )

    return NextResponse.json({ email })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Email draft failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
