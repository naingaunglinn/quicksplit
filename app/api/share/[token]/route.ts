import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const admin     = createAdminClient()

    const { data: meeting, error } = await admin
      .from('meetings')
      .select('*, tasks(*)')
      .eq('share_token', token)
      .single()

    if (error || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const shareMode: string = meeting.share_mode ?? 'private'

    if (shareMode === 'private') {
      return NextResponse.json({ error: 'This meeting is private' }, { status: 403 })
    }

    const responseData = {
      shortId:   meeting.short_id,
      inputType: meeting.input_type,
      createdAt: meeting.created_at,
      summary:   (meeting.summary as { summary: string[] }).summary ?? [],
      decisions: (meeting.summary as { decisions: string[] }).decisions ?? [],
      tasks:     (meeting.tasks ?? []).map((t: { owner: string; description: string; done: boolean }) => ({
        owner:       t.owner,
        description: t.description,
        done:        t.done,
      })),
    }

    if (shareMode === 'public_link') {
      return NextResponse.json(responseData)
    }

    // restricted mode — require signed-in user
    const user = getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    // Owner always gets access
    if (meeting.user_id && user.id === meeting.user_id) {
      return NextResponse.json(responseData)
    }

    // Check allowed_emails against the JWT-issued email
    const userEmail     = user.email.toLowerCase()
    const allowedEmails = (meeting.allowed_emails ?? []).map((e: string) => e.toLowerCase())

    if (allowedEmails.includes(userEmail)) {
      return NextResponse.json(responseData)
    }

    return NextResponse.json(
      { error: 'access_denied', userEmail: user.email },
      { status: 403 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch meeting'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
