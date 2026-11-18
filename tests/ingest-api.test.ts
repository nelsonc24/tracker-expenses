import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks: no database, no Clerk, no real ingest() ─────────────────────────

const mocks = vi.hoisted(() => ({
  clerkUserId: null as string | null,
  accountBelongsToUser: vi.fn<(userId: string, accountId: string) => Promise<boolean>>(async () => true),
  ingest: vi.fn<(params: Record<string, unknown>) => Promise<unknown>>(async () => ({
    sessionId: 'session_1',
    inserted: 3,
    duplicates: 1,
    needsReview: 0,
    errors: [],
    totalProcessed: 4,
    skipped: [],
    insertedRows: [],
  })),
  findByHash: vi.fn(),
  markUsed: vi.fn(async () => {}),
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: mocks.clerkUserId })),
}))

vi.mock('@/lib/ingest', async () => {
  const types = await vi.importActual<typeof import('@/lib/ingest/types')>('@/lib/ingest/types')
  return {
    IngestError: types.IngestError,
    ingest: mocks.ingest,
    drizzleStore: { accountBelongsToUser: mocks.accountBelongsToUser },
  }
})

vi.mock('@/lib/api-tokens/store', () => ({
  apiTokenLookup: { findByHash: mocks.findByHash, markUsed: mocks.markUsed },
}))

import { POST } from '@/app/api/ingest/route'
import { generateApiToken } from '@/lib/api-tokens/tokens'
import { IngestError } from '@/lib/ingest/types'

const ACCOUNT_ID = '7d3c2f4e-1b2a-4c5d-8e9f-0a1b2c3d4e5f'

function makeRequest(options: {
  file?: File | null
  accountId?: string | null
  bankFormat?: string
  authorization?: string
}): NextRequest {
  const form = new FormData()
  if (options.file !== null) {
    form.append('file', options.file ?? new File(['date,amount\n'], 'statement.csv', { type: 'text/csv' }))
  }
  if (options.accountId !== null) form.append('accountId', options.accountId ?? ACCOUNT_ID)
  if (options.bankFormat) form.append('bankFormat', options.bankFormat)

  const headers = new Headers()
  if (options.authorization) headers.set('authorization', options.authorization)
  return new NextRequest('http://localhost/api/ingest', { method: 'POST', body: form, headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.clerkUserId = 'user_clerk'
  mocks.accountBelongsToUser.mockResolvedValue(true)
  mocks.findByHash.mockResolvedValue(null)
})

describe('POST /api/ingest — auth', () => {
  test('401 without a session or token', async () => {
    mocks.clerkUserId = null
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(401)
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  test('Clerk session works and calls ingest() with source "api"', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, sessionId: 'session_1', inserted: 3, duplicates: 1 })
    expect(mocks.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_clerk', accountId: ACCOUNT_ID, source: 'api', fileName: 'statement.csv' })
    )
  })

  test('valid bearer token authenticates as the token owner and updates lastUsedAt', async () => {
    mocks.clerkUserId = null
    const { token, hash } = generateApiToken()
    mocks.findByHash.mockResolvedValue({ id: 'tok_1', userId: 'user_token', tokenHash: hash, revokedAt: null })

    const res = await POST(makeRequest({ authorization: `Bearer ${token}` }))

    expect(res.status).toBe(200)
    expect(mocks.markUsed).toHaveBeenCalledWith('tok_1')
    expect(mocks.ingest).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user_token' }))
  })

  test('a bad trk_ token is rejected even if a Clerk session exists', async () => {
    const { token } = generateApiToken()
    const res = await POST(makeRequest({ authorization: `Bearer ${token}` }))
    expect(res.status).toBe(401)
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  test('a revoked token is rejected', async () => {
    const { token, hash } = generateApiToken()
    mocks.findByHash.mockResolvedValue({ id: 'tok_1', userId: 'user_token', tokenHash: hash, revokedAt: new Date() })
    const res = await POST(makeRequest({ authorization: `Bearer ${token}` }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/revoked/i)
  })
})

describe('POST /api/ingest — validation', () => {
  test('missing file', async () => {
    const res = await POST(makeRequest({ file: null }))
    expect(res.status).toBe(400)
  })

  test('rejects files that are not .csv or .pdf', async () => {
    const res = await POST(makeRequest({ file: new File(['x'], 'statement.xlsx') }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/\.csv and \.pdf/)
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  test('accepts upper-case extensions', async () => {
    const res = await POST(makeRequest({ file: new File(['a,b\n'], 'STATEMENT.CSV') }))
    expect(res.status).toBe(200)
  })

  test('rejects files over 10 MB', async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.csv')
    const res = await POST(makeRequest({ file: big }))
    expect(res.status).toBe(413)
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  test('rejects empty files', async () => {
    const res = await POST(makeRequest({ file: new File([], 'empty.csv') }))
    expect(res.status).toBe(400)
  })

  test('rejects a .pdf that is not a PDF', async () => {
    const res = await POST(makeRequest({ file: new File(['not a pdf'], 'statement.pdf') }))
    expect(res.status).toBe(400)
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  test('accepts a real PDF header', async () => {
    const res = await POST(makeRequest({ file: new File(['%PDF-1.7\n...'], 'statement.pdf', { type: 'application/pdf' }) }))
    expect(res.status).toBe(200)
  })

  test('requires a valid accountId', async () => {
    expect((await POST(makeRequest({ accountId: null }))).status).toBe(400)
    expect((await POST(makeRequest({ accountId: 'not-a-uuid' }))).status).toBe(400)
  })

  test('rejects an account the user does not own', async () => {
    mocks.accountBelongsToUser.mockResolvedValue(false)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(403)
    expect(mocks.accountBelongsToUser).toHaveBeenCalledWith('user_clerk', ACCOUNT_ID)
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  test('rejects an unknown bankFormat, passes a known one through', async () => {
    expect((await POST(makeRequest({ bankFormat: 'nope' }))).status).toBe(400)

    const res = await POST(makeRequest({ bankFormat: 'westpac' }))
    expect(res.status).toBe(200)
    expect(mocks.ingest).toHaveBeenCalledWith(expect.objectContaining({ bankFormat: 'westpac' }))
  })

  test('strips path components from the file name', async () => {
    await POST(makeRequest({ file: new File(['a\n'], '../../etc/statement.csv') }))
    expect(mocks.ingest).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'statement.csv' }))
  })
})

describe('POST /api/ingest — ingest() errors', () => {
  test('parse_failed → 422', async () => {
    mocks.ingest.mockRejectedValueOnce(new IngestError('Could not detect format', 'parse_failed'))
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(422)
  })

  test('unexpected error → 500 without leaking details', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.ingest.mockRejectedValueOnce(new Error('connection string postgres://secret'))
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
    spy.mockRestore()
  })
})
