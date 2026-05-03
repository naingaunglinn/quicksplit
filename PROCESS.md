# QuickSplit — Build Process Tracker

---

## Prompt 1 of 2: Frontend UI/UX ✅

### Overview
Build the complete visual and interactive UI of QuickSplit using mock data.
No real API calls, database logic, AI calls, or auth in this prompt.

### Setup Steps

| # | Step | Status |
|---|------|--------|
| 1 | `npx create-next-app@latest quicksplit --typescript --tailwind --app --src-dir=false` | ✅ Done |
| 2 | `npx shadcn@latest init` (Default style, Zinc base, CSS variables: yes) | ✅ Done |
| 3 | `npx shadcn@latest add button card tabs textarea input select badge separator skeleton alert dialog sonner` | ✅ Done |
| 4 | `npm install zustand react-dropzone sonner lucide-react date-fns` | ✅ Done |
| 5 | Inter font in `app/layout.tsx` via `next/font/google` | ✅ Done |
| 6 | Global `<Toaster />` in `layout.tsx` | ✅ Done |

### Files Created

| File | Status |
|------|--------|
| `types/index.ts` | ✅ Done |
| `lib/mockData.ts` | ✅ Done |
| `store/meetingStore.ts` | ✅ Done |
| `app/layout.tsx` | ✅ Done |
| `app/page.tsx` | ✅ Done |
| `app/meeting/[id]/page.tsx` | ✅ Done |
| `components/Header.tsx` | ✅ Done |
| `components/InputTabs.tsx` | ✅ Done |
| `components/TranscriptInput.tsx` | ✅ Done |
| `components/AudioUpload.tsx` | ✅ Done |
| `components/VideoUpload.tsx` | ✅ Done |
| `components/ProcessingState.tsx` | ✅ Done |
| `components/ResultsSection.tsx` | ✅ Done |
| `components/SummaryCards.tsx` | ✅ Done |
| `components/DecisionList.tsx` | ✅ Done |
| `components/TaskList.tsx` | ✅ Done |
| `components/EmailDrafter.tsx` | ✅ Done |
| `components/ShareLink.tsx` | ✅ Done |
| `components/IntegrationPanel.tsx` | ✅ Done |
| `components/MeetingReadOnly.tsx` | ✅ Done |
| `public/icons/slack.svg` | ✅ Done |
| `public/icons/teams.svg` | ✅ Done |

### Build Verification — Prompt 1

| Check | Result |
|-------|--------|
| `tsc --noEmit` | ✅ 0 errors |
| `next build` | ✅ Compiled successfully |
| Routes | `/` (Static), `/meeting/[id]` (Dynamic) |

---

## Prompt 2 of 2: System Architecture & Data Flow ✅

### Overview
Wire every mock with real implementations: Supabase, Gemini AI, Whisper, Google Drive,
Slack Block Kit, Teams Adaptive Cards, Zod validation, rate limiting, auth proxy.

### Packages Added

```
@google/generative-ai  openai  googleapis  google-auth-library
@supabase/supabase-js  @supabase/ssr  fluent-ffmpeg
@ffmpeg-installer/ffmpeg  formidable  @slack/web-api
axios  nanoid  zod  sanitize-html  @upstash/ratelimit  @upstash/redis
```

### Files Created / Updated

