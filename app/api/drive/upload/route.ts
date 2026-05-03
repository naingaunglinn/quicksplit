import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export const runtime = 'nodejs'

// Optional endpoint — stores a file to Google Drive for long-term archival.
// Google Drive credentials (GOOGLE_SERVICE_ACCOUNT_JSON) must be configured.

const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav',
  'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a',
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  'video/x-matroska', 'video/webm',
])

export async function POST(req: Request) {
  try {
    const formData  = await req.formData()
    const fileEntry = formData.get('file')

    if (!fileEntry || typeof fileEntry === 'string') {
      return NextResponse.json({ error: 'No file field in request' }, { status: 400 })
    }

    const file     = fileEntry as File
    const mimeType = file.type || ''
    const fileName = file.name || 'upload'

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 })
    }

    const buffer      = Buffer.from(await file.arrayBuffer())
    const safeFileName = `${nanoid()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { uploadFileToDrive } = await import('@/lib/drive')
    const { fileId } = await uploadFileToDrive(buffer, safeFileName, mimeType)

    return NextResponse.json({ fileId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
