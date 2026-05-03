'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')

    if (!token) {
      setErrorMsg('Invalid sign-in link. Please request a new one.')
      return
    }

    function getRedirectTarget(): string {
      const stored = sessionStorage.getItem('auth_redirect')
      if (stored) {
        sessionStorage.removeItem('auth_redirect')
        return stored
      }
      return '/'
    }

    fetch('/api/auth/callback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setErrorMsg(data.error ?? 'Sign-in failed. Please try again.')
          return
        }
        router.replace(getRedirectTarget())
      })
      .catch(() => setErrorMsg('Sign-in failed. Please try again.'))
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
