import { NextResponse } from 'next/server'
import formidable from 'formidable'
import { Readable } from 'stream'
import { IncomingMessage } from 'http'
import fs from 'fs'
import { nanoid } from 'nanoid'

export const runtime = 'nodejs'

// Optional endpoint — stores a file to Google Drive for long-term archival.
// Google Drive credentials (GOOGLE_SERVICE_ACCOUNT_JSON) must be configured.
// The transcription pipeline no longer calls this route; it processes in-memory.

const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav',
  'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a',
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  'video/x-matroska', 'video/webm',
])

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
      const fileBuffer = fs.readFileSync(file.filepath)
      fs.unlinkSync(file.filepath)
      resolve({ buffer: fileBuffer, mimeType: file.mimetype ?? '', fileName: file.originalFilename ?? 'upload' })
    })
  })
}

export async function POST(req: Request) {
  try {
    const { buffer, mimeType, fileName } = await parseMultipart(req)

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 })
    }

    // Lazy-import drive to avoid OpenSSL errors when credentials are not configured
    const { uploadFileToDrive } = await import('@/lib/drive')
    const safeFileName = `${nanoid()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { fileId } = await uploadFileToDrive(buffer, safeFileName, mimeType)

    return NextResponse.json({ fileId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
