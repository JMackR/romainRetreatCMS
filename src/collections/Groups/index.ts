import type { Access, CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { authenticated } from '../../access/authenticated'
import { anyone } from '../../access/anyone'
import { defaultLexical } from '../../fields/defaultLexical'
import type { Group } from '@/payload-types'
import { isValidAccessDocumentId, relId } from './relId'
import { isGroupAdmin } from './shared'
import { afterGroupCreateAddAdmin } from './hooks/afterGroupChange'

const update: Access = async ({ req, id }) => {
  if (!req.user) return false
  if (!isValidAccessDocumentId(id)) return false

  let g: Group
  try {
    g = (await req.payload.findByID({
      collection: 'groups',
      id: String(id),
      depth: 0,
    })) as Group
  } catch {
    return false
  }

  const created = relId(g.createdBy)
  if (created && created === String(req.user.id)) return true
  return isGroupAdmin(
    { payload: req.payload, req, groupId: String(id) },
    req.user,
  )
}

export const Groups: CollectionConfig = {
  slug: 'groups',
  labels: { singular: 'Group', plural: 'Groups' },
  admin: {
    defaultColumns: ['name', 'slug', 'privacy', 'updatedAt'],
    useAsTitle: 'name',
  },
  access: {
    create: authenticated,
    read: anyone,
    update,
    delete: update,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({ useAsSlug: 'name' }),
    {
      name: 'cover',
      type: 'upload',
      label: 'Cover image',
      relationTo: 'media',
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      label: 'Tagline (short)',
    },
    {
      name: 'about',
      type: 'richText',
      label: 'About',
      editor: defaultLexical,
    },
    {
      name: 'privacy',
      type: 'select',
      defaultValue: 'public',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
      ],
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          return {
            ...data,
            createdBy: (data as { createdBy?: string })?.createdBy || req.user.id,
          }
        }
        return data
      },
    ],
    afterChange: [afterGroupCreateAddAdmin],
  },
  timestamps: true,
}
