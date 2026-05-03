import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export function createLimiter(requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  return new Ratelimit({
    redis:     Redis.fromEnv(),
    limiter:   Ratelimit.slidingWindow(requests, window),
    analytics: true,
  })
}

export const transcribeLimiter   = createLimiter(5,  '15 m')
export const extractLimiter      = createLimiter(10, '1 m')
export const emailLimiter        = createLimiter(10, '1 m')
export const integrationLimiter  = createLimiter(20, '5 m')

export type RateLimitResult = {
  success: boolean
  limit:   number
  remaining: number
  reset:   number
}

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResult> {
  const result = await limiter.limit(identifier)
  return {
    success:   result.success,
    limit:     result.limit,
    remaining: result.remaining,
    reset:     result.reset,
  }
}
