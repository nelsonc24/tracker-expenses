// Header parsing only, with no Node imports, so it can run in edge middleware.

export const API_TOKEN_PREFIX = 'trk_'
/** Prefix used by tokens created before PR #3 (PR #5's version); still accepted. */
export const LEGACY_API_TOKEN_PREFIX = 'txk_'
const ACCEPTED_PREFIXES = [API_TOKEN_PREFIX, LEGACY_API_TOKEN_PREFIX]

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
  return token !== null && ACCEPTED_PREFIXES.some(prefix => token.startsWith(prefix))
}
