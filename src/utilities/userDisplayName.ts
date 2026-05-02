type NameLike = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  name?: string | null
}

/**
 * Public-facing label for a user. Prefer `firstName` + `lastName`, then email.
 */
export function getUserDisplayName(
  u: NameLike | null | undefined,
): string {
  if (u == null) return 'Member'
  const fn = (u.firstName || '').trim()
  const ln = (u.lastName || '').trim()
  if (fn || ln) {
    return [fn, ln].filter(Boolean).join(' ')
  }
  const legacy = (u as { name?: string | null }).name
  if (legacy) return String(legacy).trim()
  return (u.email || 'Member').trim() || 'Member'
}
