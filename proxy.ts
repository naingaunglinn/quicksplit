import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

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
  const path = request.nextUrl.pathname

  // ── 1. Verify session (custom JWT in httpOnly cookie) ────────
  const session = getSessionFromRequest(request)

  // Forward identity to downstream route handlers via request headers.
  const requestHeaders = new Headers(request.headers)
  if (session) {
    requestHeaders.set('x-user-id',    session.sub)
    requestHeaders.set('x-user-email', session.email)
  } else {
    requestHeaders.delete('x-user-id')
    requestHeaders.delete('x-user-email')
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // ── 2. Security headers ──────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
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

  // ── 3. Auth guard — same routes as before ────────────────────
  // /api/share/ and /api/auth/ intentionally excluded.
  const requiresAuth =
    path.startsWith('/api/save') ||
    path.startsWith('/api/integrations/') ||
    path.startsWith('/api/drive/') ||
    path.startsWith('/api/meetings/')

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
