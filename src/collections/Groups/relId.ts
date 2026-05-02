/** Relational field value from Payload (id, or populated with numeric id) */
export function relId(
  v: string | number | { id: string | number } | null | undefined,
  fallback = '',
): string {
  if (v == null) return fallback
  if (typeof v === 'object' && 'id' in v) return String((v as { id: string | number }).id)
  return String(v)
}

/**
 * access.read / update / delete are sometimes run with no document id (e.g. during
 * `payload.auth`). `String(undefined)` is `"undefined"` and findByID throws NotFound.
 */
export function isValidAccessDocumentId(id: unknown): id is string | number {
  if (id === undefined || id === null) return false
  const s = String(id)
  if (s === '' || s === 'undefined' || s === 'null') return false
  return true
}
