import { NextResponse } from 'next/server'
import { teamsSchema } from '@/lib/validate'
import { postMeetingToTeams } from '@/lib/teams'
import { createClient } from '@/lib/supabase/server'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = teamsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { meetingId, webhookUrl, summary } = parsed.data
    const meetingUrl = `${config.NEXT_PUBLIC_APP_URL}/meeting/${meetingId}`

    await postMeetingToTeams(
      webhookUrl,
      { ...summary, tasks: summary.tasks.map(t => ({ ...t, done: false })) },
      meetingUrl
    )

    // Log integration (best-effort)
    try {
      const supabase = await createClient()

      const { data: meeting } = await supabase
        .from('meetings')
        .select('id')
        .eq('short_id', meetingId)
        .single()

      if (meeting) {
        await supabase.from('integration_logs').insert({
          meeting_id: meeting.id,
          type:       'teams',
          channel:    webhookUrl,
        })
      }
    } catch (logErr) {
      console.warn('[teams] Integration log failed:', logErr)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Teams push failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
