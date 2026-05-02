import type { Access } from 'payload'

import { isAdmin } from './roles'

/** Super-admin: users, site-wide globals (header/footer), role assignment. */
export const adminOnly: Access = ({ req: { user } }) => isAdmin(user)
