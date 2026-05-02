import type { Access, CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { relId } from './Groups/relId'
import { isGroupAdmin } from './Groups/shared'

const read: Access = anyone

const create: Access = async ({ req, data }) => {
  if (!req.user) return false
  const d = (data || {}) as { group?: string | { id: string } }
  const groupId = relId(d.group)
  if (!groupId) return false
  return isGroupAdmin({ payload: req.payload, req, groupId }, req.user)
}

const update: Access = create

const del: Access = create

export const GroupEvents: CollectionConfig = {
  slug: 'groupEvents',
  labels: { singular: 'Group event', plural: 'Group events' },
  admin: {
    defaultColumns: ['title', 'startsAt', 'group', 'updatedAt'],
    useAsTitle: 'title',
  },
  access: {
    create,
    read,
    update,
    delete: del,
  },
  fields: [
    {
      name: 'group',
      type: 'relationship',
      relationTo: 'groups',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'endsAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
    },
  ],
  timestamps: true,
}
