import { NextResponse } from 'next/server'
import { slackSchema } from '@/lib/validate'
import { sanitizeShortString } from '@/lib/sanitize'
import { postMeetingToSlack } from '@/lib/slack'
import { createClient } from '@/lib/supabase/server'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = slackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { meetingId, channel, summary } = parsed.data
    const safeChannel = sanitizeShortString(channel)
    const meetingUrl  = `${config.NEXT_PUBLIC_APP_URL}/meeting/${meetingId}`

    const result = await postMeetingToSlack(
      safeChannel,
      { ...summary, tasks: summary.tasks.map(t => ({ ...t, done: false })) },
      meetingUrl
    )

    // Log integration (best-effort — never fail the response over this)
    try {
      const supabase = await createClient()

      // Resolve short_id → uuid
      const { data: meeting } = await supabase
        .from('meetings')
        .select('id')
        .eq('short_id', meetingId)
        .single()

      if (meeting) {
        await supabase.from('integration_logs').insert({
          meeting_id: meeting.id,
          type:       'slack',
          channel:    safeChannel,
        })
      }
    } catch (logErr) {
      console.warn('[slack] Integration log failed:', logErr)
    }

    return NextResponse.json({ ok: true, ts: result.ts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Slack push failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
