import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'

import { AuthFormCard } from '@/components/AuthFormCard'

import { SignupForm } from './SignupForm'

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a site account to join groups, post, and comment.',
}

export default function SignupPage() {
  return (
    <div className="w-full py-16 sm:py-20">
      <AuthFormCard>
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          New accounts are <strong>consumer</strong> access (the public site and groups). For admin or
          content roles, a site admin can promote you after you sign in.
        </p>
        <div className="mt-6">
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground" role="status">
                Loading form…
              </p>
            }
          >
            <SignupForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link className="text-primary underline" href="/groups">
            Back to groups
          </Link>
        </p>
      </AuthFormCard>
    </div>
  )
}
