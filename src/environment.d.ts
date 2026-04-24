declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL_PROJECT_PRODUCTION_URL: string
      /** e.g. `romain-media` (ARN: arn:aws:s3:::romain-media) */
      S3_BUCKET?: string
      S3_REGION?: string
      S3_ACCESS_KEY_ID?: string
      S3_SECRET_ACCESS_KEY?: string
      /** Optional key prefix inside the bucket */
      S3_KEY_PREFIX?: string
      /** If set, media file URLs use this base (e.g. `https://d111.cloudfront.net`) instead of S3 */
      S3_PUBLIC_BASE_URL?: string
      /** 1/0: override @payloadcms/storage-s3 `clientUploads` (Vercel defaults to direct browser uploads) */
      S3_USE_CLIENT_UPLOADS?: string
      /** `public-read` if the bucket has ACLs enabled; otherwise use a bucket policy for s3:GetObject */
      S3_OBJECT_ACL?: string
      /** Next/Image: hostname for media; required if S3 object URLs are not on `*.s3.*.amazonaws.com` (e.g. CloudFront) */
      NEXT_PUBLIC_S3_MEDIA_HOSTNAME?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
