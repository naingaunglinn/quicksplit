import Link from 'next/link'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import { Badge } from '@/components/ui/badge'
import { Mic, FileText, Video, ChevronRight } from 'lucide-react'

const inputIcons = {
  audio: Mic,
  video: Video,
  text:  FileText,
}

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-3">
          <p className="text-lg font-medium">Sign in to view your saved meetings</p>
          <p className="text-sm text-muted-foreground">
            Your meetings are linked to your account. Sign in from the header to access them.
          </p>
        </main>
      </>
    )
  }

  const { data: rows } = await supabase
    .from('meetings')
    .select('short_id, summary, input_type, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const meetings = rows ?? []

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Meetings</h1>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            + New meeting
          </Link>
        </div>

        {meetings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground text-sm">
            No saved meetings yet.{' '}
            <Link href="/" className="text-indigo-600 hover:underline">
              Process your first meeting
            </Link>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border overflow-hidden">
            {meetings.map(row => {
              const summary   = row.summary as { summary?: string[]; decisions?: string[] } | null
              const firstLine = summary?.summary?.[0] ?? 'Meeting notes'
              const inputType = (row.input_type ?? 'text') as 'text' | 'audio' | 'video'
              const Icon      = inputIcons[inputType]

              return (
                <li key={row.short_id}>
                  <Link
                    href={`/meeting/${row.short_id}`}
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors group"
                  >
                    <Icon size={16} className="text-muted-foreground shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{firstLine}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(row.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>

                    <Badge variant="outline" className="text-xs shrink-0 capitalize">
                      {inputType}
                    </Badge>

                    <ChevronRight size={14} className="text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

      </main>
    </>
  )
}
