import { gql } from '@apollo/client'

/**
 * Add a `ping: String!` (or similar) to **romainRetreatServer** if you want a lightweight liveness check.
 * Remove this file and imports if the server has no `ping` field (GraphQL will error if unused in production).
 */
export const RetreatServerPingDocument = gql`
  query RetreatServerPing {
    ping
  }
`

export type RetreatServerPingData = {
  ping: string
}
