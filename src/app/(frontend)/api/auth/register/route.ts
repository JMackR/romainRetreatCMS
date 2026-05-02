import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@payload-config'
import { ROLE } from '@/access/roles'

const MIN_PASSWORD = 8

type Body = {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json(
      { errors: [{ message: 'Invalid request body' }] },
      { status: 400 },
    )
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

  if (!firstName || !lastName) {
    return NextResponse.json(
      { errors: [{ message: 'First and last name are required' }] },
      { status: 400 },
    )
  }
  if (!email) {
    return NextResponse.json({ errors: [{ message: 'Email is required' }] }, { status: 400 })
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { errors: [{ message: `Password must be at least ${MIN_PASSWORD} characters` }] },
      { status: 400 },
    )
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ errors: [{ message: 'Passwords do not match' }] }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })
  const { totalDocs } = await payload.count({ collection: 'users' })

  if (totalDocs === 0) {
    return NextResponse.json(
      {
        errors: [
          {
            message:
              'The first user must be created in the Payload admin at /admin. Public signup will work after that.',
          },
        ],
      },
      { status: 403 },
    )
  }

  const taken = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    where: { email: { equals: email } },
  })
  if (taken.totalDocs > 0) {
    return NextResponse.json(
      { errors: [{ message: 'An account with this email already exists' }] },
      { status: 400 },
    )
  }

  try {
    const doc = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        firstName,
        lastName,
        role: ROLE.CONSUMER,
      },
      overrideAccess: true,
    })
    return NextResponse.json(
      { doc: { id: doc.id, email: doc.email } },
      { status: 201 },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not create account'
    return NextResponse.json({ errors: [{ message }] }, { status: 400 })
  }
}
