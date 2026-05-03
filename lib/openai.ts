import OpenAI from 'openai'
import { Readable } from 'stream'
import type { MeetingData } from '@/types'
import type { Language, Tone } from '@/types'
import { config } from './config'

function getClient() {
  return new OpenAI({ apiKey: config.OPENAI_API_KEY })
}

// ── Transcription ────────────────────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  'audio/mpeg':  'mp3',
  'audio/mp3':   'mp3',
  'audio/mp4':   'mp4',
  'audio/m4a':   'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav':   'wav',
  'audio/x-wav': 'wav',
  'audio/webm':  'webm',
  'audio/ogg':   'ogg',
  'audio/oga':   'oga',
  'audio/flac':  'flac',
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/mpeg'
): Promise<string> {
  const openai = getClient()
  const ext    = MIME_TO_EXT[mimeType] ?? 'mp3'
  const file   = await OpenAI.toFile(Readable.from(audioBuffer), `audio.${ext}`, { type: mimeType })

  const response = await openai.audio.transcriptions.create({
    file,
    model:           'whisper-1',
    response_format: 'text',
  })

  if (typeof response !== 'string' || !response.trim()) {
    throw new Error('Whisper returned an empty transcript')
  }
  return response
}

// ── Meeting extraction ───────────────────────────────────────────────────────

function buildExtractionPrompt(transcript: string): string {
  return `Extract from this transcript and return ONLY this JSON:
{
  "summary":   [exactly 3 short bullet strings],
  "decisions": [array of decision strings],
  "tasks":     [{ "owner": string, "description": string }]
}

Transcript:
${transcript}`
}

function parseMeetingJson(text: string): MeetingData {
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const parsed  = JSON.parse(cleaned)

  if (
    !Array.isArray(parsed.summary) ||
    !Array.isArray(parsed.decisions) ||
    !Array.isArray(parsed.tasks)
  ) {
    throw new Error('Response missing required fields')
  }

  return {
    summary:   parsed.summary,
    decisions: parsed.decisions,
    tasks: parsed.tasks.map((t: { owner: string; description: string }) => ({
      owner:       String(t.owner ?? ''),
      description: String(t.description ?? ''),
      done:        false,
    })),
  }
}

export async function extractMeetingData(transcript: string): Promise<MeetingData> {
  const openai = getClient()

  const response = await openai.chat.completions.create({
    model: config.OPENAI_MODEL,
    messages: [
      {
        role:    'system',
        content: 'You are a meeting intelligence assistant. Extract structured information from meeting transcripts. Return ONLY valid JSON. No explanation. No markdown. No code fences. No extra text.',
      },
      { role: 'user', content: buildExtractionPrompt(transcript) },
    ],
    temperature:      0.2,
    max_tokens:       1024,
    response_format:  { type: 'json_object' },
  })

  const text = response.choices[0]?.message?.content ?? ''

  try {
    return parseMeetingJson(text)
  } catch {
    throw new Error('OpenAI returned invalid JSON for meeting extraction')
  }
}

// ── Translation ──────────────────────────────────────────────────────────────

const languageNames: Record<Language, string> = {
  en: 'English',
  ja: 'Japanese',
  my: 'Burmese (Myanmar)',
}

export async function translateMeetingData(
  meeting: MeetingData,
  targetLanguage: Language
): Promise<MeetingData> {
  const openai = getClient()

  const prompt = `Translate all text fields to ${languageNames[targetLanguage]}. Keep owner names (people's names) unchanged. Return ONLY this JSON structure:
{
  "summary":   [translated string array],
  "decisions": [translated string array],
  "tasks":     [{ "owner": unchanged string, "description": translated string }]
}

Input:
${JSON.stringify({ summary: meeting.summary, decisions: meeting.decisions, tasks: meeting.tasks.map(t => ({ owner: t.owner, description: t.description })) })}`

  const response = await openai.chat.completions.create({
    model: config.OPENAI_MODEL,
    messages: [
      { role: 'system', content: 'You are a professional translator. Return ONLY valid JSON. No explanation. No markdown.' },
      { role: 'user',   content: prompt },
    ],
    temperature:     0.1,
    max_tokens:      2048,
    response_format: { type: 'json_object' },
  })

  const text    = response.choices[0]?.message?.content ?? ''
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const parsed  = JSON.parse(cleaned)

  return {
    summary:   parsed.summary,
    decisions: parsed.decisions,
    tasks: (parsed.tasks as { owner: string; description: string }[]).map((t, i) => ({
      owner:       t.owner,
      description: t.description,
      done:        meeting.tasks[i]?.done ?? false,
    })),
  }
}

// ── Email drafting ───────────────────────────────────────────────────────────

const toneDescriptions: Record<Tone, string> = {
  casual: "Friendly startup tone. Open with 'Hey team,'. Short and conversational.",
  direct: 'Direct and action-oriented. Lead with numbered action items and deadlines. No filler text.',
  keigo:  'Formal Japanese Keigo business style. Use honorifics and grateful framing. Indirect phrasing throughout. Never use blunt commands. Open formally. Close with appreciation.',
}

const languageInstructions: Record<Language, string> = {
  en: 'Write the email body in English.',
  ja: 'Write the email body in Japanese. Apply Keigo (敬語) if tone is keigo, else polite Japanese.',
  my: 'Write the email body in Burmese (Myanmar language).',
}

export async function draftFollowUpEmail(
  meeting: MeetingData,
  language: Language,
  tone: Tone
): Promise<string> {
  const openai = getClient()

  const prompt = `Write a follow-up email for the meeting below.

Tone: ${toneDescriptions[tone]}
${languageInstructions[language]}
Return only the email body — no subject line, no explanation.

Summary:
${meeting.summary.map(s => `- ${s}`).join('\n')}

Decisions:
${meeting.decisions.map(d => `- ${d}`).join('\n')}

Action Items:
${meeting.tasks.map(t => `- ${t.owner}: ${t.description}`).join('\n')}`

  const response = await openai.chat.completions.create({
    model:       config.OPENAI_MODEL,
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens:  800,
  })

  const text = response.choices[0]?.message?.content
  if (!text) throw new Error('OpenAI returned empty email draft')
  return text.trim()
}
