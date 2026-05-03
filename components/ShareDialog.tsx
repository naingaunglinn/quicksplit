'use client'

import { useEffect, useState } from 'react'
import { Copy, X, Plus, Lock, Link2, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type ShareMode = 'private' | 'public_link' | 'restricted'

interface ShareSettings {
  mode:          ShareMode
  shareToken:    string | null
  allowedEmails: string[]
}

interface Props {
  meetingId:    string
  open:         boolean
  onOpenChange: (open: boolean) => void
}

export default function ShareDialog({ meetingId, open, onOpenChange }: Props) {
  const [settings, setSettings]     = useState<ShareSettings | null>(null)
  const [loading, setLoading]       = useState(false)
  const [updating, setUpdating]     = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)

  useEffect(() => {
    if (!open || !meetingId) return
    setLoading(true)
    fetch(`/api/meetings/${meetingId}/share`)
      .then(r => r.json())
      .then((data: ShareSettings) => setSettings(data))
      .catch(() => toast.error('Failed to load share settings'))
      .finally(() => setLoading(false))
  }, [open, meetingId])

  async function handleModeChange(mode: ShareMode) {
    if (!settings || updating) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}/share`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setSettings(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update share mode')
    } finally {
      setUpdating(false)
    }
  }

  async function handleAddEmail(e: React.FormEvent) {
    e.preventDefault()
    const email = emailInput.trim()
    if (!email || !settings) return
    setAddingEmail(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}/share/emails`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add email')
      setSettings(prev => prev ? { ...prev, allowedEmails: data.allowedEmails } : prev)
      setEmailInput('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add email')
    } finally {
      setAddingEmail(false)
    }
  }

  async function handleRemoveEmail(email: string) {
    if (!settings) return
    try {
      const res = await fetch(
        `/api/meetings/${meetingId}/share/emails/${encodeURIComponent(email)}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to remove email')
      setSettings(prev => prev ? { ...prev, allowedEmails: data.allowedEmails } : prev)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove email')
    }
  }

  function handleCopyLink() {
    if (!settings?.shareToken) return
    const link = `${window.location.origin}/share/${settings.shareToken}`
    navigator.clipboard.writeText(link)
    toast.success('Link copied!')
  }

  const shareLink = settings?.shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${settings.shareToken}`
    : null

  const options: { value: ShareMode; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value:       'private',
      label:       'Private',
      description: 'Only you can view this meeting',
      icon:        <Lock size={14} />,
    },
    {
      value:       'public_link',
      label:       'Public Link',
      description: 'Anyone with the link can view',
      icon:        <Link2 size={14} />,
    },
    {
      value:       'restricted',
      label:       'Restricted',
      description: 'Only specific people can view',
      icon:        <Users size={14} />,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Meeting</DialogTitle>
        </DialogHeader>

        {loading || !settings ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading share settings…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode selector */}
            <div className="space-y-2">
              {options.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    settings.mode === opt.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-border hover:bg-muted/50'
                  } ${updating ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type="radio"
                    name="share-mode"
                    value={opt.value}
                    checked={settings.mode === opt.value}
                    onChange={() => handleModeChange(opt.value)}
                    className="mt-0.5 accent-indigo-600"
                    disabled={updating}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {opt.icon}
                      {opt.label}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Private note */}
            {settings.mode === 'private' && (
              <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
                Only you can view this meeting. No link will work for others.
              </p>
            )}

            {/* Copy link */}
            {(settings.mode === 'public_link' || settings.mode === 'restricted') && shareLink && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Share link</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareLink}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    <Copy size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Restricted: email list */}
            {settings.mode === 'restricted' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Allowed emails</p>
                  {settings.allowedEmails.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No emails added yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {settings.allowedEmails.map(email => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {email}
                          <button
                            onClick={() => handleRemoveEmail(email)}
                            className="ml-0.5 hover:text-destructive transition-colors"
                            aria-label={`Remove ${email}`}
                          >
                            <X size={11} />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddEmail} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="text-sm"
                    disabled={addingEmail}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={addingEmail || !emailInput.trim()}
                  >
                    <Plus size={14} />
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
