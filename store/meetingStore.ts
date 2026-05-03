'use client'

import { create } from 'zustand'
import { toast } from 'sonner'
import type { InputMode, Language, Task, Tone } from '@/types'

interface MeetingStore {
  // ── Input ──────────────────────────────────────────────────
  inputMode:  InputMode
  transcript: string
  uploadFile: File | null

  // ── Processing flags ────────────────────────────────────────
  isUploading:    boolean
  isTranscribing: boolean
  isExtracting:   boolean
  isDrafting:     boolean
  isSaving:       boolean

  // ── Results ─────────────────────────────────────────────────
  summary:   string[]
  decisions: string[]
  tasks:     Task[]
  email:      string
  meetingId:  string | null
  shareUrl:   string | null
  shareToken: string | null

  // ── Email options ───────────────────────────────────────────
  language: Language
  tone:     Tone

  // ── Integrations ────────────────────────────────────────────
  slackChannel:    string
  teamsWebhookUrl: string
  slackSent:       boolean
  teamsSent:       boolean

  // ── Error ───────────────────────────────────────────────────
  error: string | null

  // ── Actions ─────────────────────────────────────────────────
  setInputMode(mode: InputMode): void
  setTranscript(text: string): void
  setUploadFile(file: File | null): void
  setLanguage(lang: Language): void
  setTone(tone: Tone): void
  setEmail(email: string): void
  setSlackChannel(channel: string): void
  setTeamsWebhookUrl(url: string): void

  runTranscription(): Promise<void>
  runExtraction(): Promise<void>
  runEmailDraft(): Promise<void>
  saveMeeting(): Promise<void>
  pushToSlack(): Promise<void>
  pushToTeams(): Promise<void>

  clearError(): void
  reset(): void
}

async function apiFetch<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  // ── Input ──────────────────────────────────────────────────
  inputMode:  'text',
  transcript: '',
  uploadFile: null,

  // ── Processing flags ────────────────────────────────────────
  isUploading:    false,
  isTranscribing: false,
  isExtracting:   false,
  isDrafting:     false,
  isSaving:       false,

  // ── Results ─────────────────────────────────────────────────
  summary:   [],
  decisions: [],
  tasks:     [],
  email:      '',
  meetingId:  null,
  shareUrl:   null,
  shareToken: null,

  // ── Email options ───────────────────────────────────────────
  language: 'en',
  tone:     'casual',

  // ── Integrations ────────────────────────────────────────────
  slackChannel:    '',
  teamsWebhookUrl: '',
  slackSent:       false,
  teamsSent:       false,

  // ── Error ───────────────────────────────────────────────────
  error: null,

  // ── Setters ─────────────────────────────────────────────────
  setInputMode:       (mode)    => set({ inputMode: mode }),
  setTranscript:      (text)    => set({ transcript: text }),
  setUploadFile:      (file)    => set({ uploadFile: file }),
  setLanguage:        (lang)    => set({ language: lang }),
  setTone:            (tone)    => set({ tone }),
  setEmail:           (email)   => set({ email }),
  setSlackChannel:    (channel) => set({ slackChannel: channel }),
  setTeamsWebhookUrl: (url)     => set({ teamsWebhookUrl: url }),

  runTranscription: async () => {
    const { uploadFile } = get()
    if (!uploadFile) return

    try {
      set({ isUploading: true, error: null })

      const uploadForm = new FormData()
      uploadForm.append('file', uploadFile)

      // Upload + transcribe in one POST — server handles Drive + Whisper
      set({ isUploading: false, isTranscribing: true })

      const transcribeForm = new FormData()
      transcribeForm.append('file', uploadFile)

      const { transcript } = await apiFetch<{ transcript: string }>(
        '/api/transcribe',
        { method: 'POST', body: transcribeForm }
      )

      set({ isTranscribing: false, transcript })

      // Auto-run extraction on the returned transcript
      await get().runExtraction()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed'
      set({ isUploading: false, isTranscribing: false, error: message })
      toast.error(message)
    }
  },

  runExtraction: async () => {
    const { transcript } = get()
    try {
      set({ isExtracting: true, error: null })

      const data = await apiFetch<{ summary: string[]; decisions: string[]; tasks: Task[] }>(
        '/api/extract',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ transcript }),
        }
      )

      set({
        isExtracting: false,
        summary:      data.summary,
        decisions:    data.decisions,
        tasks:        data.tasks,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed'
      set({ isExtracting: false, error: message })
      toast.error(message)
    }
  },

  runEmailDraft: async () => {
    const { summary, decisions, tasks, language, tone } = get()
    try {
      set({ isDrafting: true, error: null })

      const { email } = await apiFetch<{ email: string }>(
        '/api/email',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ summary: { summary, decisions, tasks }, language, tone }),
        }
      )

      set({ isDrafting: false, email })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email draft failed'
      set({ isDrafting: false, error: message })
      toast.error(message)
    }
  },

  saveMeeting: async () => {
    const { transcript, summary, decisions, tasks, inputMode } = get()
    try {
      set({ isSaving: true, error: null })

      const { id, url, shareToken } = await apiFetch<{ id: string; url: string; shareToken: string }>(
        '/api/save',
        {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify({
            transcript,
            summary:   { summary, decisions, tasks },
            inputType: inputMode,
          }),
        }
      )

      set({ isSaving: false, meetingId: id, shareUrl: `/meeting/${id}`, shareToken })
      toast.success('Meeting saved!')
      void url // url returned from API — shareUrl is derived locally for consistency
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      set({ isSaving: false, error: message })
      toast.error(message)
    }
  },

  pushToSlack: async () => {
    const { meetingId, slackChannel, summary, decisions, tasks } = get()
    if (!slackChannel || !meetingId) return

    try {
      set({ error: null })
      await apiFetch(
        '/api/integrations/slack',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            meetingId,
            channel: slackChannel,
            summary: { summary, decisions, tasks },
          }),
        }
      )
      set({ slackSent: true })
      toast.success('Sent to Slack!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Slack push failed'
      set({ error: message })
      toast.error(message)
    }
  },

  pushToTeams: async () => {
    const { meetingId, teamsWebhookUrl, summary, decisions, tasks } = get()
    if (!teamsWebhookUrl || !meetingId) return

    try {
      set({ error: null })
      await apiFetch(
        '/api/integrations/teams',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            meetingId,
            webhookUrl: teamsWebhookUrl,
            summary:    { summary, decisions, tasks },
          }),
        }
      )
      set({ teamsSent: true })
      toast.success('Sent to Microsoft Teams!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Teams push failed'
      set({ error: message })
      toast.error(message)
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    inputMode:       'text',
    transcript:      '',
    uploadFile:      null,
    isUploading:     false,
    isTranscribing:  false,
    isExtracting:    false,
    isDrafting:      false,
    isSaving:        false,
    summary:         [],
    decisions:       [],
    tasks:           [],
    email:           '',
    meetingId:       null,
    shareUrl:        null,
    shareToken:      null,
    language:        'en',
    tone:            'casual',
    slackChannel:    '',
    teamsWebhookUrl: '',
    slackSent:       false,
    teamsSent:       false,
    error:           null,
  }),
}))
