import type { Access } from 'payload'

import { isStaff } from './roles'

/** Admin + content manager (create/edit most collections; no global layout unless also admin on globals). */
export const staff: Access = ({ req: { user } }) => isStaff(user)
