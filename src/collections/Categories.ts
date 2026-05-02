import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { staff } from '../access/staff'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: staff,
    delete: staff,
    read: anyone,
    update: staff,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({
      position: undefined,
    }),
  ],
}
