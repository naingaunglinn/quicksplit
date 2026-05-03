import { WebClient } from '@slack/web-api'
import type { MeetingData } from '@/types'
import { config } from './config'

function getClient() {
  return new WebClient(config.SLACK_BOT_TOKEN)
}

export async function postMeetingToSlack(
  channel: string,
  meeting: MeetingData,
  meetingUrl: string
): Promise<{ ts: string }> {
  const result = await getClient().chat.postMessage({
    channel,
    text: 'QuickSplit Meeting Summary',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'QuickSplit Meeting Summary', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*TL;DR*\n${meeting.summary.map(s => `• ${s}`).join('\n')}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Decisions*\n${meeting.decisions.map(d => `• ${d}`).join('\n')}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Action Items*\n${meeting.tasks.map(t => `• *${t.owner}* — ${t.description}`).join('\n')}`,
        },
      },
      { type: 'divider' },
      {
        type: 'actions',
        elements: [
          {
            type:  'button',
            text:  { type: 'plain_text', text: 'View Full Meeting', emoji: true },
            url:   meetingUrl,
            style: 'primary',
          },
        ],
      },
    ],
  })

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error ?? 'unknown error'}`)
  }

  return { ts: result.ts ?? '' }
}
