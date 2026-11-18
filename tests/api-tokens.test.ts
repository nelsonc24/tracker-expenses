import { describe, expect, test, vi } from 'vitest'
import {
  API_TOKEN_PREFIX,
  authenticateBearer,
  generateApiToken,
  hasApiTokenBearer,
  hashApiToken,
  isWellFormedApiToken,
  parseBearerToken,
  verifyApiToken,
  type ApiTokenLookup,
  type StoredApiToken,
} from '@/lib/api-tokens/tokens'

describe('generateApiToken', () => {
  test('has the trk_ prefix, is well formed, and returns its sha256 hash', () => {
    const { token, hash } = generateApiToken()
    expect(token.startsWith(API_TOKEN_PREFIX)).toBe(true)
    expect(isWellFormedApiToken(token)).toBe(true)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(hashApiToken(token))
    expect(hash).not.toContain(token.slice(4))
  })

  test('tokens are unique', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateApiToken().token))
    expect(tokens.size).toBe(50)
  })
})

describe('verifyApiToken', () => {
  test('accepts the matching token and rejects others', () => {
    const a = generateApiToken()
    const b = generateApiToken()
    expect(verifyApiToken(a.token, a.hash)).toBe(true)
    expect(verifyApiToken(b.token, a.hash)).toBe(false)
  })

  test('rejects malformed tokens and bad stored hashes', () => {
    const a = generateApiToken()
    expect(verifyApiToken('trk_short', a.hash)).toBe(false)
    expect(verifyApiToken(a.token.replace('trk_', 'xyz_'), a.hash)).toBe(false)
    expect(verifyApiToken(a.token, '')).toBe(false)
    expect(verifyApiToken(a.token, 'abcd')).toBe(false)
  })
})

describe('parseBearerToken / hasApiTokenBearer', () => {
  test('parses Bearer headers case-insensitively', () => {
    expect(parseBearerToken('Bearer trk_abc')).toBe('trk_abc')
    expect(parseBearerToken('bearer   trk_abc  ')).toBe('trk_abc')
    expect(parseBearerToken('Basic dXNlcg==')).toBeNull()
    expect(parseBearerToken('Bearer a b')).toBeNull()
    expect(parseBearerToken(null)).toBeNull()
  })

  test('only trk_ tokens count as API tokens (Clerk JWTs do not)', () => {
    expect(hasApiTokenBearer('Bearer trk_abc')).toBe(true)
    expect(hasApiTokenBearer('Bearer eyJhbGciOi.payload.sig')).toBe(false)
    expect(hasApiTokenBearer(undefined)).toBe(false)
  })
})

describe('authenticateBearer', () => {
  function setup(rows: StoredApiToken[]) {
    const lookup: ApiTokenLookup = {
      findByHash: vi.fn(async (hash: string) => rows.find(r => r.tokenHash === hash) ?? null),
      markUsed: vi.fn(async () => {}),
    }
    return lookup
  }

  test('valid token authenticates and marks it used', async () => {
    const { token, hash } = generateApiToken()
    const lookup = setup([{ id: 't1', userId: 'user_1', tokenHash: hash, revokedAt: null }])

    const result = await authenticateBearer(`Bearer ${token}`, lookup)

    expect(result).toEqual({ ok: true, userId: 'user_1', tokenId: 't1' })
    expect(lookup.markUsed).toHaveBeenCalledWith('t1')
    // looked up by hash, never by plaintext
    expect(lookup.findByHash).toHaveBeenCalledWith(hash)
  })

  test('revoked token is rejected and not marked used', async () => {
    const { token, hash } = generateApiToken()
    const lookup = setup([{ id: 't1', userId: 'user_1', tokenHash: hash, revokedAt: new Date() }])

    expect(await authenticateBearer(`Bearer ${token}`, lookup)).toEqual({ ok: false, reason: 'revoked' })
    expect(lookup.markUsed).not.toHaveBeenCalled()
  })

  test('wrong (unknown) token is rejected', async () => {
    const stored = generateApiToken()
    const other = generateApiToken()
    const lookup = setup([{ id: 't1', userId: 'user_1', tokenHash: stored.hash, revokedAt: null }])

    expect(await authenticateBearer(`Bearer ${other.token}`, lookup)).toEqual({ ok: false, reason: 'unknown' })
  })

  test('missing or malformed header is rejected without a lookup', async () => {
    const lookup = setup([])
    expect(await authenticateBearer(null, lookup)).toEqual({ ok: false, reason: 'missing' })
    expect(await authenticateBearer('Bearer trk_nope', lookup)).toEqual({ ok: false, reason: 'malformed' })
    expect(lookup.findByHash).not.toHaveBeenCalled()
  })

  test('a failing lastUsedAt update does not fail authentication', async () => {
    const { token, hash } = generateApiToken()
    const lookup = setup([{ id: 't1', userId: 'user_1', tokenHash: hash, revokedAt: null }])
    lookup.markUsed = vi.fn(async () => {
      throw new Error('db down')
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await authenticateBearer(`Bearer ${token}`, lookup)

    expect(result.ok).toBe(true)
    // the token must never end up in logs
    expect(JSON.stringify(spy.mock.calls)).not.toContain(token)
    spy.mockRestore()
  })
})
