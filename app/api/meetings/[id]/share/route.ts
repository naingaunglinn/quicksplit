import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { shareSettingsSchema } from '@/lib/validate'

export const runtime = 'nodejs'

async function getOwnerMeeting(shortId: string, userId: string) {
  const admin = createAdminClient()
  const { data: meeting, error } = await admin
    .from('meetings')
    .select('id, user_id, share_mode, share_token, allowed_emails')
    .eq('short_id', shortId)
    .single()

  if (error || !meeting) return null
  if (meeting.user_id !== userId) return null
  return meeting
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const serverClient = await createClient()
    const { data: { session } } = await serverClient.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const meeting = await getOwnerMeeting(id, session.user.id)
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({
      mode:          meeting.share_mode ?? 'private',
      shareToken:    meeting.share_token ?? null,
      allowedEmails: meeting.allowed_emails ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch share settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const serverClient = await createClient()
    const { data: { session } } = await serverClient.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const meeting = await getOwnerMeeting(id, session.user.id)
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or access denied' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = shareSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { mode, emails } = parsed.data

    // Generate share_token if not yet set
    const shareToken = meeting.share_token ?? nanoid(21)

    const updatePayload: Record<string, unknown> = {
      share_mode:  mode,
      share_token: shareToken,
    }

    if (mode === 'restricted' && emails !== undefined) {
      updatePayload.allowed_emails = emails.map(e => e.toLowerCase())
    }

    const admin = createAdminClient()
    const { data: updated, error: updateError } = await admin
      .from('meetings')
      .update(updatePayload)
      .eq('id', meeting.id)
      .select('share_mode, share_token, allowed_emails')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to update share settings' }, { status: 500 })
    }

    return NextResponse.json({
      mode:          updated.share_mode,
      shareToken:    updated.share_token,
      allowedEmails: updated.allowed_emails ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update share settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