| File | Description | Status |
|------|-------------|--------|
| `.env.local.example` | All required env vars with comments | ✅ Done |
| `supabase-schema.sql` | Full DB schema — run in Supabase SQL editor | ✅ Done |
| `lib/config.ts` | Lazy env var validation (throws at request time, not build) | ✅ Done |
| `lib/supabase/client.ts` | Browser Supabase singleton | ✅ Done |
| `lib/supabase/server.ts` | Server Supabase client (per-request, cookie-aware) | ✅ Done |
| `lib/sanitize.ts` | HTML strip + null bytes + truncate | ✅ Done |
| `lib/validate.ts` | Zod schemas for all 5 routes | ✅ Done |
| `lib/ratelimit.ts` | Upstash sliding window factory + named limiters | ✅ Done |
| `lib/drive.ts` | Google Drive upload / stream / delete (service account) | ✅ Done |
| `lib/ffmpeg.ts` | Video → MP3 audio extraction via fluent-ffmpeg | ✅ Done |
| `lib/whisper.ts` | OpenAI Whisper transcription from stream | ✅ Done |
| `lib/gemini.ts` | Gemini extraction (JSON mode + retry) + email draft | ✅ Done |
| `lib/slack.ts` | Slack Block Kit message builder + WebClient | ✅ Done |
| `lib/teams.ts` | Teams Adaptive Card + webhook URL validation | ✅ Done |
| `proxy.ts` | Auth guard + edge rate limit + security headers (renamed from middleware.ts per Next.js 16 convention) | ✅ Done |
| `next.config.ts` | `serverExternalPackages` for ffmpeg/formidable | ✅ Done |
| `app/api/drive/upload/route.ts` | Multipart → Google Drive upload | ✅ Done |
| `app/api/transcribe/route.ts` | Drive → ffmpeg (video) → Whisper → transcript | ✅ Done |
| `app/api/extract/route.ts` | Gemini extraction from transcript | ✅ Done |
| `app/api/email/route.ts` | Gemini email draft with language + tone | ✅ Done |
| `app/api/save/route.ts` | Supabase insert meetings + tasks + nanoid shortId | ✅ Done |
| `app/api/meeting/[id]/route.ts` | Public GET meeting by short_id | ✅ Done |
| `app/api/integrations/slack/route.ts` | Slack push + integration_logs | ✅ Done |
| `app/api/integrations/teams/route.ts` | Teams push + integration_logs | ✅ Done |
| `store/meetingStore.ts` | All 6 mocks replaced with real `fetch` calls | ✅ Done |
| `app/meeting/[id]/page.tsx` | Real Supabase query replacing mock | ✅ Done |

### Database Setup

Run `supabase-schema.sql` in the Supabase SQL editor before launching.

Tables:
- `meetings` — transcript, summary (jsonb), input_type, short_id, user_id
- `tasks` — owner, description, done, FK → meetings
- `integration_logs` — type (slack/teams), channel, FK → meetings

RLS: All 3 tables enabled. Public read on meetings+tasks. Owner-only on logs.

### Security Checklist

| Check | Status |
|-------|--------|
| Zod validation on all route inputs | ✅ |
| `sanitizeText()` before all AI calls | ✅ |
| 50,000 char hard cap client + server | ✅ |
| MIME type whitelist server-side | ✅ |
| Files renamed to `nanoid()` — original name never used | ✅ |
| Drive files deleted in `finally` blocks | ✅ |
| Teams webhook URL validated against MS domains | ✅ |
| Supabase RLS on all 3 tables | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` never in NEXT_PUBLIC_ | ✅ |
| No `dangerouslySetInnerHTML` anywhere | ✅ |
| Rate limiting in proxy before routes | ✅ |
| Auth guard in proxy before protected APIs | ✅ |
| `/api/meeting/:id` and `/meeting/[id]` — no auth check | ✅ |
| Security headers on every response | ✅ |
| `config.ts` throws on missing env at request time | ✅ |

### Build Verification — Prompt 2

| Check | Result |
|-------|--------|
| `tsc --noEmit` | ✅ 0 errors |
| `next build` | ✅ Compiled successfully |
| Routes | `/` `/meeting/[id]` + 7 API routes (all Dynamic) |
| Proxy (Middleware) | ✅ Registered |

---

## Current Status

**Phase:** ✅ Both prompts complete — production build passing, zero TS errors

## To Launch

1. Copy `.env.local.example` → `.env.local` and fill in all values
2. Run `supabase-schema.sql` in Supabase SQL editor
3. `npm run dev` — app runs on http://localhost:3000
