import { mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findReadyFiles,
  isSupportedFile,
  loadConfig,
  moveFile,
  resolveAccountId,
  uploadFile,
} from '../scripts/watch-imports-core'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'watch-imports-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('resolveAccountId', () => {
  const accounts = { commbank: 'acc-cba', '/^anz.*visa/': 'acc-anz', Latitude: 'acc-lat' }
  it('matches substrings case-insensitively and regex patterns, first match wins', () => {
    expect(resolveAccountId('CommBank_March.csv', accounts)).toBe('acc-cba')
    expect(resolveAccountId('ANZ-visa-2026.pdf', accounts)).toBe('acc-anz')
    expect(resolveAccountId('latitude statement.pdf', accounts)).toBe('acc-lat')
  })
  it('falls back to the default, or null', () => {
    expect(resolveAccountId('other.csv', accounts, 'acc-default')).toBe('acc-default')
    expect(resolveAccountId('other.csv', accounts)).toBeNull()
  })
})

describe('isSupportedFile', () => {
  it('accepts csv/pdf and ignores hidden and temp files', () => {
    expect(isSupportedFile('a.CSV')).toBe(true)
    expect(isSupportedFile('a.pdf')).toBe(true)
    expect(isSupportedFile('a.xlsx')).toBe(false)
    expect(isSupportedFile('.DS_Store')).toBe(false)
    expect(isSupportedFile('.a.csv')).toBe(false)
    expect(isSupportedFile('a.csv.crdownload')).toBe(false)
  })
})

describe('findReadyFiles', () => {
  it('skips files still being written, empty files and unsupported ones', async () => {
    const now = Date.now()
    const old = new Date(now - 60_000)
    await writeFile(path.join(dir, 'ready.csv'), 'x')
    await utimes(path.join(dir, 'ready.csv'), old, old)
    await writeFile(path.join(dir, 'fresh.csv'), 'x')
    await writeFile(path.join(dir, 'empty.csv'), '')
    await utimes(path.join(dir, 'empty.csv'), old, old)
    await writeFile(path.join(dir, 'notes.txt'), 'x')
    await utimes(path.join(dir, 'notes.txt'), old, old)

    const ready = await findReadyFiles(dir, 3000, now)
    expect(ready.map(f => path.basename(f))).toEqual(['ready.csv'])
  })
})

describe('moveFile', () => {
  it('moves into processed/ or failed/ with a timestamp and an optional error note', async () => {
    const file = path.join(dir, 'a.csv')
    await writeFile(file, 'x')
    const dest = await moveFile(file, 'failed', new Date('2026-01-02T03:04:05.000Z'), 'bad file')
    expect(dest).toBe(path.join(dir, 'failed', '2026-01-02T03-04-05-000Z_a.csv'))
    expect(await readdir(dir)).toEqual(['failed'])
    expect(await readFile(`${dest}.error.txt`, 'utf8')).toBe('bad file\n')
  })
})

describe('uploadFile', () => {
  const config = { ingestUrl: 'http://localhost/api/ingest', token: 'txk_abc', bankFormat: undefined }

  async function upload(fetchImpl: typeof fetch) {
    const file = path.join(dir, 'a.csv')
    await writeFile(file, 'a,b')
    return uploadFile(file, 'acc1', config, fetchImpl)
  }

  it('sends the file, account and bearer token, and summarises success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ inserted: 3, duplicates: 1, needsReview: 2 }))
    const outcome = await upload(fetchImpl as unknown as typeof fetch)
    expect(outcome).toEqual({ kind: 'processed', summary: '3 new, 1 duplicates, 2 to review' })

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(config.ingestUrl)
    expect(init.headers.Authorization).toBe('Bearer txk_abc')
    const form = init.body as FormData
    expect(form.get('accountId')).toBe('acc1')
    expect((form.get('file') as File).name).toBe('a.csv')
  })

  it('treats 4xx as failed and 5xx / network errors as retry', async () => {
    expect(await upload((async () => Response.json({ error: 'nope' }, { status: 422 })) as typeof fetch)).toEqual({
      kind: 'failed',
      reason: '422 nope',
    })
    expect((await upload((async () => Response.json({}, { status: 503 })) as typeof fetch)).kind).toBe('retry')
    expect(
      (
        await upload((async () => {
          throw new Error('offline')
        }) as typeof fetch)
      ).kind
    ).toBe('retry')
  })
})

describe('loadConfig', () => {
  it('requires a url, a token and an account', async () => {
    await expect(loadConfig({})).rejects.toThrow(/INGEST_URL/)
    await expect(loadConfig({ INGEST_URL: 'http://x' })).rejects.toThrow(/INGEST_TOKEN/)
    await expect(loadConfig({ INGEST_URL: 'http://x', INGEST_TOKEN: 't' })).rejects.toThrow(/accounts map/)
  })

  it('merges a JSON file under env vars', async () => {
    const cfg = path.join(dir, 'watch.json')
    await writeFile(cfg, JSON.stringify({ INGEST_URL: 'http://file', accounts: { cba: 'a1' }, WATCH_DIR: dir }))
    const config = await loadConfig({ WATCH_CONFIG: cfg, INGEST_TOKEN: 't', INGEST_URL: 'http://env' })
    expect(config).toMatchObject({ ingestUrl: 'http://env', token: 't', watchDir: dir, accounts: { cba: 'a1' } })
  })
})
