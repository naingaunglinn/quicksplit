import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'qs_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export type SessionPayload = {
  sub: string   // profiles.id (uuid)
  email: string
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long')
  }
  return secret
}

export function signToken(
  payload: SessionPayload,
  expiresInSeconds: number = SESSION_MAX_AGE_SECONDS,
): string {
  const opts: SignOptions = { expiresIn: expiresInSeconds, algorithm: 'HS256' }
  return jwt.sign(payload, getSecret(), opts)
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as JwtPayload
    if (typeof decoded.sub === 'string' && typeof decoded.email === 'string') {
      return { sub: decoded.sub, email: decoded.email }
    }
    return null
  } catch {
    return null
  }
}

export function getSessionFromRequest(req: NextRequest | Request): SessionPayload | null {
  const token =
    'cookies' in req && typeof (req as NextRequest).cookies?.get === 'function'
      ? (req as NextRequest).cookies.get(SESSION_COOKIE)?.value
      : parseCookieHeader(req.headers.get('cookie'))[SESSION_COOKIE]

  if (!token) return null
  return verifyToken(token)
}

function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}
