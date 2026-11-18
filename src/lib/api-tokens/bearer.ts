// Header parsing only, with no Node imports, so it can run in edge middleware.

export const API_TOKEN_PREFIX = 'trk_'

/**
 * Pull the token out of an `Authorization` header.
 * Returns null when there is no bearer credential at all.
 */
export function parseBearerToken(header: string | null | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header.trim())
  return match ? match[1] : null
}

/** True when the request carries one of our personal API tokens (not a Clerk session JWT). */
export function hasApiTokenBearer(header: string | null | undefined): boolean {
  const token = parseBearerToken(header)
  return token !== null && token.startsWith(API_TOKEN_PREFIX)
}
