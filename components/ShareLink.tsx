'use client'

import { useState } from 'react'
import { Share2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useMeetingStore } from '@/store/meetingStore'
import { useUser } from '@/lib/hooks/useUser'
import ShareDialog from '@/components/ShareDialog'

interface Props {
  staticUrl?:  string
  meetingId?:  string
}

export default function ShareLink({ staticUrl: _staticUrl, meetingId }: Props) {
  const storeMeetingId = useMeetingStore(s => s.meetingId)
  const isSaving       = useMeetingStore(s => s.isSaving)
  const saveMeeting    = useMeetingStore(s => s.saveMeeting)
  const user           = useUser()

  const [dialogOpen, setDialogOpen] = useState(false)

  const effectiveMeetingId = meetingId ?? storeMeetingId

  async function handleSaveAndShare() {
    await saveMeeting()
    setDialogOpen(true)
  }

  async function handleSignIn() {
    const email = prompt('Enter your email to receive a sign-in link:')
    if (!email?.trim()) return
    const res  = await fetch('/api/auth/magic-link', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json()
    if (!res.ok) toast.error(data.error ?? 'Failed to send sign-in link')
    else toast.success(`Sign-in link sent to ${email}`)
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Share This Meeting
      </p>

      {effectiveMeetingId ? (
        <Card className="p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="font-medium text-sm">Manage sharing</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control who can view this meeting.
            </p>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setDialogOpen(true)}
          >
            <Share2 size={14} className="mr-1.5" /> Share
          </Button>
        </Card>
      ) : user ? (
        <Card className="p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="font-medium text-sm">Save &amp; generate link</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Save this meeting to manage sharing settings.
            </p>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSaveAndShare}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save & Share'}
          </Button>
        </Card>
      ) : user === null ? (
        <Card className="p-5 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <p className="font-medium text-sm">Sign in to save &amp; share</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your meeting results won&apos;t be stored unless you sign in.
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={handleSignIn}
          >
            <LogIn size={14} className="mr-1.5" /> Sign in
          </Button>
        </Card>
      ) : null}

      {effectiveMeetingId && (
        <ShareDialog
          meetingId={effectiveMeetingId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  )
}
