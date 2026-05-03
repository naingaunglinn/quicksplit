import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/auth'
import { addShareEmailSchema } from '@/lib/validate'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user   = getUserFromRequest(req)

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

    const body = await req.json()
    const parsed = addShareEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const newEmail = parsed.data.email.toLowerCase()
    const currentEmails: string[] = (meeting.allowed_emails ?? []).map((e: string) => e.toLowerCase())

    if (!currentEmails.includes(newEmail)) {
      currentEmails.push(newEmail)
    }

    const { data: updated, error: updateError } = await admin
      .from('meetings')
      .update({ allowed_emails: currentEmails })
      .eq('id', meeting.id)
      .select('allowed_emails')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to add email' }, { status: 500 })
    }

    return NextResponse.json({ allowedEmails: updated.allowed_emails ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
