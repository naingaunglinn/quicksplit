import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { saveSchema } from '@/lib/validate'
import { sanitizeText } from '@/lib/sanitize'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()

    // Get current user (may be null for anonymous saves)
    const { data: { session } } = await supabase.auth.getSession()

    const shareToken = nanoid(21)

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        short_id:    shortId,
        transcript:  sanitizedTranscript,
        summary:     { summary: summary.summary, decisions: summary.decisions },
        input_type:  inputType,
        user_id:     session?.user?.id ?? null,
        share_token: shareToken,
      })
      .select('id')
      .single()

    if (meetingError || !meeting) {
      console.error('[save] Meeting insert error:', meetingError)
      return NextResponse.json({ error: 'Failed to save meeting' }, { status: 500 })
    }

    // Batch insert tasks
    if (summary.tasks.length > 0) {
      const { error: tasksError } = await supabase
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
        // Non-fatal — meeting is saved, tasks failed
      }
    }

    const url = `${config.NEXT_PUBLIC_APP_URL}/meeting/${shortId}`
    return NextResponse.json({ id: shortId, url, shareToken })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
