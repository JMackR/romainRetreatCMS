import { Signer } from '@aws-sdk/rds-signer'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { parse } from 'pg-connection-string'

function isPostgresUrl(url: string): boolean {
  return url.startsWith('postgres://') || url.startsWith('postgresql://')
}

/**
 * IAM DB auth is only used in real Lambda (or when explicitly testing IAM locally).
 * Copied Lambda env often sets RDS_IAM_AUTH=1; without this guard, local Next/Payload dev would try to sign RDS tokens.
 */
function useRdsIamAuth(): boolean {
  const v = process.env.RDS_IAM_AUTH
  if (v !== '1' && v !== 'true') return false
  if (process.env.RDS_IAM_AUTH_ALLOW_LOCAL === '1' || process.env.RDS_IAM_AUTH_ALLOW_LOCAL === 'true') {
    return true
  }
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
}

function forceSqlite(): boolean {
  const d = (process.env.PAYLOAD_DB_DRIVER || '').toLowerCase()
  return d === 'sqlite'
}

function postgresPushEnabled(databaseUrl: string): boolean {
  const flag = process.env.PAYLOAD_DATABASE_PUSH
  if (flag === '1' || flag === 'true') return true
  if (flag === '0' || flag === 'false') return false
  if (databaseUrl.includes('rds.amazonaws.com')) return false
  return true
}

/**
 * Local: SQLite when `DATABASE_URL` is not a Postgres URL, or when `PAYLOAD_DB_DRIVER=sqlite`.
 * Local Postgres: set `DATABASE_URL=postgresql://...` and do not set Lambda-only `RDS_IAM_AUTH` (ignored unless on Lambda anyway).
 * Lambda + RDS IAM: `RDS_IAM_AUTH=1` on Lambda; passwordless `DATABASE_URL`; optional `RDS_IAM_AUTH_ALLOW_LOCAL=1` to test IAM from your laptop.
 */
export function resolveDatabaseAdapter() {
  const databaseUrl = process.env.DATABASE_URL || ''

  if (forceSqlite()) {
    return sqliteAdapter({
      client: {
        url: databaseUrl,
      },
    })
  }

  if (useRdsIamAuth()) {
    if (!databaseUrl || !isPostgresUrl(databaseUrl)) {
      throw new Error(
        'RDS_IAM_AUTH is set but DATABASE_URL must be a postgres URL (e.g. postgresql://postgres@your-db.region.rds.amazonaws.com:5432/postgres?sslmode=require)',
      )
    }

    const parsed = parse(databaseUrl)
    const host = parsed.host
    const port = parsed.port ? Number(parsed.port) : 5432
    const user = parsed.user || 'postgres'

    if (!host) {
      throw new Error('DATABASE_URL must include a host when using RDS_IAM_AUTH')
    }

    const signer = new Signer({
      hostname: host,
      port,
      username: user,
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    })

    return postgresAdapter({
      pool: {
        connectionString: databaseUrl,
        password: () => signer.getAuthToken(),
        max: Number(process.env.RDS_POOL_MAX || '2'),
        idleTimeoutMillis: Number(process.env.RDS_POOL_IDLE_MS || '60000'),
      },
      push: postgresPushEnabled(databaseUrl),
    })
  }

  if (databaseUrl && isPostgresUrl(databaseUrl)) {
    return postgresAdapter({
      pool: {
        connectionString: databaseUrl,
        max: Number(process.env.RDS_POOL_MAX || '5'),
      },
      push: postgresPushEnabled(databaseUrl),
    })
  }

  return sqliteAdapter({
    client: {
      url: databaseUrl,
    },
  })
}
