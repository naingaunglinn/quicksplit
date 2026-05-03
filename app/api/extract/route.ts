import { NextResponse } from 'next/server'
import { extractSchema } from '@/lib/validate'
import { sanitizeText } from '@/lib/sanitize'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = extractSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const transcript = sanitizeText(parsed.data.transcript)
    const { extractMeetingData } = config.AI_PROVIDER === 'openai'
      ? await import('@/lib/openai')
      : await import('@/lib/gemini')

    const data = await extractMeetingData(transcript)

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
