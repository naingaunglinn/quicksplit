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

export const sendEmailSchema = z.object({
  to:      z.string().email(),
  subject: z.string().min(1).max(300),
  body:    z.string().min(1).max(50000),
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

export const shareSettingsSchema = z.object({
  mode:   z.enum(['private', 'public_link', 'restricted']),
  emails: z.array(z.string().email()).optional(),
})

export const addShareEmailSchema = z.object({
  email: z.string().email(),
})
