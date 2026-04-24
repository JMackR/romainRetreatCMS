'use client'

import { getRomainRetreatGraphQLEndpoint } from '@/lib/apollo/env'
import { ApolloClient, HttpLink, InMemoryCache, ApolloProvider } from '@apollo/client'
import { useState, type ReactNode } from 'react'

type ApolloWrapperProps = {
  children: ReactNode
}

function createClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: getRomainRetreatGraphQLEndpoint(),
      credentials: 'include',
    }),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  })
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  const [client] = useState(() => createClient())

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
