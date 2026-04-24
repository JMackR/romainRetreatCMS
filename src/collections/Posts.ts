import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    // Anonymous GraphQL (e.g. Apollo on the CMS app page) can read; mutations stay authenticated.
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Content',
    },
    {
      name: 'alertBox',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/AlertBox#default',
        },
      },
    },
  ],
}
