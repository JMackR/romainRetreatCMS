import type { Access, Where } from 'payload'

import { isAdmin } from './roles'

export const usersRead: Access = async ({ req, id }) => {
  if (!req.user) return false
  if (isAdmin(req.user)) return true
  if (id && String(id) === String(req.user.id)) return true
  if (id) return false
  return { id: { equals: req.user.id } } as Where
}

export const usersUpdate: Access = async ({ req, id }) => {
  if (!req.user) return false
  if (isAdmin(req.user)) return true
  if (id && String(id) === String(req.user.id)) return true
  return false
}

export const usersCreate: Access = async ({ req }) => {
  if (!req.user) {
    const { totalDocs } = await req.payload.count({ collection: 'users' })
    return totalDocs === 0
  }
  return isAdmin(req.user)
}

export const usersDelete: Access = ({ req }) => isAdmin(req.user)
