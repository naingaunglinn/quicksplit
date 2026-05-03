import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { saveSchema } from '@/lib/validate'
import { sanitizeText } from '@/lib/sanitize'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/auth'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = saveSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { transcript, summary, inputType } = parsed.data
    const sanitizedTranscript = sanitizeText(transcript)
    const shortId = nanoid(8)
    const shareToken = nanoid(21)

    const user  = getUserFromRequest(req)
    const admin = createAdminClient()

    const { data: meeting, error: meetingError } = await admin
      .from('meetings')
      .insert({
        short_id:    shortId,
        transcript:  sanitizedTranscript,
        summary:     { summary: summary.summary, decisions: summary.decisions },
        input_type:  inputType,
        user_id:     user?.id ?? null,
        share_token: shareToken,
      })
      .select('id')
      .single()

    if (meetingError || !meeting) {
      console.error('[save] Meeting insert error:', meetingError)
      return NextResponse.json({ error: 'Failed to save meeting' }, { status: 500 })
    }

    if (summary.tasks.length > 0) {
      const { error: tasksError } = await admin
        .from('tasks')
        .insert(
          summary.tasks.map(task => ({
            meeting_id:  meeting.id,
            owner:       task.owner,
            description: task.description,
            done:        false,
          }))
        )

      if (tasksError) {
        console.error('[save] Tasks insert error:', tasksError)
      }
    }

    const url = `${config.NEXT_PUBLIC_APP_URL}/meeting/${shortId}`
    return NextResponse.json({ id: shortId, url, shareToken })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
