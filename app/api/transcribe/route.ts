import { NextResponse } from 'next/server'
import { Readable } from 'stream'
import { extractAudioFromStream } from '@/lib/ffmpeg'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav',
  'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a',
])

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  'video/x-matroska', 'video/webm',
])

const ALLOWED_MIME_TYPES = new Set([...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES])

async function parseFormFile(req: Request): Promise<{ buffer: Buffer; mimeType: string }> {
  const formData  = await req.formData()
  const fileEntry = formData.get('file')

  if (!fileEntry || typeof fileEntry === 'string') throw new Error('No file field in request')

  const file = fileEntry as File
  return {
    buffer:   Buffer.from(await file.arrayBuffer()),
    mimeType: file.type || '',
  }
}

export async function POST(req: Request) {
  try {
    const { buffer, mimeType } = await parseFormFile(req)

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Accepted: MP3, WAV, M4A, WebM, OGG, MP4, MOV, MKV.` },
        { status: 400 }
      )
    }

    let audioBuffer: Buffer

    if (ALLOWED_VIDEO_TYPES.has(mimeType)) {
      audioBuffer = await extractAudioFromStream(Readable.from(buffer))
    } else {
      audioBuffer = buffer
    }

    const audioMimeType = ALLOWED_VIDEO_TYPES.has(mimeType) ? 'audio/mpeg' : mimeType
    const provider      = config.TRANSCRIPTION_PROVIDER || config.AI_PROVIDER

    let transcript: string
    if (provider === 'openai') {
      if (!config.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'AI_PROVIDER is set to "openai" but OPENAI_API_KEY is not configured.' },
          { status: 500 }
        )
      }
      const { transcribeAudio } = await import('@/lib/openai')
      transcript = await transcribeAudio(audioBuffer, audioMimeType)
    } else {
      const { transcribeAudio } = await import('@/lib/gemini')
      transcript = await transcribeAudio(audioBuffer, audioMimeType)
    }

    return NextResponse.json({ transcript })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
