import { NextResponse } from 'next/server'
import { translateSchema } from '@/lib/validate'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = translateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { summary, language } = parsed.data
    const meeting = { ...summary, tasks: summary.tasks.map(t => ({ ...t, done: false })) }

    const { translateMeetingData } = config.AI_PROVIDER === 'openai'
      ? await import('@/lib/openai')
      : await import('@/lib/gemini')

    const translated = await translateMeetingData(meeting, language)

    return NextResponse.json(translated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Translation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
