import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { signToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth'

export const runtime = 'nodejs'

const schema = z.object({ token: z.string().min(32).max(128) })

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid sign-in link' }, { status: 400 })
    }

    const { token } = parsed.data
    const admin     = createAdminClient()

    const { data: row, error: selectErr } = await admin
      .from('auth_tokens')
      .select('id, email, expires_at, used')
      .eq('token', token)
      .maybeSingle()

    if (selectErr) {
      throw new Error(selectErr.message)
    }
    if (!row) {
      return NextResponse.json({ error: 'Invalid sign-in link' }, { status: 400 })
    }
    if (row.used) {
      return NextResponse.json({ error: 'This sign-in link has already been used.' }, { status: 400 })
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This sign-in link has expired. Please request a new one.' }, { status: 400 })
    }

    const { error: updateErr } = await admin
      .from('auth_tokens')
      .update({ used: true })
      .eq('id', row.id)
      .eq('used', false)
      .select('id')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: 'This sign-in link has already been used.' }, { status: 400 })
    }

    const email = row.email.trim().toLowerCase()

    const { data: existing, error: profileSelectErr } = await admin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (profileSelectErr) {
      throw new Error(profileSelectErr.message)
    }

    let userId: string
    if (existing) {
      userId = existing.id
    } else {
      const { data: created, error: insertErr } = await admin
        .from('profiles')
        .insert({ email })
        .select('id')
        .single()

      if (insertErr || !created) {
        throw new Error(insertErr?.message ?? 'Failed to create user profile')
      }
      userId = created.id
    }

    const jwtToken = signToken({ sub: userId, email })

    const res = NextResponse.json({ ok: true })
    res.cookies.set({
      name:     SESSION_COOKIE,
      value:    jwtToken,
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   SESSION_MAX_AGE_SECONDS,
    })
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete sign-in'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
