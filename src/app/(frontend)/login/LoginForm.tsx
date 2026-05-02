'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getClientSideURL } from '@/utilities/getURL'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next') || '/groups'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const r = await fetch(`${getClientSideURL()}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      if (!r.ok) {
        const b = (await r.json().catch(() => ({}))) as { errors?: { message: string }[] }
        setError(b.errors?.[0]?.message || 'Sign in failed')
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError('Sign in failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="w-full max-w-full space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          className="w-full max-w-full"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          className="w-full max-w-full"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link
          className="text-primary underline"
          href={`/signup?next=${encodeURIComponent(next)}`}
        >
          Create an account
        </Link>
      </p>
    </form>
  )
}
