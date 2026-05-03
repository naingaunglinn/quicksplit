'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { syncUserProfile } from '@/lib/supabase/syncProfile'
import { Button } from '@/components/ui/button'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const hash    = new URLSearchParams(window.location.hash.slice(1))
    const errCode = hash.get('error_code')
    const errDesc = hash.get('error_description')

    // Error in hash (e.g. otp_expired, access_denied)
    if (errCode) {
      const msg =
        errCode === 'otp_expired'
          ? 'This sign-in link has expired. Please request a new one.'
          : (errDesc?.replace(/\+/g, ' ') ?? 'Sign-in failed. Please try again.')
      setErrorMsg(msg)
      return
    }

    const accessToken  = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')

    function getRedirectTarget(): string {
      const stored = sessionStorage.getItem('auth_redirect')
      if (stored) {
        sessionStorage.removeItem('auth_redirect')
        return stored
      }
      return '/'
    }

    // Implicit flow — tokens present in hash, set session directly
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(async ({ data, error }) => {
          if (error || !data.session?.user) {
            setErrorMsg('Sign-in failed. Please try again.')
            return
          }
          await syncUserProfile(data.session.user)
          router.replace(getRedirectTarget())
        })
      return
    }

    // PKCE flow — code in query params
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(async ({ data, error }) => {
          if (error || !data.session?.user) {
            setErrorMsg('Sign-in failed. Please try again.')
            return
          }
          await syncUserProfile(data.session.user)
          router.replace(getRedirectTarget())
        })
      return
    }

    // Nothing usable in URL
    setErrorMsg('Invalid sign-in link. Please request a new one.')
  }, [router])

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertCircle size={40} className="text-red-500 mx-auto" />
          <p className="font-medium">{errorMsg}</p>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => router.replace('/')}
          >
            Back to QuickSplit
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
        <span>Signing you in…</span>
      </div>
    </div>
  )
}
