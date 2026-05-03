import axios from 'axios'
import type { MeetingData } from '@/types'

function validateTeamsWebhook(url: string): void {
  const isOutlook = url.startsWith('https://outlook.office.com/')
  const isPowerAutomate = url.startsWith('https://prod-') && url.includes('.logic.azure.com/')
  if (!isOutlook && !isPowerAutomate) {
    throw new Error('Invalid Teams webhook URL: must be an outlook.office.com or Azure Logic Apps URL')
  }
}

export async function postMeetingToTeams(
  webhookUrl: string,
  meeting: MeetingData,
  meetingUrl: string
): Promise<void> {
  validateTeamsWebhook(webhookUrl)

  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type:    'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type:   'TextBlock',
              text:   'QuickSplit Meeting Summary',
              size:   'Large',
              weight: 'Bolder',
            },
            { type: 'TextBlock', text: 'TL;DR', weight: 'Bolder' },
            {
              type: 'TextBlock',
              text: meeting.summary.map(s => `• ${s}`).join('\n'),
              wrap: true,
            },
            { type: 'TextBlock', text: 'Decisions', weight: 'Bolder' },
            {
              type: 'TextBlock',
              text: meeting.decisions.map(d => `• ${d}`).join('\n'),
              wrap: true,
            },
            { type: 'TextBlock', text: 'Action Items', weight: 'Bolder' },
            {
              type:  'FactSet',
              facts: meeting.tasks.map(t => ({ title: t.owner, value: t.description })),
            },
          ],
          actions: [
            {
              type:  'Action.OpenUrl',
              title: 'View Full Meeting',
              url:   meetingUrl,
            },
          ],
        },
      },
    ],
  }

  const response = await axios.post(webhookUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  })

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Teams webhook responded with status ${response.status}`)
  }
}
