'use client'

import { useCallback } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { toast } from 'sonner'
import { CheckCircle2, Mic, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMeetingStore } from '@/store/meetingStore'

const MAX_SIZE = 200 * 1024 * 1024 // 200MB

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function truncate(name: string, max = 40) {
  return name.length > max ? name.slice(0, max - 3) + '...' : name
}

export default function AudioUpload() {
  const uploadFile   = useMeetingStore(s => s.uploadFile)
  const setUploadFile = useMeetingStore(s => s.setUploadFile)

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    if (rejected.length > 0) {
      const code = rejected[0]?.errors[0]?.code
      if (code === 'file-too-large') toast.error('File exceeds 200MB limit.')
      else toast.error('Invalid file type. Use MP3, WAV, M4A, WebM, or OGG.')
      return
    }
    if (accepted[0]) setUploadFile(accepted[0])
  }, [setUploadFile])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.webm', '.ogg'] },
    maxFiles: 1,
    maxSize: MAX_SIZE,
    noClick: !!uploadFile,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors
        ${isDragActive
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-neutral-300 hover:border-neutral-400 cursor-pointer'
        }
        ${uploadFile ? 'cursor-default' : ''}
      `}
    >
      <input {...getInputProps()} />

      {uploadFile ? (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 size={36} className="text-green-500" />
          <p className="font-medium text-sm">{truncate(uploadFile.name)}</p>
          <Badge variant="secondary">{formatBytes(uploadFile.size)}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={e => { e.stopPropagation(); setUploadFile(null) }}
          >
            <X size={14} className="mr-1" /> Remove
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Mic size={36} className="text-neutral-400" />
          <p className="font-medium">Drop your audio file here</p>
          <p className="text-sm text-muted-foreground">MP3, WAV, M4A, WebM up to 200MB</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={e => { e.stopPropagation(); open() }}>
            Browse files
          </Button>
        </div>
      )}
    </div>
  )
}
