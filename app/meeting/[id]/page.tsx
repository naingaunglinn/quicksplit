import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SavedMeeting } from '@/types'
import Header from '@/components/Header'
import MeetingReadOnly from '@/components/MeetingReadOnly'
import NotFound from '@/app/not-found'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('meetings')
    .select('*, tasks(*)')
    .eq('short_id', id)
    .single()

  if (error || !data) return <NotFound />

  const h      = await headers()
  const userId = h.get('x-user-id')

  const isOwner = userId && userId === data.user_id

  if (!isOwner) {
    if (data.share_token) {
      redirect(`/share/${data.share_token}`)
    }
    return <NotFound />
  }

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
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <Link
            href="/meetings"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> My Meetings
          </Link>
          <Link href="/">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
              <Plus size={14} /> New Meeting
            </Button>
          </Link>
        </div>

        <MeetingReadOnly meeting={meeting} />
      </main>
    </>
  )
}
