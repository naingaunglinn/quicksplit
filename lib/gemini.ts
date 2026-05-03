import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'
import type { MeetingData } from '@/types'
import type { Language, Tone } from '@/types'
import { config } from './config'

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
]

// 18MB — safely below the 20MB inline data limit
const INLINE_LIMIT = 18 * 1024 * 1024

function getModel(systemInstruction?: string) {
  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY)
  return genAI.getGenerativeModel({
    model: config.GEMINI_MODEL,
    safetySettings,
    ...(systemInstruction ? { systemInstruction } : {}),
  })
}

// ── Transcription ────────────────────────────────────────────────────────────

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/mpeg'
): Promise<string> {
  const model = getModel(
    'You are a transcription assistant. Transcribe audio accurately. ' +
    'Return only the spoken words — no labels, no timestamps, no commentary.'
  )

  const prompt = 'Transcribe this audio. Return only the transcription text.'

  let result

  if (audioBuffer.length <= INLINE_LIMIT) {
    // Small file — send inline as base64
    result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: audioBuffer.toString('base64'), mimeType } },
          { text: prompt },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 8192 },
    })
  } else {
    // Large file — upload via File API, then reference by URI
    const fileManager = new GoogleAIFileManager(config.GEMINI_API_KEY)
    const tempPath = join('/tmp', `qs-${nanoid()}.mp3`)

    try {
      writeFileSync(tempPath, audioBuffer)
      const upload = await fileManager.uploadFile(tempPath, { mimeType, displayName: 'audio' })

      result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { fileData: { mimeType, fileUri: upload.file.uri } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 8192 },
      })
    } finally {
      try { unlinkSync(tempPath) } catch { /* best-effort cleanup */ }
    }
  }

  const text = result.response.candidates?.[0]?.content.parts[0]?.text
  if (!text?.trim()) throw new Error('Gemini returned an empty transcription')
  return text.trim()
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
    throw new Error('Gemini response missing required fields')
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
  const model = getModel(
    'You are a meeting intelligence assistant. Extract structured information ' +
    'from meeting transcripts. Return ONLY valid JSON. No explanation. No markdown. ' +
    'No code fences. No extra text.'
  )

  const result = await model.generateContent({
    contents:         [{ role: 'user', parts: [{ text: buildExtractionPrompt(transcript) }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' },
  })

  const candidate = result.response.candidates?.[0]
  if (!candidate) throw new Error('Content blocked by safety filter')

  const text = candidate.content.parts[0]?.text ?? ''

  try {
    return parseMeetingJson(text)
  } catch {
    // Retry once with a correction prompt
    const retryResult = await model.generateContent({
      contents: [
        { role: 'user',  parts: [{ text: buildExtractionPrompt(transcript) }] },
        { role: 'model', parts: [{ text }] },
        { role: 'user',  parts: [{ text: 'That was not valid JSON. Return ONLY the raw JSON object with no other text.' }] },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 1024, responseMimeType: 'application/json' },
    })

    const retryText = retryResult.response.candidates?.[0]?.content.parts[0]?.text ?? ''
    try {
      return parseMeetingJson(retryText)
    } catch {
      throw new Error('Gemini returned invalid JSON after retry')
    }
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
  const model = getModel(
    'You are a professional translator. Translate meeting content accurately. ' +
    'Return ONLY valid JSON. No explanation. No markdown.'
  )

  const prompt = `Translate all text fields to ${languageNames[targetLanguage]}. Keep owner names (people's names) unchanged. Return ONLY this JSON structure:
{
  "summary":   [translated string array],
  "decisions": [translated string array],
  "tasks":     [{ "owner": unchanged string, "description": translated string }]
}

Input:
${JSON.stringify({ summary: meeting.summary, decisions: meeting.decisions, tasks: meeting.tasks.map(t => ({ owner: t.owner, description: t.description })) })}`

  const result = await model.generateContent({
    contents:         [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' },
  })

  const text = result.response.candidates?.[0]?.content.parts[0]?.text ?? ''
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

  const result = await getModel().generateContent({
    contents:         [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
  })

  const text = result.response.candidates?.[0]?.content.parts[0]?.text
  if (!text) throw new Error('Gemini returned empty email draft')
  return text.trim()
}
