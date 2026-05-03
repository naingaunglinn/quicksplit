import { NextResponse } from 'next/server'
import formidable from 'formidable'
import { Readable } from 'stream'
import { IncomingMessage } from 'http'
import fs from 'fs'
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

async function parseMultipart(req: Request): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const form = formidable({ maxFileSize: 200 * 1024 * 1024 })

  const arrayBuffer = await req.arrayBuffer()
  const reqBuffer   = Buffer.from(arrayBuffer)
  const contentType = req.headers.get('content-type') ?? ''

  const nodeReq = Object.assign(Readable.from(reqBuffer), {
    headers: { 'content-type': contentType, 'content-length': String(reqBuffer.length) },
    method:  'POST',
  }) as unknown as IncomingMessage

  return new Promise((resolve, reject) => {
    form.parse(nodeReq, (err, _fields, files) => {
      if (err) return reject(new Error(`Form parse error: ${err.message}`))

      const fileField = files.file
      const file = Array.isArray(fileField) ? fileField[0] : fileField
      if (!file) return reject(new Error('No file field in request'))

      const mimeType   = file.mimetype ?? ''
      const fileName   = file.originalFilename ?? 'upload'
      const fileBuffer = fs.readFileSync(file.filepath)
      fs.unlinkSync(file.filepath)

      resolve({ buffer: fileBuffer, mimeType, fileName })
    })
  })
}

export async function POST(req: Request) {
  try {
    const { buffer, mimeType } = await parseMultipart(req)

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Accepted: MP3, WAV, M4A, WebM, OGG, MP4, MOV, MKV.` },
        { status: 400 }
      )
    }

    let audioBuffer: Buffer

    if (ALLOWED_VIDEO_TYPES.has(mimeType)) {
      // Extract audio track from video in-memory — no Drive needed
      const videoStream = Readable.from(buffer)
      audioBuffer = await extractAudioFromStream(videoStream)
    } else {
      audioBuffer = buffer
    }

    const audioMimeType = ALLOWED_VIDEO_TYPES.has(mimeType) ? 'audio/mpeg' : mimeType
    const provider = config.TRANSCRIPTION_PROVIDER || config.AI_PROVIDER

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
