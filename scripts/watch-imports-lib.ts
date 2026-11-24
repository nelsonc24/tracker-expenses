/**
 * Pure helpers for scripts/watch-imports.ts (config, filename → account matching,
 * upload). Kept separate so they can be unit-tested without starting a watcher.
 */
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { format } from 'date-fns'

export const SUPPORTED_EXTENSIONS = new Set(['.csv', '.pdf'])
export const DEFAULT_WATCH_DIR = '~/Downloads/bank-imports'
export const DEFAULT_CONFIG_PATH = '~/.config/tracker-expenses/watch-imports.json'
export const PROCESSED_DIR = 'processed'
export const FAILED_DIR = 'failed'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_PATTERN = /^trk_[A-Za-z0-9_-]{43}$/

export interface AccountRule {
  /** Glob (`*`, `?`, case-insensitive, whole name) or a regex written as `/pattern/flags`. */
  pattern: string
  accountId: string
  /** Optional CSV format key (commonwealth, westpac, ...). Omit to let the server auto-detect. */
  bankFormat?: string
}

export interface WatcherConfig {
  url: string
  token: string
  watchDir: string
  accounts: AccountRule[]
  /** Used when no rule matches. Without it, unmatched files go to failed/. */
  defaultAccountId?: string
  /** A file must keep the same size + mtime for this long before it is uploaded. */
  settleMs: number
  /** How often to rescan the folder (catches missed fs events and retries). */
  pollIntervalMs: number
}

/** Shape of the optional JSON config file. Env vars override it. */
export interface WatcherConfigFile {
  url?: string
  token?: string
  watchDir?: string
  accounts?: AccountRule[]
  defaultAccountId?: string
  settleMs?: number
  pollIntervalMs?: number
}

export function expandHome(p: string, home = os.homedir()): string {
  if (p === '~') return home
  if (p.startsWith('~/')) return path.join(home, p.slice(2))
  return p
}

// ─── Filename → account matching ────────────────────────────────────────────

export function patternToRegExp(pattern: string): RegExp {
  const regexLiteral = /^\/(.+)\/([a-z]*)$/.exec(pattern)
  if (regexLiteral) return new RegExp(regexLiteral[1], regexLiteral[2])

  const escaped = pattern
    .split('')
    .map(ch => {
      if (ch === '*') return '.*'
      if (ch === '?') return '.'
      return ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
  return new RegExp(`^${escaped}$`, 'i')
}

export interface AccountMatch {
  accountId: string
  bankFormat?: string
  /** The rule's pattern, or 'default'. */
  matchedBy: string
}

/** First matching rule wins; falls back to `defaultAccountId`; null when nothing matches. */
export function matchAccount(
  fileName: string,
  rules: AccountRule[],
  defaultAccountId?: string
): AccountMatch | null {
  const base = path.basename(fileName)
  for (const rule of rules) {
    if (patternToRegExp(rule.pattern).test(base)) {
      return { accountId: rule.accountId, bankFormat: rule.bankFormat, matchedBy: rule.pattern }
    }
  }
  return defaultAccountId ? { accountId: defaultAccountId, matchedBy: 'default' } : null
}

/**
 * Should this directory entry be uploaded? Skips hidden files and partial
 * downloads (.crdownload, .download, .part ...), which have other extensions anyway.
 */
export function isCandidateFile(fileName: string): boolean {
  if (fileName.startsWith('.')) return false
  return SUPPORTED_EXTENSIONS.has(path.extname(fileName).toLowerCase())
}

// ─── Config ─────────────────────────────────────────────────────────────────

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost')
}

export function buildConfig(
  env: Record<string, string | undefined>,
  file: WatcherConfigFile = {}
): { config?: WatcherConfig; errors: string[] } {
  const errors: string[] = []

  const url = env.INGEST_URL || file.url || ''
  const token = env.INGEST_TOKEN || file.token || ''
  const watchDir = expandHome(env.INGEST_WATCH_DIR || file.watchDir || DEFAULT_WATCH_DIR)
  const defaultAccountId = env.INGEST_DEFAULT_ACCOUNT_ID || file.defaultAccountId || undefined
  const accounts = file.accounts ?? []
  const settleMs = Number(env.INGEST_SETTLE_MS || file.settleMs || 2000)
  const pollIntervalMs = Number(env.INGEST_POLL_INTERVAL_MS || file.pollIntervalMs || 60_000)

  if (!url) {
    errors.push('INGEST_URL is required (e.g. https://your-app.vercel.app/api/ingest)')
  } else {
    try {
      const parsed = new URL(url)
      // The token travels in a header: never send it over plain http to a remote host
      if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalHost(parsed.hostname))) {
        errors.push('INGEST_URL must use https (http is only allowed for localhost)')
      }
    } catch {
      errors.push('INGEST_URL is not a valid URL')
    }
  }

  if (!token) errors.push('INGEST_TOKEN is required (create one in Settings → Data → API Tokens)')
  else if (!TOKEN_PATTERN.test(token)) errors.push('INGEST_TOKEN does not look like a trk_ token')

  if (!Array.isArray(accounts)) {
    errors.push('"accounts" must be an array of { pattern, accountId, bankFormat? }')
  } else {
    accounts.forEach((rule, i) => {
      if (!rule || typeof rule.pattern !== 'string' || !rule.pattern) {
        errors.push(`accounts[${i}].pattern is required`)
      } else {
        try {
          patternToRegExp(rule.pattern)
        } catch {
          errors.push(`accounts[${i}].pattern is not a valid regex`)
        }
      }
      if (!rule || typeof rule.accountId !== 'string' || !UUID_PATTERN.test(rule.accountId)) {
        errors.push(`accounts[${i}].accountId must be an account UUID`)
      }
    })
  }

  if (defaultAccountId && !UUID_PATTERN.test(defaultAccountId)) {
    errors.push('INGEST_DEFAULT_ACCOUNT_ID must be an account UUID')
  }
  if (Array.isArray(accounts) && accounts.length === 0 && !defaultAccountId) {
    errors.push('Configure at least one "accounts" rule or INGEST_DEFAULT_ACCOUNT_ID')
  }
  if (!Number.isFinite(settleMs) || settleMs < 0) errors.push('settleMs must be a non-negative number')
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 1000) errors.push('pollIntervalMs must be >= 1000')

  if (errors.length > 0) return { errors }
  return {
    config: { url, token, watchDir, accounts, defaultAccountId, settleMs, pollIntervalMs },
    errors,
  }
}

