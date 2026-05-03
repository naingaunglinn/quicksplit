import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RATE_LIMIT_MAP: Record<string, { max: number; windowMs: number }> = {
  '/api/transcribe':         { max: 5,  windowMs: 15 * 60 * 1000 },
  '/api/extract':            { max: 10, windowMs:  1 * 60 * 1000 },
  '/api/email':              { max: 10, windowMs:  1 * 60 * 1000 },
  '/api/integrations/slack': { max: 20, windowMs:  5 * 60 * 1000 },
  '/api/integrations/teams': { max: 20, windowMs:  5 * 60 * 1000 },
}

const hitStore = new Map<string, { count: number; resetAt: number }>()

function edgeRateLimit(key: string, max: number, windowMs: number): boolean {
  const now   = Date.now()
  const entry = hitStore.get(key)
  if (!entry || now > entry.resetAt) {
    hitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  // ── 1. Security headers ──────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // Relaxed CSP: allow Next.js dev WS + blob for audio recording
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "connect-src 'self' ws: wss: https://*.supabase.co https://generativelanguage.googleapis.com",
      "frame-src 'none'",
      "object-src 'none'",
    ].join('; ')
  )

  const path = request.nextUrl.pathname

  // ── 2. Supabase session refresh (skip if not configured) ─────
  let session = null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set({ name, value, ...options })
            )
          },
        },
      })
      const { data } = await supabase.auth.getSession()
      session = data.session
    } catch {
      // Supabase unreachable — allow request through unauthenticated
    }
  }

  // ── 3. Auth guard — only saving and integrations require sign-in ─
  const requiresAuth =
    path.startsWith('/api/save') ||
    path.startsWith('/api/integrations/') ||
    path.startsWith('/api/drive/')

  if (requiresAuth && !session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // ── 4. Edge rate limiting ────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const limitEntry = Object.entries(RATE_LIMIT_MAP).find(([route]) => path.startsWith(route))

  if (limitEntry) {
    const [route, { max, windowMs }] = limitEntry
    const allowed = edgeRateLimit(`${ip}:${route}`, max, windowMs)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before retrying.' },
        { status: 429 }
      )
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
