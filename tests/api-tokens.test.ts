import { describe, expect, it, vi } from 'vitest'

// The real stores talk to Neon; these tests never touch the database.
vi.mock('@/db', () => ({ db: {} }))
import {
  TOKEN_PREFIX,
  authenticateBearer,
  extractBearerToken,
  generateApiToken,
  hashApiToken,
  type TokenStore,
} from '@/lib/api-tokens'

function memoryTokenStore(): TokenStore & { hashes: Map<string, string>; revoked: Set<string> } {
  const hashes = new Map<string, string>()
  const revoked = new Set<string>()
  return {
    hashes,
    revoked,
    async findUserByTokenHash(hash) {
      return revoked.has(hash) ? null : hashes.get(hash) ?? null
    },
  }
}

describe('api tokens', () => {
  it('generates unique prefixed tokens and stores only a hash', () => {
    const a = generateApiToken()
    const b = generateApiToken()
    expect(a.token.startsWith(TOKEN_PREFIX)).toBe(true)
    expect(a.token).not.toBe(b.token)
    expect(a.tokenHash).toBe(hashApiToken(a.token))
    expect(a.tokenHash).not.toContain(a.token)
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(a.token.startsWith(a.tokenPrefix)).toBe(true)
    expect(a.tokenPrefix.length).toBeLessThan(a.token.length / 2)
  })

  it('extracts bearer tokens only when well formed', () => {
    const { token } = generateApiToken()
    expect(extractBearerToken(`Bearer ${token}`)).toBe(token)
    expect(extractBearerToken(`bearer ${token}`)).toBe(token)
    expect(extractBearerToken(token)).toBeNull()
    expect(extractBearerToken('Bearer not-ours')).toBeNull()
    expect(extractBearerToken('Basic abc')).toBeNull()
    expect(extractBearerToken(null)).toBeNull()
  })

  it('authenticates a live token and rejects unknown or revoked ones', async () => {
    const store = memoryTokenStore()
    const { token, tokenHash } = generateApiToken()
    store.hashes.set(tokenHash, 'user_1')

    expect(await authenticateBearer(`Bearer ${token}`, store)).toBe('user_1')
    expect(await authenticateBearer(`Bearer ${generateApiToken().token}`, store)).toBeNull()
    expect(await authenticateBearer(undefined, store)).toBeNull()

    store.revoked.add(tokenHash)
    expect(await authenticateBearer(`Bearer ${token}`, store)).toBeNull()
  })
})
