import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'

import { AuthFormCard } from '@/components/AuthFormCard'

import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to join groups, post, and comment.',
}

export default function LoginPage() {
  return (
    <div className="w-full py-16 sm:py-20">
      <AuthFormCard>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with your email and password. The first user on a new site is created in the Payload
          admin; after that, you can also{' '}
          <Link className="text-foreground underline underline-offset-2" href="/signup">
            create a consumer account
          </Link>
          .
        </p>
        <div className="mt-6">
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground" role="status">
                Loading form…
              </p>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link className="text-primary underline" href="/account">
            My account
          </Link>
          <span className="mx-2">·</span>
          <Link className="text-primary underline" href="/groups">
            Back to groups
          </Link>
        </p>
      </AuthFormCard>
    </div>
  )
}
