import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'
import { redirects } from './redirects'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const retreatServer = (process.env.ROMAIN_RETREAT_SERVER_URL ?? 'http://127.0.0.1:3002').replace(
  /\/$/,
  '',
)
const retreatGraphPath = (process.env.ROMAIN_RETREAT_SERVER_GRAPHQL_PATH ?? '/graphql').replace(
  /\/$/,
  '',
)
const retreatServerGraphQLUrl = `${retreatServer}${retreatGraphPath}`

/**
 * Next/Image: allow optimized fetches for virtual-hosted S3 (`bucket.s3.region...`) or a custom CDN/CloudFront host.
 * Set the same `NEXT_PUBLIC_*` you use for the browser, or `S3_BUCKET` + `S3_REGION` for the default S3 host.
 */
const s3MediaRemotePatterns = (() => {
  const custom = process.env.NEXT_PUBLIC_S3_MEDIA_HOSTNAME
  if (custom) {
    return [
      {
        protocol: 'https' as const,
        hostname: custom,
        pathname: '/**' as const,
      },
    ]
  }
  const cdn = process.env.S3_PUBLIC_BASE_URL
  if (cdn) {
    try {
      const h = new URL(cdn).hostname
      if (h) {
        return [
          {
            protocol: 'https' as const,
            hostname: h,
            pathname: '/**' as const,
          },
        ]
      }
    } catch {
      // ignore
    }
  }
  const r = process.env.S3_REGION
  const b = process.env.S3_BUCKET
  if (r && b) {
    return [
      {
        protocol: 'https' as const,
        hostname: `${b}.s3.${r}.amazonaws.com`,
        pathname: '/**' as const,
      },
    ]
  }
  return []
})()

const NEXT_PUBLIC_SERVER_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.__NEXT_PRIVATE_ORIGIN || 'http://localhost:3000'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
    qualities: [100],
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL].map((item) => {
        const url = new URL(item)
        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', '') as 'http' | 'https',
        }
      }),
      ...s3MediaRemotePatterns,
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  reactStrictMode: true,
  redirects,
  turbopack: {
    root: path.resolve(dirname),
  },
  async rewrites() {
    return [
      {
        source: '/api/retreat-graphql',
        destination: retreatServerGraphQLUrl,
      },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
