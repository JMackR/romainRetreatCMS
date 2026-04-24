const DEFAULT_CMS_BASE = 'http://localhost:3000'

/**
 * Public GraphQL endpoint for romainRetreatServer (browsers and HttpLink).
 *
 * Priority:
 * 1) `NEXT_PUBLIC_ROMAIN_RETREAT_GRAPHQL_URL` — full URL (direct to the server or any proxy URL)
 * 2) Same-origin `/api/retreat-graphql` — must match `rewrites` in `next.config.mjs` to the server (avoids CORS)
 * 3) `PAYLOAD_SERVER_URL` + `/api/retreat-graphql` for SSR or non-browser
 */
export function getRomainRetreatGraphQLEndpoint(): string {
  if (process.env.NEXT_PUBLIC_ROMAIN_RETREAT_GRAPHQL_URL) {
    return process.env.NEXT_PUBLIC_ROMAIN_RETREAT_GRAPHQL_URL
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/retreat-graphql`
  }
  return `${(process.env.PAYLOAD_SERVER_URL ?? DEFAULT_CMS_BASE).replace(/\/$/, '')}/api/retreat-graphql`
}
