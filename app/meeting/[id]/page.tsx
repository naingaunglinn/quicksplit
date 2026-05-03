import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SavedMeeting } from '@/types'
import Header from '@/components/Header'
import MeetingReadOnly from '@/components/MeetingReadOnly'

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('meetings')
    .select('*, tasks(*)')
    .eq('short_id', id)
    .single()

  if (error || !data) notFound()

  // Normalize DB row → SavedMeeting shape expected by MeetingReadOnly
  const meeting: SavedMeeting = {
    id:        data.short_id,
    shortId:   data.short_id,
    inputType: data.input_type as SavedMeeting['inputType'],
    createdAt: data.created_at,
    summary:   (data.summary as { summary: string[] }).summary ?? [],
    decisions: (data.summary as { decisions: string[] }).decisions ?? [],
    tasks:     (data.tasks ?? []).map((t: { owner: string; description: string; done: boolean }) => ({
      owner:       t.owner,
      description: t.description,
      done:        t.done,
    })),
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <MeetingReadOnly meeting={meeting} />
      </main>
    </>
  )
}
