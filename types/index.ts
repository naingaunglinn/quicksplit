export interface Task {
  owner: string
  description: string
  done: boolean
}

export interface MeetingData {
  summary: string[]   // exactly 3 items
  decisions: string[]
  tasks: Task[]
}

export interface SavedMeeting extends MeetingData {
  id: string
  shortId: string
  inputType: 'text' | 'audio' | 'video'
  createdAt: string
}

export type InputMode = 'text' | 'audio' | 'video'
export type Language  = 'en' | 'ja' | 'my'
export type Tone      = 'casual' | 'direct' | 'keigo'
