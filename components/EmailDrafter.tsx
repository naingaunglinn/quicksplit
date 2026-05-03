'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Follow-up Email
      </p>
      <Card className="p-5 space-y-4 shadow-sm">
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

        {email && (
          <div className="space-y-2">
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
          </div>
        )}

        {!email && !isDrafting && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Choose a language and tone, then click Draft Email.
          </p>
        )}

        {isDrafting && (
          <p className="text-sm text-muted-foreground text-center py-6 animate-pulse">
            Writing your follow-up email...
          </p>
        )}
      </Card>
    </div>
  )
}
