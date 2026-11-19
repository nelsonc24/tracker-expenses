import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface WatchConfig {
  ingestUrl: string
  token: string
  watchDir: string
  /** Filename pattern -> accountId. A pattern is a case-insensitive substring, or /regex/. First match wins. */
  accounts: Record<string, string>
  /** Used when no pattern matches. Without it, unmatched files go to failed/. */
  defaultAccountId?: string
  /** Optional bankFormat to send (omit to auto-detect). */
  bankFormat?: string
  pollMs: number
  /** A file must be this old (ms since last write) before it is picked up, so half-downloaded files are skipped. */
  settleMs: number
}

export const SUPPORTED_EXTENSIONS = ['.csv', '.pdf']

function expandHome(p: string): string {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p
}

/** Config comes from env vars, optionally merged over a JSON file (`WATCH_CONFIG`, env wins). */
export async function loadConfig(env: Record<string, string | undefined> = process.env): Promise<WatchConfig> {
  let file: Record<string, unknown> = {}
  if (env.WATCH_CONFIG) {
    file = JSON.parse(await fs.readFile(expandHome(env.WATCH_CONFIG), 'utf8'))
  }

  const ingestUrl = String(env.INGEST_URL ?? file.INGEST_URL ?? '')
  const token = String(env.INGEST_TOKEN ?? file.INGEST_TOKEN ?? '')
  if (!ingestUrl) throw new Error('INGEST_URL is required (e.g. https://your-app.vercel.app/api/ingest)')
  if (!token) throw new Error('INGEST_TOKEN is required (create one in Settings > Data > API tokens)')

  const accounts = (file.accounts ?? {}) as Record<string, string>
  const defaultAccountId = (env.INGEST_ACCOUNT_ID ?? file.defaultAccountId) as string | undefined
  if (Object.keys(accounts).length === 0 && !defaultAccountId) {
    throw new Error('Set an accounts map (filename pattern -> accountId) in WATCH_CONFIG, or INGEST_ACCOUNT_ID')
  }

  return {
    ingestUrl,
    token,
    watchDir: path.resolve(expandHome(String(env.WATCH_DIR ?? file.WATCH_DIR ?? '~/Downloads/bank-imports'))),
    accounts,
    defaultAccountId,
    bankFormat: (env.INGEST_BANK_FORMAT ?? file.bankFormat) as string | undefined,
    pollMs: Number(env.WATCH_POLL_MS ?? file.pollMs ?? 5000),
    settleMs: Number(env.WATCH_SETTLE_MS ?? file.settleMs ?? 3000),
  }
}

export function isSupportedFile(fileName: string): boolean {
  if (fileName.startsWith('.')) return false // .DS_Store, .crdownload temp names, etc.
  return SUPPORTED_EXTENSIONS.includes(path.extname(fileName).toLowerCase())
}

function patternMatches(pattern: string, fileName: string): boolean {
  const regex = /^\/(.+)\/([a-z]*)$/.exec(pattern)
  if (regex) return new RegExp(regex[1], regex[2].includes('i') ? regex[2] : `${regex[2]}i`).test(fileName)
  return fileName.toLowerCase().includes(pattern.toLowerCase())
}

/** Which account a file belongs to, or null if nothing matches and there is no default. */
export function resolveAccountId(
  fileName: string,
  accounts: Record<string, string>,
  defaultAccountId?: string
): string | null {
  for (const [pattern, accountId] of Object.entries(accounts)) {
    if (patternMatches(pattern, fileName)) return accountId
  }
  return defaultAccountId ?? null
}

export type UploadOutcome =
  | { kind: 'processed'; summary: string }
  | { kind: 'failed'; reason: string } // the server rejected this file; retrying will not help
  | { kind: 'retry'; reason: string } // network trouble or a 5xx; try again on the next poll

const MIME: Record<string, string> = { '.csv': 'text/csv', '.pdf': 'application/pdf' }

export async function uploadFile(
  filePath: string,
  accountId: string,
  config: Pick<WatchConfig, 'ingestUrl' | 'token' | 'bankFormat'>,
  fetchImpl: typeof fetch = fetch
): Promise<UploadOutcome> {
  const fileName = path.basename(filePath)
  const buffer = await fs.readFile(filePath)
  const form = new FormData()
  form.set('file', new File([new Uint8Array(buffer)], fileName, { type: MIME[path.extname(fileName).toLowerCase()] }))
  form.set('accountId', accountId)
  if (config.bankFormat) form.set('bankFormat', config.bankFormat)

  let res: Response
  try {
    res = await fetchImpl(config.ingestUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}` },
      body: form,
    })
  } catch (error) {
    return { kind: 'retry', reason: error instanceof Error ? error.message : 'network error' }
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (res.ok) {
    return {
      kind: 'processed',
      summary: `${body.inserted ?? 0} new, ${body.duplicates ?? 0} duplicates, ${body.needsReview ?? 0} to review`,
    }
  }
  const reason = `${res.status} ${typeof body.error === 'string' ? body.error : res.statusText}`
  // 5xx and 429 are worth retrying; other 4xx (bad file, bad token, wrong account) are not
  return res.status >= 500 || res.status === 429 ? { kind: 'retry', reason } : { kind: 'failed', reason }
}

/** Move into `<dir>/<processed|failed>/`, prefixing a timestamp so repeated downloads never collide. */
export async function moveFile(
  filePath: string,
  target: 'processed' | 'failed',
  now: Date = new Date(),
  note?: string
): Promise<string> {
  const dir = path.join(path.dirname(filePath), target)
  await fs.mkdir(dir, { recursive: true })
  const stamp = now.toISOString().replace(/[:.]/g, '-')
  const dest = path.join(dir, `${stamp}_${path.basename(filePath)}`)
  await fs.rename(filePath, dest)
  if (note) await fs.writeFile(`${dest}.error.txt`, `${note}\n`)
  return dest
}

/** Files in the top level of `dir` that are supported and have not been written to for `settleMs`. */
export async function findReadyFiles(dir: string, settleMs: number, now: number = Date.now()): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const ready: string[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !isSupportedFile(entry.name)) continue
    const full = path.join(dir, entry.name)
    const stat = await fs.stat(full)
    if (stat.size > 0 && now - stat.mtimeMs >= settleMs) ready.push(full)
  }
  return ready.sort()
}
