import { z } from 'zod'

const taskShape = z.object({
  owner:       z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
})

const summaryShape = z.object({
  summary:   z.array(z.string()),
  decisions: z.array(z.string()),
  tasks:     z.array(taskShape),
})

export const extractSchema = z.object({
  transcript: z.string().min(10).max(50000),
})

export const emailSchema = z.object({
  summary:  summaryShape,
  language: z.enum(['en', 'ja', 'my']),
  tone:     z.enum(['casual', 'direct', 'keigo']),
})

export const saveSchema = z.object({
  transcript: z.string().min(10).max(50000),
  summary:    summaryShape,
  inputType:  z.enum(['text', 'audio', 'video']),
})

export const translateSchema = z.object({
  summary:  summaryShape,
  language: z.enum(['en', 'ja', 'my']),
})

export const slackSchema = z.object({
  meetingId: z.string().min(1).max(100),
  channel:   z.string().min(1).max(100),
  summary:   summaryShape,
})

export const teamsSchema = z.object({
  meetingId:  z.string().min(1).max(100),
  webhookUrl: z.string().url().refine(
    url =>
      url.startsWith('https://outlook.office.com/') ||
      (url.startsWith('https://prod-') && url.includes('.logic.azure.com/')),
    { message: 'Must be a valid Microsoft Teams webhook URL' }
  ),
  summary: summaryShape,
})
