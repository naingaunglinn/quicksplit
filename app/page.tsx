'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, X } from 'lucide-react'
import { useMeetingStore } from '@/store/meetingStore'
import Header from '@/components/Header'
import InputTabs from '@/components/InputTabs'
import ProcessingState from '@/components/ProcessingState'
import ResultsSection from '@/components/ResultsSection'

function isProcessing(state: {
  isUploading: boolean
  isTranscribing: boolean
  isExtracting: boolean
  isDrafting: boolean
  isSaving: boolean
}) {
  return state.isUploading || state.isTranscribing || state.isExtracting || state.isDrafting || state.isSaving
}

export default function HomePage() {
  const isUploading    = useMeetingStore(s => s.isUploading)
  const isTranscribing = useMeetingStore(s => s.isTranscribing)
  const isExtracting   = useMeetingStore(s => s.isExtracting)
  const isDrafting     = useMeetingStore(s => s.isDrafting)
  const isSaving       = useMeetingStore(s => s.isSaving)
  const summary        = useMeetingStore(s => s.summary)
  const error          = useMeetingStore(s => s.error)
  const clearError     = useMeetingStore(s => s.clearError)

  const processing = isProcessing({ isUploading, isTranscribing, isExtracting, isDrafting, isSaving })
  const hasResults = summary.length > 0

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="flex items-start justify-between gap-2">
              <span>{error}</span>
              <button onClick={clearError} className="shrink-0 hover:opacity-70 transition-opacity">
                <X size={16} />
              </button>
            </AlertDescription>
          </Alert>
        )}

        {!processing && !hasResults && <InputTabs />}
        {processing && <ProcessingState />}
        {!processing && hasResults && <ResultsSection />}

      </main>
    </>
  )
}
