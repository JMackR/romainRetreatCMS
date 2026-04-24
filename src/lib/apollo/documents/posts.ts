import { gql } from '@apollo/client'

import { postListItemFragment } from './fragments'

/**
 * List posts as exposed by **romainRetreatServer** (or any gateway that mirrors Payload’s schema).
 * Align field names with your server’s `Posts` / `docs` list API.
 */
export const PostsListDocument = gql`
  ${postListItemFragment}
  query PostsList {
    Posts {
      docs {
        ...PostListItem
      }
    }
  }
`

/** Lexical serialized editor state from GraphQL `JSON` / `content` on `Post`. */
export type PostListItem = {
  id: string | number
  title?: string | null
  content?: unknown
}

export type PostsListData = {
  Posts: { docs: PostListItem[] }
}
