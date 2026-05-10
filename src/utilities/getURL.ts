import canUseDOM from './canUseDOM'

/** Local dev when `NEXT_PUBLIC_SERVER_URL` is unset: match `next dev` / project port (see `.env.example`). */
const localDevHttpBase = () =>
  `http://localhost:${process.env.PORT || process.env.NEXT_DEV_PORT || '3002'}`

/** HTTPS origin for Vercel when explicit public URLs are unset (metadataBase, OG URLs, Payload `cors`). */
const vercelHttpsOrigin = (): string | undefined => {
  if (!process.env.VERCEL) return undefined
  const prodHost =
    process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//i, '')
      : undefined
  const host = prodHost ?? process.env.VERCEL_URL
  if (!host) return undefined
  return `https://${host.replace(/^https?:\/\//i, '')}`
}

export const getServerSideURL = () => {
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SERVER_URL.replace(/\/$/, '')
  }
  if (process.env.PAYLOAD_SERVER_URL) {
    return process.env.PAYLOAD_SERVER_URL.replace(/\/$/, '')
  }
  return vercelHttpsOrigin() ?? localDevHttpBase()
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  return (
    process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') ||
    process.env.PAYLOAD_SERVER_URL?.replace(/\/$/, '') ||
    vercelHttpsOrigin() ||
    localDevHttpBase()
  )
}
