'use client'

import { Copy, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useMeetingStore } from '@/store/meetingStore'
import { useUser } from '@/lib/hooks/useUser'
import { supabase } from '@/lib/supabase/client'

export default function ShareLink({ staticUrl }: { staticUrl?: string }) {
  const storeShareUrl = useMeetingStore(s => s.shareUrl)
  const isSaving      = useMeetingStore(s => s.isSaving)
  const saveMeeting   = useMeetingStore(s => s.saveMeeting)
  const user          = useUser()

  // staticUrl prop wins (used on detail pages where meeting is already saved)
  const shareUrl = staticUrl ?? storeShareUrl
  const fullUrl  = shareUrl
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${shareUrl}`
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl)
    toast.success('Link copied!')
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

      {shareUrl ? (
        <Card className="p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Your meeting link
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={fullUrl}
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={handleCopy}>
              <Copy size={16} />
            </Button>
          </div>
        </Card>
      ) : user ? (
        <Card className="p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="font-medium text-sm">Save &amp; generate link</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Creates a public read-only page anyone can open.
            </p>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={saveMeeting}
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
    </div>
  )
}
