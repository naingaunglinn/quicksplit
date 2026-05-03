import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; email: string }> }
) {
  try {
    const { id, email: emailParam } = await params
    const targetEmail = decodeURIComponent(emailParam).toLowerCase()
    const user        = getUserFromRequest(req)

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: meeting, error: meetingError } = await admin
      .from('meetings')
      .select('id, user_id, allowed_emails')
      .eq('short_id', id)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (meeting.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updatedEmails = (meeting.allowed_emails ?? [])
      .map((e: string) => e.toLowerCase())
      .filter((e: string) => e !== targetEmail)

    const { data: updated, error: updateError } = await admin
      .from('meetings')
      .update({ allowed_emails: updatedEmails })
      .eq('id', meeting.id)
      .select('allowed_emails')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to remove email' }, { status: 500 })
    }

    return NextResponse.json({ allowedEmails: updated.allowed_emails ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
