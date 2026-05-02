'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getClientSideURL } from '@/utilities/getURL'

export function NewGroupForm() {
  const [name, setName] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const base = getClientSideURL()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const r = await fetch(`${base}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          shortDescription,
          privacy,
          /** Slug is generated from `name` (see `slugField({ useAsSlug: "name" })` in the groups collection). */
          generateSlug: true,
        }),
        credentials: 'include',
      })
      const b = (await r.json().catch(() => ({}))) as {
        doc?: { slug?: string }
        message?: string
        errors?: { message: string }[]
        error?: string
      }
      if (!r.ok) {
        setError(
          b.errors?.[0]?.message || b.message || b.error || 'Could not create group',
        )
        return
      }
      const slug = b.doc?.slug
      if (slug) router.push(`/groups/${encodeURIComponent(slug)}`)
    } catch {
      setError('Request failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="name">Group name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tagline">Short description (optional)</Label>
        <Textarea id="tagline" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Privacy</Label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="priv"
              checked={privacy === 'public'}
              onChange={() => setPrivacy('public')}
            />
            Public
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="priv"
              checked={privacy === 'private'}
              onChange={() => setPrivacy('private')}
            />
            Private
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create group'}
      </Button>
    </form>
  )
}
