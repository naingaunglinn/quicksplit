import OpenAI from 'openai'
import { Readable } from 'stream'
import { config } from './config'

function getClient() {
  return new OpenAI({ apiKey: config.OPENAI_API_KEY })
}

export async function transcribeStream(
  audioStream: NodeJS.ReadableStream,
  fileName: string
): Promise<string> {
  // Whisper SDK requires a File-like object with a name property
  const readable = audioStream instanceof Readable
    ? audioStream
    : Readable.from(audioStream as AsyncIterable<Buffer>)

  const openai = getClient()
  const file = await OpenAI.toFile(readable, fileName, { type: 'audio/mpeg' })

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
