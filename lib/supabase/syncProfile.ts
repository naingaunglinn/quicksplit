import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

/**
 * Keep `public.profiles` in sync with `auth.users` (id + email).
 * The DB trigger usually creates the row on signup; this covers edge cases and email updates.
 */
export async function syncUserProfile(user: User) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id' })

  if (error) console.error('[syncUserProfile]', error.message)
}
