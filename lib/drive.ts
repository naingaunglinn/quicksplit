import { google } from 'googleapis'
import { Readable } from 'stream'
import { config } from './config'

function getAuth() {
  const credentials = JSON.parse(config.GOOGLE_SERVICE_ACCOUNT_JSON)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() })
}

export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string }> {
  const drive = getDrive()
  const stream = Readable.from(buffer)

  const res = await drive.files.create({
    requestBody: {
      name:    fileName,
      parents: [config.GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id',
  })

  const fileId = res.data.id
  if (!fileId) throw new Error('Drive upload failed: no file ID returned')
  return { fileId }
}

export async function getReadableStream(
  fileId: string
): Promise<NodeJS.ReadableStream> {
  const drive = getDrive()

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  )

  return res.data as NodeJS.ReadableStream
}

export async function deleteFile(fileId: string): Promise<void> {
  try {
    const drive = getDrive()
    await drive.files.delete({ fileId })
  } catch (err) {
    // Log but never throw — cleanup must not mask the original error
    console.warn(`[drive] Failed to delete file ${fileId}:`, err)
  }
}
