import type { Metadata } from 'next'
import Link from 'next/link'
import { getMeUser } from '@/utilities/getMeUser'

import { NewGroupForm } from './NewGroupForm'

export const metadata: Metadata = {
  title: 'Create a group',
}

export default async function NewGroupPage() {
  await getMeUser({ nullUserRedirect: '/login?next=%2Fgroups%2Fnew' })

  return (
    <div className="container max-w-lg py-12">
      <h1 className="text-2xl font-semibold">Create a group</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        You will be the admin. You can set privacy, cover image, and about text later in the admin
        too.
      </p>
      <div className="mt-8">
        <NewGroupForm />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link className="text-primary underline" href="/groups">
          Back to groups
        </Link>
      </p>
    </div>
  )
}
