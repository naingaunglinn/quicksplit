import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*, tasks(*)')
      .eq('short_id', id)
      .single()

    if (error || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    return NextResponse.json(meeting)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch meeting'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
