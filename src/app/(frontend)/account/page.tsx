import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthFormCard } from '@/components/AuthFormCard'
import { AccountForm } from './AccountForm'
import { getMeUserOptional } from '@/utilities/getMeUserOptional'

export const metadata: Metadata = {
  title: 'Account',
  description: 'Your name and sign-in information.',
}

export default async function AccountPage() {
  const session = await getMeUserOptional()
  if (!session) {
    redirect('/login?next=%2Faccount')
  }
  return (
    <div className="w-full py-16 sm:py-20">
      <AuthFormCard>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update the name shown on your posts and comments.</p>
        <AccountForm me={session.user} />
        <p className="text-muted-foreground mt-6 text-sm">
          <Link className="text-primary underline" href="/groups">
            Back to groups
          </Link>
        </p>
      </AuthFormCard>
    </div>
  )
}
