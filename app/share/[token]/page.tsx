'use client'

import { useEffect, useState } from 'react'
import { Loader2, Lock, ShieldX } from 'lucide-react'
import { toast } from 'sonner'
import Header from '@/components/Header'
import SummaryCards from '@/components/SummaryCards'
import DecisionList from '@/components/DecisionList'
import TaskList from '@/components/TaskList'
import EmailDrafter from '@/components/EmailDrafter'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface MeetingData {
  shortId:   string
  inputType: string
  createdAt: string
  summary:   string[]
  decisions: string[]
  tasks:     { owner: string; description: string; done: boolean }[]
}

type PageState =
  | { type: 'loading' }
  | { type: 'success'; data: MeetingData }
  | { type: 'auth_required' }
  | { type: 'access_denied'; userEmail: string }
  | { type: 'private' }
  | { type: 'not_found' }
  | { type: 'error'; message: string }

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken]     = useState<string | null>(null)
  const [state, setState]     = useState<PageState>({ type: 'loading' })
  const [email, setEmail]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  // Unwrap params
  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    fetch(`/api/share/${token}`)
      .then(async res => {
        const data = await res.json()
        if (res.ok) {
          setState({ type: 'success', data: data as MeetingData })
        } else if (res.status === 401) {
          setState({ type: 'auth_required' })
        } else if (res.status === 403) {
          if (data.error === 'access_denied') {
            setState({ type: 'access_denied', userEmail: data.userEmail ?? '' })
          } else {
            setState({ type: 'private' })
          }
        } else if (res.status === 404) {
          setState({ type: 'not_found' })
        } else {
          setState({ type: 'error', message: data.error ?? 'Failed to load meeting' })
        }
      })
      .catch(() => setState({ type: 'error', message: 'Network error' }))
  }, [token])

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      const res  = await fetch('/api/auth/magic-link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send sign-in link')
      // Store redirect destination so auth callback can return here
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth_redirect', window.location.href)
      }
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send sign-in link')
    } finally {
      setSending(false)
    }
  }

  async function handleSignOutAndReload() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.reload()
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {state.type === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {state.type === 'success' && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">Meeting Summary</h1>
            <SummaryCards  summary={state.data.summary} />
            <DecisionList  decisions={state.data.decisions} />
            <TaskList      tasks={state.data.tasks} />
            <EmailDrafter  />
            <p className="text-xs text-muted-foreground text-center pt-8">
              Powered by QuickSplit · AI Meeting Intelligence
            </p>
          </div>
        )}

        {state.type === 'auth_required' && (
          <div className="flex items-center justify-center py-12">
            <Card className="p-8 max-w-sm w-full space-y-5 text-center">
              <Lock size={36} className="mx-auto text-indigo-500" />
              <div>
                <h2 className="font-semibold text-base">Sign in to view this meeting</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This meeting is restricted. Sign in to check if you have access.
                </p>
              </div>
              {sent ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    Check your inbox at <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click the link in the email to sign in and return here.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setSent(false); setEmail('') }}
                  >
                    Use a different email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSendMagicLink} className="space-y-3 text-left">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={sending || !email.trim()}
                  >
                    {sending ? 'Sending…' : 'Send sign-in link'}
                  </Button>
                </form>
              )}
            </Card>
          </div>
        )}

        {state.type === 'access_denied' && (
          <div className="flex items-center justify-center py-12">
            <Card className="p-8 max-w-sm w-full space-y-5 text-center">
              <ShieldX size={36} className="mx-auto text-red-500" />
              <div>
                <h2 className="font-semibold text-base">Access Denied</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  The account <strong>{state.userEmail}</strong> does not have access to this meeting.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSignOutAndReload}
              >
                Sign in with a different account
              </Button>
            </Card>
          </div>
        )}

        {state.type === 'private' && (
          <div className="flex items-center justify-center py-12">
            <Card className="p-8 max-w-sm w-full space-y-4 text-center">
              <Lock size={36} className="mx-auto text-muted-foreground" />
              <div>
                <h2 className="font-semibold text-base">This meeting is private</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  The owner has not shared this meeting publicly.
                </p>
              </div>
            </Card>
          </div>
        )}

        {state.type === 'not_found' && (
          <div className="flex items-center justify-center py-12">
            <Card className="p-8 max-w-sm w-full space-y-4 text-center">
              <h2 className="font-semibold text-base">Meeting not found</h2>
              <p className="text-sm text-muted-foreground">
                This share link may have expired or the meeting may have been deleted.
              </p>
            </Card>
          </div>
        )}

        {state.type === 'error' && (
          <div className="flex items-center justify-center py-12">
            <Card className="p-8 max-w-sm w-full space-y-4 text-center">
              <h2 className="font-semibold text-base">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </Card>
          </div>
        )}
      </main>
    </>
  )
}
