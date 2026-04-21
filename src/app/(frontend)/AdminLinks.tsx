'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

type Props = {
  adminHref: string
}

export function AdminLinks({ adminHref }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Button asChild>
        <Link href={adminHref} rel="noopener noreferrer" target="_blank">
          Go to admin panel
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="https://payloadcms.com/docs" rel="noopener noreferrer" target="_blank">
          Documentation
        </Link>
      </Button>
    </div>
  )
}
