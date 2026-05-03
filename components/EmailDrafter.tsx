'use client'

import { useState } from 'react'
import { Copy, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useMeetingStore } from '@/store/meetingStore'
import type { Language, Tone } from '@/types'

export default function EmailDrafter() {
  const language      = useMeetingStore(s => s.language)
  const tone          = useMeetingStore(s => s.tone)
  const email         = useMeetingStore(s => s.email)
  const isDrafting    = useMeetingStore(s => s.isDrafting)
  const setLanguage   = useMeetingStore(s => s.setLanguage)
  const setTone       = useMeetingStore(s => s.setTone)
  const setEmail      = useMeetingStore(s => s.setEmail)
  const runEmailDraft = useMeetingStore(s => s.runEmailDraft)

  const [toEmail,   setToEmail]   = useState('')
  const [subject,   setSubject]   = useState('Meeting Follow-up')
  const [sending,   setSending]   = useState(false)

  async function handleSend() {
    if (!email.trim())    return toast.error('Draft an email first')
    if (!toEmail.trim())  return toast.error('Enter a recipient email address')
    if (!subject.trim())  return toast.error('Enter a subject line')

    setSending(true)
    try {
      const res  = await fetch('/api/email/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: toEmail.trim(), subject: subject.trim(), body: email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      toast.success(`Email sent to ${toEmail}!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Follow-up Email
      </p>
      <Card className="p-5 space-y-4 shadow-sm">

        {/* Draft controls */}
        <div className="flex gap-3 flex-wrap">
          <Select value={language} onValueChange={v => setLanguage(v as Language)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="my">Burmese</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tone} onValueChange={v => setTone(v as Tone)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="casual">Startup Casual</SelectItem>
              <SelectItem value="direct">Direct &amp; Action-Oriented</SelectItem>
              <SelectItem value="keigo">Formal (Keigo)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={runEmailDraft}
            disabled={isDrafting}
          >
            {isDrafting ? 'Drafting...' : 'Draft Email'}
          </Button>
        </div>

        {!email && !isDrafting && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Choose a language and tone, then click Draft Email.
          </p>
        )}

        {isDrafting && (
          <p className="text-sm text-muted-foreground text-center py-4 animate-pulse">
            Writing your follow-up email...
          </p>
        )}

        {email && (
          <>
            <Textarea
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="min-h-[220px] text-sm font-mono"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(email); toast.success('Email copied!') }}
              >
                <Copy size={13} className="mr-1.5" /> Copy
              </Button>
            </div>

            {/* Send section */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Send via email</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Recipient email"
                  value={toEmail}
                  onChange={e => setToEmail(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleSend}
                disabled={sending}
              >
                {sending
                  ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Sending…</>
                  : <><Send size={14} className="mr-1.5" /> Send Email</>
                }
              </Button>
            </div>
          </>
        )}

      </Card>
    </div>
  )
}
