export const ROLE = {
  ADMIN: 'admin',
  CONTENT_MANAGER: 'contentManager',
  CONSUMER: 'consumer',
} as const

export type UserRole = (typeof ROLE)[keyof typeof ROLE]

function roleOf(user: { role?: UserRole | null } | null | undefined) {
  return user?.role
}

export function isAdmin(
  user: { role?: UserRole | null } | null | undefined,
): boolean {
  return roleOf(user) === ROLE.ADMIN
}

export function isContentManager(
  user: { role?: UserRole | null } | null | undefined,
): boolean {
  return roleOf(user) === ROLE.CONTENT_MANAGER
}

/** Admin or content manager: may use the admin app for content. */
export function isStaff(
  user: { role?: UserRole | null } | null | undefined,
): boolean {
  return isAdmin(user) || isContentManager(user)
}

/** Can open Payload admin and manage site-wide settings (not content-only). */
export function isSiteAdminOnly(
  user: { role?: UserRole | null } | null | undefined,
): boolean {
  return isAdmin(user)
}

export function isConsumer(
  user: { role?: UserRole | null } | null | undefined,
): boolean {
  if (!user) return false
  return roleOf(user) === ROLE.CONSUMER || user.role == null
}

export function canAccessAdminPanel(
  user: { role?: UserRole | null } | null | undefined,
): boolean {
  return isStaff(user)
}
