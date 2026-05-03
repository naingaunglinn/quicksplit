'use client'

import { useEffect, useState } from 'react'
import type { AppUser } from '@/lib/auth'

export function useUser(): AppUser | null | undefined {
  const [user, setUser] = useState<AppUser | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data ? { id: data.id, email: data.email } : null))
      .catch(() => setUser(null))
  }, [])

  return user  // undefined = loading, null = guest, AppUser = signed in
}
