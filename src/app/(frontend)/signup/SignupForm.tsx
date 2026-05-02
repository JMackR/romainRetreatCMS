'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getClientSideURL } from '@/utilities/getURL'

const MIN_PASSWORD = 8

export function SignupForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next') || '/groups'
  const base = getClientSideURL()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters`)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setPending(true)
    try {
      const r = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim(),
          password,
          confirmPassword,
        }),
      })
      const b = (await r.json().catch(() => ({}))) as {
        errors?: { message: string }[]
      }
      if (!r.ok) {
        setError(b.errors?.[0]?.message || 'Could not create account')
        return
      }
      const loginRes = await fetch(`${base}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        credentials: 'include',
      })
      if (!loginRes.ok) {
        setError('Account created. Please sign in manually.')
        router.push(`/login?next=${encodeURIComponent(next)}`)
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="w-full max-w-full space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="signup-first">First name</Label>
        <Input
          className="w-full"
          autoComplete="given-name"
          id="signup-first"
          onChange={(e) => setFirstName(e.target.value)}
          required
          value={firstName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-last">Last name</Label>
        <Input
          className="w-full"
          autoComplete="family-name"
          id="signup-last"
          onChange={(e) => setLastName(e.target.value)}
          required
          value={lastName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          className="w-full"
          autoComplete="email"
          id="signup-email"
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          className="w-full"
          autoComplete="new-password"
          id="signup-password"
          minLength={MIN_PASSWORD}
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          value={password}
        />
        <p className="text-[0.7rem] text-muted-foreground">At least {MIN_PASSWORD} characters</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <Input
          className="w-full"
          autoComplete="new-password"
          id="signup-confirm"
          minLength={MIN_PASSWORD}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link className="text-primary underline" href={`/login?next=${encodeURIComponent(next)}`}>
          Sign in
        </Link>
      </p>
    </form>
  )
}
