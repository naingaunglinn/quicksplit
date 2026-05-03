@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server on http://localhost:3000
- `npm run build` — production build (also the type-check gate; run before declaring TS work done)
- `npm run start` — serve the production build
- `npm run lint` — ESLint via `eslint-config-next` (flat config in `eslint.config.mjs`)
- Type-check only: `npx tsc --noEmit`

There is no test runner configured; do not invent one.

### Database setup

Apply SQL by hand in the Supabase SQL editor — there is no migration runner.

1. `supabase-schema.sql` — initial schema (`profiles`, `meetings`, `tasks`, `integration_logs`, RLS policies, `handle_new_user` trigger).
2. `supabase-migration-shares.sql` — adds `share_mode` / `share_token` / `allowed_emails` to `meetings`.

When adding columns or policies, write a new `supabase-migration-*.sql` file and tell the user to run it; do not edit `supabase-schema.sql` retroactively.

## Architecture

QuickSplit is a meeting-intelligence app: paste a transcript or upload audio/video → AI extracts summary, decisions, tasks → optionally save, share, and push to Slack/Teams.

### Pipeline (data flow)

```
Upload (audio/video) ──► /api/transcribe ──► Drive (temp) ─► ffmpeg (video→mp3) ─► Whisper/Gemini
        │                                           └─ deleted in finally{}
        ▼
Transcript ──► /api/extract ──► Gemini/OpenAI (JSON mode) ──► { summary, decisions, tasks }
                                                                        │
                                                                        ├─► /api/email   (follow-up draft)
                                                                        ├─► /api/translate
                                                                        ├─► /api/save    (Supabase)
                                                                        └─► /api/integrations/{slack,teams}
```

`store/meetingStore.ts` (Zustand) is the client-side orchestrator — every step is a method that calls the matching `/api/*` route and updates store state. Components read from the store; they do not call `fetch` directly.

### Auth & access control

- **Magic link only.** `/api/auth/magic-link` uses Supabase admin `generateLink({ type: 'magiclink' })` and sends the link via our own SMTP (`lib/mailer.ts`) — Supabase's built-in mailer is bypassed (rate limits + branding). For new emails the route first calls `auth.admin.createUser({ email_confirm: true })` so signup works even when "Allow new users to sign up" is disabled.
- **Callback is client-side** at `app/auth/callback/page.tsx`. It handles both PKCE (`?code=`) and implicit (`#access_token=`) flows because the server cannot read URL fragments. Errors arrive in the hash too — handle the error case before assuming success.
- **`proxy.ts`** (Next.js 16 rename of `middleware.ts`) does session refresh, security headers, in-memory edge rate limits, and the auth guard. The guard protects `/api/save`, `/api/integrations/*`, `/api/drive/*`, `/api/meetings/*` — and intentionally **not** `/api/share/*` (which enforces its own access rules) or `/api/auth/*` (auth itself can't require auth).
- **Three sharing modes** (Drive-style) on the `meetings` row:
  - `private` — owner only
  - `public_link` — anyone with `share_token`
  - `restricted` — signed-in users whose email is in `allowed_emails[]`
- **Owner-only detail page.** `/meeting/[short_id]` is owner-gated. Non-owners are redirected to `/share/[share_token]` (which then enforces the share-mode rules). Direct short_id access by a non-owner returns NotFound to avoid leaking existence.
- **`profiles` table** is the email source of truth in app code — never trust `auth.users.email` from the client. The `handle_new_user` trigger backfills it on signup; `lib/supabase/syncProfile.ts` covers edge cases.

### Supabase clients (use the right one)

- `lib/supabase/client.ts` — browser singleton, anon key, RLS applies.
- `lib/supabase/server.ts` — `createClient()` per-request, cookie-aware, RLS applies. Use in Route Handlers and Server Components when you want the **user's** identity.
- `lib/supabase/admin.ts` — `createAdminClient()` with service-role key. **Bypasses RLS.** Use only when you need to fetch a row before deciding access (e.g. share-token lookup) and then enforce the check yourself.

### AI provider abstraction

`lib/gemini.ts` and `lib/openai.ts` expose the same interface (`transcribeAudio`, `extractMeetingData`, `translateMeetingData`, `draftFollowUpEmail`). The `AI_PROVIDER` env var (default `gemini`) is the master switch; `TRANSCRIPTION_PROVIDER` can override transcription only. When adding a new AI capability, implement it in **both** files with matching signatures.

Whisper file-format quirk: the OpenAI SDK detects format from the **filename extension**, not the MIME type. `lib/openai.ts` keeps a `MIME_TO_EXT` map — extend it when adding new audio MIME types instead of hardcoding `audio.mp3`.

### Configuration

`lib/config.ts` exports a `Proxy` that reads `process.env` lazily — missing required vars throw at **request time**, not build time. This is deliberate so `next build` works without secrets. Defaults live in the Proxy's `get` handler (e.g. `AI_PROVIDER='gemini'`, `SMTP_HOST='smtp.gmail.com'`). `NEXT_PUBLIC_APP_URL` falls back to `VERCEL_URL`, then `localhost:3000` in dev.

### Validation & sanitization

- All route inputs go through Zod schemas in `lib/validate.ts`.
- All free-text that reaches an AI prompt or the DB goes through `sanitizeText()` (`lib/sanitize.ts`) — strips HTML, null bytes, hard-caps at 50,000 chars.
- File uploads are renamed to `nanoid()` before hitting Drive; original filenames are never used.
- Drive temp files are deleted in `finally {}` blocks — preserve this when editing the transcribe pipeline.

### IDs

- `short_id`: `nanoid(8)` — public-facing meeting URL slug (`/meeting/<short_id>`).
- `share_token`: `nanoid(21)` — share link slug (`/share/<token>`), unguessable.

## Conventions

- Path alias: `@/*` → repo root (e.g. `@/lib/config`, `@/components/Header`).
- Route handlers that touch ffmpeg/formidable/nodemailer must export `runtime = 'nodejs'` (the Edge runtime can't load them; `serverExternalPackages` in `next.config.ts` keeps them out of the bundle).
- Server Components for data-loading pages; `'use client'` only when state/effects are needed. The store, hooks, and dialogs are client; the meeting detail and share pages do their data load server-side and pass props down.
- Tailwind v4 + shadcn/ui (`components/ui/*`). Re-use these primitives; don't introduce a second component library.
- Don't replace `notFound()` calls with `return <NotFound />` blindly — the latter exists in `app/not-found.tsx` because of a Next.js 16 dev-mode Performance API quirk; in production prefer `notFound()`.

## Things to leave alone unless asked

- The `proxy.ts` filename — it's the Next.js 16 replacement for `middleware.ts`. Don't rename it back.
- The two-flow callback page — both branches are needed; deleting either breaks one flow.
- The lazy `config` Proxy — making it eager will break `next build` in CI without secrets.
