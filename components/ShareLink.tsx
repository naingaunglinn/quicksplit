'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useMeetingStore } from '@/store/meetingStore'

export default function ShareLink() {
  const shareUrl   = useMeetingStore(s => s.shareUrl)
  const isSaving   = useMeetingStore(s => s.isSaving)
  const saveMeeting = useMeetingStore(s => s.saveMeeting)

  const fullUrl = shareUrl
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${shareUrl}`
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl)
    toast.success('Link copied!')
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Share This Meeting
      </p>

      {!shareUrl ? (
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
      ) : (
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
      )}
    </div>
  )
}
