// Lazy config — reads process.env only when a key is accessed,
// so missing vars throw at request time, not during next build.

const REQUIRED_SERVER = new Set([
  'GEMINI_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_DRIVE_FOLDER_ID',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SLACK_BOT_TOKEN',
])

const REQUIRED_PUBLIC = new Set([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
])

export type Config = {
  AI_PROVIDER:                 string  // 'gemini' (default) | 'openai' — master switch for all AI tasks
  GEMINI_API_KEY:              string
  GEMINI_MODEL:                string  // default: gemini-2.0-flash-lite; paid plans can use gemini-2.0-flash
  OPENAI_API_KEY:              string  // required when AI_PROVIDER=openai
  OPENAI_MODEL:                string  // default: gpt-4.1-mini
  TRANSCRIPTION_PROVIDER:      string  // optional override for transcription only; falls back to AI_PROVIDER
  SUPABASE_SERVICE_ROLE_KEY:   string
  GOOGLE_SERVICE_ACCOUNT_JSON: string
  GOOGLE_DRIVE_FOLDER_ID:      string
  UPSTASH_REDIS_REST_URL:      string
  UPSTASH_REDIS_REST_TOKEN:    string
  SLACK_BOT_TOKEN:             string
  NEXT_PUBLIC_SUPABASE_URL:    string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_APP_URL:         string
}

export const config: Config = new Proxy({} as Config, {
  get(_, key: string): string {
    const value = process.env[key]

    if (!value) {
      if (REQUIRED_SERVER.has(key) || REQUIRED_PUBLIC.has(key)) {
        throw new Error(`Missing required environment variable: ${key}`)
      }
      // Optional vars with defaults
      if (key === 'NEXT_PUBLIC_APP_URL') return 'http://localhost:3000'
      if (key === 'AI_PROVIDER')         return 'gemini'
      if (key === 'GEMINI_MODEL')        return 'gemini-2.0-flash-lite'
      if (key === 'OPENAI_MODEL')        return 'gpt-4.1-mini'
      return ''
    }

    return value
  },
})