// ─── File helpers ───────────────────────────────────────────────────────────

/** `dir/name`, or `dir/name-20261119-093000.ext` if that already exists. */
export async function uniqueDestination(dir: string, fileName: string, now = new Date()): Promise<string> {
  const target = path.join(dir, fileName)
  try {
    await fs.access(target)
  } catch {
    return target
  }
  const ext = path.extname(fileName)
  const stem = path.basename(fileName, ext)
  return path.join(dir, `${stem}-${format(now, 'yyyyMMdd-HHmmss')}${ext}`)
}

/**
 * Resolves true once the file's size and mtime stop changing for `settleMs`
 * (i.e. the browser/Finder has finished writing it). False if it disappears.
 */
export async function waitUntilStable(filePath: string, settleMs: number, maxChecks = 30): Promise<boolean> {
  let previous: string | null = null
  for (let i = 0; i < maxChecks; i++) {
    let current: string
    try {
      const stat = await fs.stat(filePath)
      if (!stat.isFile()) return false
      current = `${stat.size}:${stat.mtimeMs}`
      if (stat.size > 0 && current === previous) return true
    } catch {
      return false
    }
    previous = current
    await new Promise(resolve => setTimeout(resolve, settleMs))
  }
  return false
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export type UploadOutcome =
  | { kind: 'ok'; body: Record<string, unknown> }
  /** 401: the token is bad or revoked. The file is fine, so it must stay in the folder. */
  | { kind: 'unauthorized'; message: string }
  /** The server said no (4xx): retrying won't help. */
  | { kind: 'rejected'; status: number; message: string }
  /** Network error or 5xx: worth retrying later. */
  | { kind: 'transient'; message: string }

export async function uploadFile(
  config: Pick<WatcherConfig, 'url' | 'token'>,
  fileName: string,
  data: Uint8Array,
  match: AccountMatch,
  fetchImpl: typeof fetch = fetch
): Promise<UploadOutcome> {
  const form = new FormData()
  const type = path.extname(fileName).toLowerCase() === '.pdf' ? 'application/pdf' : 'text/csv'
  form.append('file', new Blob([data as BlobPart], { type }), fileName)
  form.append('accountId', match.accountId)
  if (match.bankFormat) form.append('bankFormat', match.bankFormat)

  let response: Response
  try {
    response = await fetchImpl(config.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}` },
      body: form,
    })
  } catch (error) {
    return { kind: 'transient', message: error instanceof Error ? error.message : 'Network error' }
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (response.ok) return { kind: 'ok', body }

  const message = [body.error, body.details].filter(Boolean).join(': ') || `HTTP ${response.status}`
  if (response.status === 401) return { kind: 'unauthorized', message }
  if (response.status >= 500 || response.status === 429) return { kind: 'transient', message }
  return { kind: 'rejected', status: response.status, message }
}
