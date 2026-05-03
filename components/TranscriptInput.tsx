'use client'

import { useRef } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Upload } from 'lucide-react'
import { useMeetingStore } from '@/store/meetingStore'
import { toast } from 'sonner'

const MAX_CHARS = 50000

function parseVtt(raw: string): string {
  return raw
    .split('\n')
    .filter(line => {
      if (line.trim() === 'WEBVTT') return false
      if (/^\d{2}:\d{2}[:\d]*\.\d+ -->/.test(line)) return false
      // strip cue identifiers: lines that are purely numeric or a bare word before a timestamp block
      if (/^\d+$/.test(line.trim())) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function TranscriptInput() {
  const transcript    = useMeetingStore(s => s.transcript)
  const setTranscript = useMeetingStore(s => s.setTranscript)
  const tooLong       = transcript.length > MAX_CHARS
  const fileInputRef  = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.name.match(/\.(txt|vtt)$/i)) {
      toast.error('Only .txt and .vtt files are supported')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const raw = e.target?.result as string
      const text = file.name.toLowerCase().endsWith('.vtt') ? parseVtt(raw) : raw.trim()
      setTranscript(text)
      toast.success(`Loaded ${file.name}`)
    }
    reader.readAsText(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2" onDrop={onDrop} onDragOver={e => e.preventDefault()}>
      <div className="relative">
        <Textarea
          placeholder="Paste your meeting transcript here, or drop a .txt / .vtt file..."
          className="min-h-[280px] resize-none font-mono text-sm"
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground bg-background border hover:bg-muted transition-colors"
        >
          <Upload size={12} /> Upload .txt / .vtt
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.vtt"
        className="hidden"
        onChange={onFileChange}
      />
      <span className={`text-xs ${tooLong ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
        {transcript.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
      </span>
      {tooLong && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Transcript too long</AlertTitle>
          <AlertDescription>
            Transcript exceeds 50,000 characters. Please shorten it.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
