'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { syncUserProfile } from '@/lib/supabase/syncProfile'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')

    if (code) {
      // PKCE flow — exchange code for session
      supabase.auth.exchangeCodeForSession(code)
        .then(async ({ data }) => {
          if (data.session?.user) await syncUserProfile(data.session.user)
          router.replace('/')
        })
        .catch(() => router.replace('/?error=auth'))
      return
    }

    // Implicit flow — tokens are in the URL hash; Supabase client picks them up automatically.
    let done = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) finish(session.user)
    })

    function finish(user: User) {
      if (done) return
      done = true
      void syncUserProfile(user).finally(() => {
        subscription.unsubscribe()
        router.replace('/')
      })
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) finish(data.session.user)
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
        <span>Signing you in…</span>
      </div>
    </div>
  )
}
