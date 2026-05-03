'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMeetingStore } from '@/store/meetingStore'
import SummaryCards from './SummaryCards'
import DecisionList from './DecisionList'
import TaskList from './TaskList'
import EmailDrafter from './EmailDrafter'
import ShareLink from './ShareLink'
import IntegrationPanel from './IntegrationPanel'
import TranslationPanel from './TranslationPanel'

export default function ResultsSection() {
  const summary   = useMeetingStore(s => s.summary)
  const decisions = useMeetingStore(s => s.decisions)
  const tasks     = useMeetingStore(s => s.tasks)
  const reset     = useMeetingStore(s => s.reset)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="space-y-6 transition-opacity duration-300 opacity-100">
      <div className="flex justify-end items-center gap-2">
        {confirming ? (
          <>
            <span className="text-xs text-muted-foreground">Discard results?</span>
            <Button variant="destructive" size="sm" onClick={() => { reset(); setConfirming(false) }}>
              Yes, start over
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
            <RotateCcw size={14} className="mr-1.5" /> New Meeting
          </Button>
        )}
      </div>
      <SummaryCards   summary={summary} />
      <DecisionList   decisions={decisions} />
      <TaskList       tasks={tasks} />
      <TranslationPanel meeting={{ summary, decisions, tasks }} />
      <EmailDrafter   />
      <ShareLink      />
      {/*<IntegrationPanel />*/}
    </div>
  )
}
