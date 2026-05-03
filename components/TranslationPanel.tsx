'use client'

import { useState } from 'react'
import { Languages, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import type { MeetingData, Language, Task } from '@/types'
import SummaryCards from './SummaryCards'
import DecisionList from './DecisionList'
import TaskList from './TaskList'

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'my', label: 'မြန်မာ' },
]

interface Props {
  meeting: {
    summary:   string[]
    decisions: string[]
    tasks:     Task[]
  }
}

export default function TranslationPanel({ meeting }: Props) {
  const [targetLang, setTargetLang]   = useState<Language>('en')
  const [translated, setTranslated]   = useState<MeetingData | null>(null)
  const [loading, setLoading]         = useState(false)

  async function handleTranslate() {
    setLoading(true)
    setTranslated(null)
    try {
      const res = await fetch('/api/translate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          summary:  { summary: meeting.summary, decisions: meeting.decisions, tasks: meeting.tasks },
          language: targetLang,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Translation failed')
      setTranslated(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <Separator />

      <div className="flex items-center gap-2">
        <Languages size={16} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium">Translate Meeting Minutes</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => { setTargetLang(code); setTranslated(null) }}
            className={`rounded-full px-3 py-1 text-sm border transition-colors ${
              targetLang === code
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-border text-muted-foreground hover:border-indigo-400 hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}

        <Button
          size="sm"
          onClick={handleTranslate}
          disabled={loading}
          className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Translating…</>
            : 'Translate'
          }
        </Button>
      </div>

      {translated && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {LANGUAGES.find(l => l.code === targetLang)?.label} translation
          </p>
          <SummaryCards  summary={translated.summary} />
          <DecisionList  decisions={translated.decisions} />
          <TaskList      tasks={translated.tasks} />
        </div>
      )}
    </div>
  )
}
