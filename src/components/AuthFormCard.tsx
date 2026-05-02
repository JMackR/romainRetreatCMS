import type { ReactNode } from 'react'

import { cn } from '@/utilities/ui'

/** ~13.2rem + 100px max column width, centered in the viewport. */
export function AuthFormCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex w-full justify-center px-4', className)}>
      <div className="w-full max-w-[min(100%,calc(13.2rem+100px))] text-left">
        {children}
      </div>
    </div>
  )
}
