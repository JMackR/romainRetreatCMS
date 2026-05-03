import { s3Storage } from '@payloadcms/storage-s3'
import { getFileKey } from '@payloadcms/plugin-cloud-storage/utilities'

const bucket = process.env.S3_BUCKET
const region = process.env.S3_REGION
const keyPrefix = process.env.S3_KEY_PREFIX

/**
 * Browser → S3 uploads (pre-signed) so the server is not the request body. Optional on AWS (ALB/ECS can use larger server bodies).
 * @see https://github.com/payloadcms/payload/tree/3.x/packages/storage-s3
 *
 * S3 bucket CORS: allow your CMS origins (localhost, https://cms.rrcliving.com, etc.) with PUT and the headers the SDK uses.
 * Set S3_USE_CLIENT_UPLOADS=1 for direct browser → S3 uploads (e.g. large files, or strict server body limits).
 * Set S3_USE_CLIENT_UPLOADS=0 (default) for server-side upload via Payload.
 */
function s3ClientUploadsEnabled(): boolean {
  const ex = process.env.S3_USE_CLIENT_UPLOADS
  if (ex === '0' || ex === 'false') return false
  if (ex === '1' || ex === 'true') return true
  return false
}

const s3ObjectPublicUrl = (fileKey: string) => {
  const encoded = fileKey
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/')

  const cdn = process.env.S3_PUBLIC_BASE_URL
  if (cdn) {
    return `${cdn.replace(/\/$/, '')}/${encoded}`
  }

  const b = process.env.S3_BUCKET || 'romain-media'
  const r = process.env.S3_REGION || 'us-east-1'
  return `https://${b}.s3.${r}.amazonaws.com/${encoded}`
}

/**
 * When `S3_BUCKET` is set, uploads go to S3 and file URLs point at the bucket (public read, or a CDN via `S3_PUBLIC_BASE_URL`).
 * Omit `S3_BUCKET` to use local `public/media` (see `Media` collection).
 */
export const s3MediaStorage = s3Storage({
  enabled: Boolean(bucket),
  useCompositePrefixes: false,
  clientUploads: s3ClientUploadsEnabled(),
  collections: {
    media: {
      disablePayloadAccessControl: true,
      ...(keyPrefix ? { prefix: keyPrefix } : {}),
      generateFileURL: ({ filename, prefix: docPrefix }) => {
        const { fileKey } = getFileKey({
          collectionPrefix: keyPrefix || '',
          docPrefix: docPrefix || '',
          filename,
          useCompositePrefixes: false,
        })
        return s3ObjectPublicUrl(fileKey)
      },
    },
  },
  bucket: bucket || 'romain-media',
  /**
   * When set to `public-read`, PutObject and presigned PUTs mark new objects as world-readable.
   * Only use if the bucket has **Object Ownership → ACLs enabled** (not "Bucket owner enforced"); many buckets block ACLs — use a bucket **policy** for public `GetObject` instead (see .env.example).
   */
  acl: process.env.S3_OBJECT_ACL === 'public-read' ? 'public-read' : undefined,
  config: {
    region: region || 'us-east-1',
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
  },
})
