import type { CollectionConfig, FieldAccess } from 'payload'

import { isAdmin, ROLE, canAccessAdminPanel } from '@/access/roles'
import {
  usersRead,
  usersCreate,
  usersUpdate,
  usersDelete,
} from '@/access/usersAccess'

const selfOrAdminFieldUpdate: FieldAccess = ({ req, id }) => {
  if (!req.user) return false
  if (isAdmin(req.user)) return true
  if (id != null) return String(id) === String(req.user.id)
  return false
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => canAccessAdminPanel(user),
    read: usersRead,
    create: usersCreate,
    update: usersUpdate,
    delete: usersDelete,
  },
  admin: {
    defaultColumns: ['firstName', 'lastName', 'email', 'role'],
    description:
      'Admins manage roles and site-wide settings. Content managers can create pages and posts. Consumers use the public site and groups only.',
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'firstName',
      type: 'text',
      label: 'First name',
      access: { read: () => true, update: selfOrAdminFieldUpdate, create: () => true },
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Last name',
      access: { read: () => true, update: selfOrAdminFieldUpdate, create: () => true },
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: ROLE.CONSUMER,
      hasMany: false,
      options: [
        { label: 'Admin', value: ROLE.ADMIN },
        { label: 'Content manager', value: ROLE.CONTENT_MANAGER },
        { label: 'Consumer (read only / app user)', value: ROLE.CONSUMER },
      ],
      required: true,
      saveToJWT: true,
      admin: {
        description:
          'Defaults to consumer. Public sign-up is always consumer. An admin can assign other roles when creating users. On the first user, choose Admin in this field if the site has no other administrator yet.',
      },
      access: {
        read: () => true,
        create: () => true,
        update: ({ req: { user } }) => isAdmin(user),
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (data == null) return data
        const d = { ...data } as { role?: string; [k: string]: unknown }

        if (operation === 'create') {
          // New accounts are consumer unless a logged-in admin is creating the user
          if (req.user && isAdmin(req.user)) {
            d.role = ((d.role as string) || ROLE.CONSUMER) as string
          } else {
            d.role = ROLE.CONSUMER
          }
        }

        if (operation === 'update' && req.user && !isAdmin(req.user) && 'role' in d) {
          delete d.role
        }

        if (d.firstName !== undefined && typeof d.firstName === 'string') {
          d.firstName = d.firstName.trim() || null
        }
        if (d.lastName !== undefined && typeof d.lastName === 'string') {
          d.lastName = d.lastName.trim() || null
        }

        return d
      },
    ],
  },
  timestamps: true,
}
