'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useMeetingStore } from '@/store/meetingStore'

export default function IntegrationPanel() {
  const slackChannel    = useMeetingStore(s => s.slackChannel)
  const teamsWebhookUrl = useMeetingStore(s => s.teamsWebhookUrl)
  const slackSent       = useMeetingStore(s => s.slackSent)
  const teamsSent       = useMeetingStore(s => s.teamsSent)
  const setSlackChannel    = useMeetingStore(s => s.setSlackChannel)
  const setTeamsWebhookUrl = useMeetingStore(s => s.setTeamsWebhookUrl)
  const pushToSlack     = useMeetingStore(s => s.pushToSlack)
  const pushToTeams     = useMeetingStore(s => s.pushToTeams)

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Send to Team
      </p>
      <Card className="p-5 space-y-5 shadow-sm">

        {/* Slack */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/slack.svg" alt="Slack" className="w-5 h-5" />
            <span className="text-sm font-medium">Send to Slack</span>
            {slackSent && (
              <Badge className="bg-green-500 hover:bg-green-500 text-white ml-auto">
                Sent ✓
              </Badge>
            )}
          </div>
          {!slackSent && (
            <div className="flex gap-2">
              <Input
                placeholder="#general"
                value={slackChannel}
                onChange={e => setSlackChannel(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={pushToSlack}
                disabled={!slackChannel}
              >
                Send
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Teams */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/teams.svg" alt="Teams" className="w-5 h-5" />
            <span className="text-sm font-medium">Send to Microsoft Teams</span>
            {teamsSent && (
              <Badge className="bg-green-500 hover:bg-green-500 text-white ml-auto">
                Sent ✓
              </Badge>
            )}
          </div>
          {!teamsSent && (
            <div className="flex gap-2">
              <Input
                placeholder="Paste Teams Incoming Webhook URL"
                value={teamsWebhookUrl}
                onChange={e => setTeamsWebhookUrl(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={pushToTeams}
                disabled={!teamsWebhookUrl}
              >
                Send
              </Button>
            </div>
          )}
        </div>

      </Card>
    </div>
  )
}
