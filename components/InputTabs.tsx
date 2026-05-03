'use client'

import { FileText, Mic, Video } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useMeetingStore } from '@/store/meetingStore'
import TranscriptInput from './TranscriptInput'
import AudioUpload from './AudioUpload'
import VideoUpload from './VideoUpload'

export default function InputTabs() {
  const inputMode        = useMeetingStore(s => s.inputMode)
  const setInputMode     = useMeetingStore(s => s.setInputMode)
  // Derived boolean — only re-renders when readiness changes, not every keystroke
  const canExtract       = useMeetingStore(s => {
    const t = s.transcript
    return t.trim().length > 0 && t.length <= 50000
  })
  const hasFile          = useMeetingStore(s => s.uploadFile !== null)
  const runExtraction    = useMeetingStore(s => s.runExtraction)
  const runTranscription = useMeetingStore(s => s.runTranscription)

  return (
    <Tabs
      value={inputMode}
      onValueChange={v => setInputMode(v as typeof inputMode)}
    >
      <TabsList className="mb-4">
        <TabsTrigger value="text" className="flex items-center gap-1.5">
          <FileText size={15} /> Text
        </TabsTrigger>
        <TabsTrigger value="audio" className="flex items-center gap-1.5">
          <Mic size={15} /> Audio
        </TabsTrigger>
        <TabsTrigger value="video" className="flex items-center gap-1.5">
          <Video size={15} /> Video
        </TabsTrigger>
      </TabsList>

      <TabsContent value="text" className="space-y-4">
        <TranscriptInput />
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={!canExtract}
          onClick={runExtraction}
        >
          Extract Meeting
        </Button>
      </TabsContent>

      <TabsContent value="audio" className="space-y-4">
        <AudioUpload />
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={!hasFile}
          onClick={runTranscription}
        >
          Process File
        </Button>
      </TabsContent>

      <TabsContent value="video" className="space-y-4">
        <VideoUpload />
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={!hasFile}
          onClick={runTranscription}
        >
          Process File
        </Button>
      </TabsContent>
    </Tabs>
  )
}
