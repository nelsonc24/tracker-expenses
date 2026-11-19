import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, test, vi } from 'vitest'
import {
  buildConfig,
  expandHome,
  isCandidateFile,
  matchAccount,
  patternToRegExp,
  uniqueDestination,
  uploadFile,
  type AccountRule,
} from '../scripts/watch-imports-lib'

const CBA = '11111111-1111-4111-8111-111111111111'
const LATITUDE = '22222222-2222-4222-8222-222222222222'
const FALLBACK = '33333333-3333-4333-8333-333333333333'
const TOKEN = 'trk_' + 'a'.repeat(43)

const rules: AccountRule[] = [
  { pattern: 'CSVData*.csv', accountId: CBA, bankFormat: 'commonwealth' },
  { pattern: '/^latitude.*statement.*\\.pdf$/i', accountId: LATITUDE },
  { pattern: 'westpac-??.csv', accountId: FALLBACK, bankFormat: 'westpac' },
]

describe('patternToRegExp', () => {
  test('globs match the whole name, case-insensitively', () => {
    expect(patternToRegExp('CSVData*.csv').test('csvdata (3).CSV')).toBe(true)
    expect(patternToRegExp('CSVData*.csv').test('old-CSVData.csv')).toBe(false)
    expect(patternToRegExp('a.b').test('axb')).toBe(false) // dot is literal
  })

  test('/regex/flags is used as a regex', () => {
    expect(patternToRegExp('/^nab_\\d+\\.csv$/').test('nab_123.csv')).toBe(true)
    expect(patternToRegExp('/^nab_\\d+\\.csv$/').test('NAB_123.csv')).toBe(false)
  })
})

describe('matchAccount', () => {
  test('first matching rule wins and carries its bankFormat', () => {
    expect(matchAccount('CSVData-2026-11.csv', rules)).toEqual({
      accountId: CBA,
      bankFormat: 'commonwealth',
      matchedBy: 'CSVData*.csv',
    })
    expect(matchAccount('Latitude_Statement_Nov.pdf', rules)?.accountId).toBe(LATITUDE)
    expect(matchAccount('westpac-01.csv', rules)?.bankFormat).toBe('westpac')
  })

  test('uses only the base name', () => {
    expect(matchAccount('/Users/me/Downloads/bank-imports/CSVData.csv', rules)?.accountId).toBe(CBA)
  })

  test('falls back to the default account, or null', () => {
    expect(matchAccount('random.csv', rules, FALLBACK)).toEqual({ accountId: FALLBACK, matchedBy: 'default' })
    expect(matchAccount('random.csv', rules)).toBeNull()
    expect(matchAccount('westpac-123.csv', rules)).toBeNull() // ? is exactly one char
  })
})

describe('isCandidateFile', () => {
  test('accepts csv/pdf only, skips hidden and partial downloads', () => {
    expect(isCandidateFile('a.csv')).toBe(true)
    expect(isCandidateFile('a.PDF')).toBe(true)
    expect(isCandidateFile('a.csv.crdownload')).toBe(false)
    expect(isCandidateFile('a.pdf.download')).toBe(false)
    expect(isCandidateFile('.DS_Store')).toBe(false)
    expect(isCandidateFile('.~lock.a.csv')).toBe(false)
    expect(isCandidateFile('notes.txt')).toBe(false)
    expect(isCandidateFile('processed')).toBe(false)
  })
})

