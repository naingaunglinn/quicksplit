'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useMeetingStore } from '@/store/meetingStore'

function getStepLabel(state: {
  isUploading: boolean
  isTranscribing: boolean
  isExtracting: boolean
  isDrafting: boolean
  isSaving: boolean
}): string {
  if (state.isUploading)    return 'Preparing file...'
  if (state.isTranscribing) return 'Transcribing audio with AI...'
  if (state.isExtracting)   return 'Extracting meeting intelligence...'
  if (state.isDrafting)     return 'Drafting follow-up email...'
  if (state.isSaving)       return 'Saving your meeting...'
  return 'Processing...'
}

export default function ProcessingState() {
  const isUploading    = useMeetingStore(s => s.isUploading)
  const isTranscribing = useMeetingStore(s => s.isTranscribing)
  const isExtracting   = useMeetingStore(s => s.isExtracting)
  const isDrafting     = useMeetingStore(s => s.isDrafting)
  const isSaving       = useMeetingStore(s => s.isSaving)

  const currentStep = getStepLabel({ isUploading, isTranscribing, isExtracting, isDrafting, isSaving })

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground animate-pulse text-center">
        {currentStep}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  )
}
