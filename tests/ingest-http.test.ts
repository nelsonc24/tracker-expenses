import { describe, expect, it, vi } from 'vitest'

// The real stores talk to Neon; these tests never touch the database.
vi.mock('@/db', () => ({ db: {} }))
import { handleIngestRequest, MAX_INGEST_FILE_BYTES } from '@/lib/ingest/http'
import { IngestError, type IngestResult } from '@/lib/ingest'

const okResult: IngestResult = {
  sessionId: 's1',
  inserted: 2,
  duplicates: 1,
  needsReview: 1,
  errors: [],
  totalProcessed: 3,
  skipped: [],
  insertedRows: [],
}

function request(form: FormData | null): Request {
  return new Request('http://localhost/api/ingest', { method: 'POST', body: form ?? 'nope' })
}

function csvForm(extra: Record<string, string> = { accountId: 'acc1' }): FormData {
  const form = new FormData()
  form.set('file', new File(['a,b\n1,2'], 'march.csv', { type: 'text/csv' }))
  for (const [k, v] of Object.entries(extra)) form.set(k, v)
  return form
}

describe('handleIngestRequest', () => {
  it('rejects unauthenticated callers without touching ingest', async () => {
    const ingest = vi.fn()
    const res = await handleIngestRequest(request(csvForm()), { resolveUserId: async () => null, ingest })
    expect(res.status).toBe(401)
    expect(ingest).not.toHaveBeenCalled()
  })

  it('ingests with source "api" and returns the summary', async () => {
    const ingest = vi.fn().mockResolvedValue(okResult)
    const res = await handleIngestRequest(request(csvForm({ accountId: 'acc1', bankFormat: 'anz' })), {
      resolveUserId: async () => 'user_1',
      ingest,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, inserted: 2, duplicates: 1, needsReview: 1 })
    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_1', accountId: 'acc1', source: 'api', fileName: 'march.csv', bankFormat: 'anz' })
    )
  })

  it('validates the body', async () => {
    const deps = { resolveUserId: async () => 'user_1', ingest: vi.fn() }
    expect((await handleIngestRequest(request(null), deps)).status).toBe(400)
    expect((await handleIngestRequest(request(csvForm({})), deps)).status).toBe(400)

    const noFile = new FormData()
    noFile.set('accountId', 'acc1')
    expect((await handleIngestRequest(request(noFile), deps)).status).toBe(400)

    const empty = new FormData()
    empty.set('file', new File([], 'empty.csv'))
    empty.set('accountId', 'acc1')
    expect((await handleIngestRequest(request(empty), deps)).status).toBe(400)

    const big = new FormData()
    big.set('file', new File([new Uint8Array(MAX_INGEST_FILE_BYTES + 1)], 'big.csv'))
    big.set('accountId', 'acc1')
    expect((await handleIngestRequest(request(big), deps)).status).toBe(413)
    expect(deps.ingest).not.toHaveBeenCalled()
  })

  it('maps ingest errors to status codes', async () => {
    const run = async (error: unknown) =>
      (
        await handleIngestRequest(request(csvForm()), {
          resolveUserId: async () => 'user_1',
          ingest: vi.fn().mockRejectedValue(error),
        })
      ).status

    expect(await run(new IngestError('x', 'invalid_account'))).toBe(403)
    expect(await run(new IngestError('x', 'parse_failed'))).toBe(422)
    expect(await run(new IngestError('x', 'unsupported_file'))).toBe(400)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await run(new Error('boom'))).toBe(500)
    spy.mockRestore()
  })
})
