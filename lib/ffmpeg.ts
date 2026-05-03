import Ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import { PassThrough, Readable } from 'stream'

Ffmpeg.setFfmpegPath(ffmpegPath.path)

export async function extractAudioFromStream(
  inputStream: NodeJS.ReadableStream
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const output = new PassThrough()

    output.on('data', (chunk: Buffer) => chunks.push(chunk))
    output.on('end', () => resolve(Buffer.concat(chunks)))
    output.on('error', err => reject(new Error(`Audio output stream error: ${err.message}`)))

    // Ensure we have a Node.js Readable (not a Web ReadableStream)
    const nodeStream = inputStream instanceof Readable
      ? inputStream
      : Readable.from(inputStream as AsyncIterable<Buffer>)

    Ffmpeg(nodeStream)
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .audioChannels(1)
      .format('mp3')
      .on('error', (err: Error) =>
        reject(new Error(`ffmpeg audio extraction failed: ${err.message}`))
      )
      .pipe(output, { end: true })
  })
}
