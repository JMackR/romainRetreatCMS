import { gql } from '@apollo/client'

/** Matches Payload’s `posts` list shape (adjust `Post` if your server renames the type). */
export const postListItemFragment = gql`
  fragment PostListItem on Post {
    id
    title
    content
  }
`
