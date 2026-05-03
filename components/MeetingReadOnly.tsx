import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { SavedMeeting } from '@/types'
import SummaryCards from './SummaryCards'
import DecisionList from './DecisionList'
import TaskList from './TaskList'
import TranslationPanel from './TranslationPanel'
import ShareLink from "@/components/ShareLink";
import EmailDrafter from "@/components/EmailDrafter";

interface Props {
  meeting: SavedMeeting
}

export default function MeetingReadOnly({ meeting }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meeting Summary</h1>
        <Badge variant="outline" className="text-xs">
          {format(new Date(meeting.createdAt), 'MMM d, yyyy')}
        </Badge>
      </div>

      <Separator />

      <SummaryCards  summary={meeting.summary} />
      <DecisionList  decisions={meeting.decisions} />
      <TaskList      tasks={meeting.tasks} />
      <TranslationPanel meeting={{ summary: meeting.summary, decisions: meeting.decisions, tasks: meeting.tasks }} />
      <EmailDrafter   />
      <ShareLink meetingId={meeting.shortId} />
      <p className="text-xs text-muted-foreground text-center pt-8">
        Powered by QuickSplit · AI Meeting Intelligence
      </p>
    </div>
  )
}
