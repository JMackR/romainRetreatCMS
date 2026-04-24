import { ApolloWrapper } from '@/lib/apollo/ApolloWrapper'
import type { ReactNode } from 'react'

export default function ApolloDemoLayout({ children }: { children: ReactNode }) {
  return <ApolloWrapper>{children}</ApolloWrapper>
}
