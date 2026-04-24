import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { resolveDatabaseAdapter } from './payload.db.js'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://127.0.0.1:3001',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  /**
   * CSRF: origins allowed to send Payload auth cookies. Must include the admin URL (this app, :3001),
   * not only the headless web app (:3000), or admin Server Actions see "Unauthorized" / form state errors.
   * Include :3002 when GraphQL is served by romainRetreatServer.
   */
  cors: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
  ],
  csrf: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
  ],
  collections: [Users, Media, Posts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: resolveDatabaseAdapter(),
  graphQL: {
    // Served by romainRetreatServer when PAYLOAD_DISABLE_GRAPHQL=true in this app's .env
    disable: process.env.PAYLOAD_DISABLE_GRAPHQL === 'true' || process.env.PAYLOAD_DISABLE_GRAPHQL === '1',
    schemaOutputFile: path.resolve(dirname, '..', 'schema.graphql'),
  },
  sharp,
  plugins: [],
})
