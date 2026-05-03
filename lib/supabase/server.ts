import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * User-scoped Supabase client for Route Handlers / Server Components.
 * Uses the anon key + session cookies so `auth.uid()` and RLS policies apply.
 * (Admin / bypass operations use `lib/supabase/admin.ts`.)
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Route Handler context — cookies may be read-only
          }
        },
      },
    }
  )
}
