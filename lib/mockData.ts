import type { MeetingData, SavedMeeting } from '@/types'

export const MOCK_MEETING_DATA: MeetingData = {
  summary: [
    "Team aligned on Q3 product roadmap priorities and agreed to cut two features from the June release.",
    "Budget for the marketing campaign was approved at $15,000 with a two-week runway to launch.",
    "Engineering reported a blocker on the payment integration that needs a vendor call this week."
  ],
  decisions: [
    "June release will ship without the analytics dashboard and export feature.",
    "Marketing budget approved at $15,000 — Alice owns the campaign brief.",
    "Bob to schedule a call with the Stripe vendor by end of Thursday."
  ],
  tasks: [
    { owner: "Alice",  description: "Submit campaign brief to design by Wednesday", done: false },
    { owner: "Bob",    description: "Schedule Stripe vendor call before Thursday EOD", done: false },
    { owner: "Carol",  description: "Update the June release scope in Linear", done: false },
    { owner: "David",  description: "Send revised timeline to all stakeholders", done: false }
  ]
}

export const MOCK_EMAIL = `Hi team,

Thanks for a productive session today. Here's a quick recap of what we aligned on.

We've decided to trim the June release — the analytics dashboard and export feature will move to the next cycle so we can ship on time. Alice is picking up the campaign brief and will have it to design by Wednesday. Bob, please lock in that Stripe vendor call before Thursday EOD — that's the critical path item.

Full meeting summary and action items here: https://quicksplit.app/meeting/abc123

Let me know if I missed anything.

Best,
[Your name]`

export const MOCK_SAVED_MEETING: SavedMeeting = {
  ...MOCK_MEETING_DATA,
  id:        "abc123",
  shortId:   "abc123",
  inputType: "text",
  createdAt: new Date().toISOString()
}
