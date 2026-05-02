'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getClientSideURL } from '@/utilities/getURL'
import type { User } from '@/payload-types'

import { getUserDisplayName } from '@/utilities/userDisplayName'

const roleLabel: Record<string, string> = {
  admin: 'Admin (full access)',
  contentManager: 'Content manager',
  consumer: 'Consumer (read only on admin)',
}

export function AccountForm({ me }: { me: User }) {
  const [firstName, setFirstName] = useState(me.firstName || '')
  const [lastName, setLastName] = useState(me.lastName || '')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setMessage(null)
    const base = getClientSideURL()
    const r = await fetch(`${base}/api/users/${me.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: firstName.trim() || null, lastName: lastName.trim() || null }),
      credentials: 'include',
    })
    if (r.ok) {
      setMessage('Profile saved')
      router.refresh()
    } else {
      const b = (await r.json().catch(() => ({}))) as { errors?: { message: string }[] }
      setMessage(b.errors?.[0]?.message || 'Could not save')
    }
    setPending(false)
  }

  const { role: r } = me
  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <p className="text-sm text-muted-foreground">
        Signed in as {me.email}
        {r && <span className="block">Account type: {roleLabel[r] ?? r}</span>}
      </p>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="space-y-2">
        <Label htmlFor="firstName">First name</Label>
        <Input
          id="firstName"
          onChange={(e) => setFirstName(e.target.value)}
          value={firstName}
          autoComplete="given-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last name</Label>
        <Input
          id="lastName"
          onChange={(e) => setLastName(e.target.value)}
          value={lastName}
          autoComplete="family-name"
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Display name: {getUserDisplayName({ firstName, lastName, email: me.email }) || '—'}
      </p>
      <Button className="w-full sm:w-auto" disabled={pending} type="submit" variant="secondary">
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}