describe('buildConfig', () => {
  const env = { INGEST_URL: 'https://example.vercel.app/api/ingest', INGEST_TOKEN: TOKEN }

  test('env + file, env wins; ~ is expanded', () => {
    const { config, errors } = buildConfig(
      { ...env, INGEST_WATCH_DIR: '~/bank' },
      { url: 'https://ignored.example/api/ingest', accounts: rules }
    )
    expect(errors).toEqual([])
    expect(config?.url).toBe(env.INGEST_URL)
    expect(config?.watchDir).toBe(path.join(os.homedir(), 'bank'))
    expect(config?.accounts).toHaveLength(3)
  })

  test('defaults the watch dir to ~/Downloads/bank-imports', () => {
    const { config } = buildConfig({ ...env, INGEST_DEFAULT_ACCOUNT_ID: FALLBACK })
    expect(config?.watchDir).toBe(expandHome('~/Downloads/bank-imports'))
  })

  test('requires https except for localhost', () => {
    expect(buildConfig({ ...env, INGEST_URL: 'http://example.com/api/ingest' }, { accounts: rules }).errors).toContain(
      'INGEST_URL must use https (http is only allowed for localhost)'
    )
    expect(buildConfig({ ...env, INGEST_URL: 'http://localhost:3001/api/ingest' }, { accounts: rules }).errors).toEqual([])
  })

  test('reports missing token, bad token, bad account ids and no rules', () => {
    expect(buildConfig({ INGEST_URL: env.INGEST_URL }, { accounts: rules }).errors[0]).toMatch(/INGEST_TOKEN is required/)
    expect(buildConfig({ ...env, INGEST_TOKEN: 'abc' }, { accounts: rules }).errors[0]).toMatch(/trk_/)
    expect(buildConfig(env, { accounts: [{ pattern: '*.csv', accountId: 'nope' }] }).errors[0]).toMatch(/UUID/)
    expect(buildConfig(env, {}).errors[0]).toMatch(/at least one/)
  })
})

describe('uniqueDestination', () => {
  let dir: string
  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
  })

  test('adds a timestamp when the name is taken', async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'watch-imports-'))
    expect(await uniqueDestination(dir, 'a.csv')).toBe(path.join(dir, 'a.csv'))
    await writeFile(path.join(dir, 'a.csv'), 'x')
    const second = await uniqueDestination(dir, 'a.csv', new Date(2026, 10, 19, 9, 30, 0))
    expect(second).toBe(path.join(dir, 'a-20261119-093000.csv'))
  })
})

describe('uploadFile', () => {
  const config = { url: 'https://example.vercel.app/api/ingest', token: TOKEN }
  const match = { accountId: CBA, bankFormat: 'commonwealth', matchedBy: 'x' }
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

  test('sends the bearer token and multipart fields', async () => {
    const fetchImpl = vi.fn(async () => json(200, { success: true, inserted: 2 }))
    const outcome = await uploadFile(config, 'a.csv', new TextEncoder().encode('x'), match, fetchImpl as typeof fetch)

    expect(outcome).toEqual({ kind: 'ok', body: { success: true, inserted: 2 } })
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`)
    const form = init.body as FormData
    expect(form.get('accountId')).toBe(CBA)
    expect(form.get('bankFormat')).toBe('commonwealth')
    expect((form.get('file') as File).name).toBe('a.csv')
  })

  test('4xx is a permanent rejection, 5xx and network errors are transient', async () => {
    const data = new Uint8Array([1])
    expect(await uploadFile(config, 'a.csv', data, match, (async () => json(403, { error: 'nope' })) as typeof fetch)).toEqual(
      { kind: 'rejected', status: 403, message: 'nope' }
    )
    expect((await uploadFile(config, 'a.csv', data, match, (async () => json(502, {})) as typeof fetch)).kind).toBe('transient')
    expect(
      (
        await uploadFile(config, 'a.csv', data, match, (async () => {
          throw new Error('ECONNREFUSED')
        }) as typeof fetch)
      ).kind
    ).toBe('transient')
  })

  test('a 401 is reported as unauthorized so the file is not moved to failed/', async () => {
    const outcome = await uploadFile(config, 'a.csv', new Uint8Array([1]), match, (async () => json(401, { error: 'Token has been revoked' })) as typeof fetch)
    expect(outcome).toEqual({ kind: 'unauthorized', message: 'Token has been revoked' })
  })
})
