'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'

export default function Header() {
  const [user, setUser]           = useState<User | null>(null)
  const [open, setOpen]           = useState(false)
  const [email, setEmail]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [sent, setSent]           = useState(false)

  // Track auth state
  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))

    // Listen for changes (magic link callback, sign-out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setOpen(false)
        setSent(false)
        setEmail('')
        toast.success('Signed in successfully!')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/magic-link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send sign-in link')
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send sign-in link')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    toast.success('Signed out')
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <Zap size={20} className="text-indigo-600 fill-indigo-600" />
            <span className="font-semibold text-xl tracking-tight">QuickSplit</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/meetings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                My Meetings
              </Link>
              <span className="text-xs text-muted-foreground hidden sm:block">·</span>
              <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[160px]">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              Sign in
            </Button>
          )}
        </div>
      </header>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setSent(false); setEmail('') } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in to QuickSplit</DialogTitle>
            <DialogDescription>
              Enter your email and we&apos;ll send you a magic link — no password needed.
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-center">
                Check your inbox at <strong>{email}</strong>
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Click the link in the email to sign in. You can close this dialog.
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
            <form onSubmit={handleSignIn} className="space-y-3 pt-1">
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
                disabled={loading || !email.trim()}
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
