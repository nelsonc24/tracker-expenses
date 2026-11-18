/**
 * Folder watcher: uploads bank CSV / PDF statements dropped into a folder to
 * POST /api/ingest, then moves them to processed/ or failed/.
 *
 *   pnpm watch-imports
 *
 * Config: env (.env.local / .env) and/or a JSON file. See docs/FOLDER_WATCHER.md.
 * The token is never logged.
 */
import { existsSync, promises as fs, watch, type FSWatcher } from 'node:fs'
import path from 'node:path'
import { config as loadDotenv } from 'dotenv'
import {
  DEFAULT_CONFIG_PATH,
  FAILED_DIR,
  PROCESSED_DIR,
  buildConfig,
  expandHome,
  isCandidateFile,
  matchAccount,
  uniqueDestination,
  uploadFile,
  waitUntilStable,
  type WatcherConfig,
  type WatcherConfigFile,
} from './watch-imports-lib'

const MAX_TRANSIENT_ATTEMPTS = 5

function log(message: string) {
  console.log(`[watch-imports ${new Date().toISOString()}] ${message}`)
}

async function readConfigFile(): Promise<WatcherConfigFile> {
  const explicit = process.env.INGEST_CONFIG
  const configPath = expandHome(explicit || DEFAULT_CONFIG_PATH)
  if (!existsSync(configPath)) {
    if (explicit) throw new Error(`INGEST_CONFIG file not found: ${configPath}`)
    return {}
  }

  const stat = await fs.stat(configPath)
  // The file may hold the token: warn if other users can read it
  if ((stat.mode & 0o077) !== 0) {
    log(`warning: ${configPath} is readable by other users. Run: chmod 600 "${configPath}"`)
  }
  log(`using config file ${configPath}`)
  return JSON.parse(await fs.readFile(configPath, 'utf8')) as WatcherConfigFile
}

class ImportWatcher {
  private queue = new Set<string>()
  private attempts = new Map<string, number>()
  private running = false
  private watcher: FSWatcher | null = null
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly config: WatcherConfig) {}

  async start() {
    const { watchDir } = this.config
    await fs.mkdir(path.join(watchDir, PROCESSED_DIR), { recursive: true })
    await fs.mkdir(path.join(watchDir, FAILED_DIR), { recursive: true })

    log(`watching ${watchDir} → ${new URL(this.config.url).origin}`)

    this.watcher = watch(watchDir, (_event, fileName) => {
      if (fileName) this.enqueue(fileName.toString())
    })
    this.watcher.on('error', error => log(`watch error: ${error.message}`))

    // Files that arrived while we were not running, plus periodic retries
    await this.scan()
    this.timer = setInterval(() => void this.scan(), this.config.pollIntervalMs)
  }

  stop() {
    this.watcher?.close()
    if (this.timer) clearInterval(this.timer)
  }

  private async scan() {
    try {
      for (const entry of await fs.readdir(this.config.watchDir)) this.enqueue(entry)
    } catch (error) {
      log(`scan failed: ${error instanceof Error ? error.message : error}`)
    }
  }

  private enqueue(fileName: string) {
    // fs.watch reports bare names for the top-level folder; ignore our own subfolders and partial downloads
    if (fileName.includes(path.sep) || !isCandidateFile(fileName)) return
    this.queue.add(fileName)
    void this.drain()
  }

  /** Process one file at a time, in arrival order. */
  private async drain() {
    if (this.running) return
    this.running = true
    try {
      while (this.queue.size > 0) {
        const [next] = this.queue
        this.queue.delete(next)
        await this.process(next)
      }
    } finally {
      this.running = false
    }
  }

  private async process(fileName: string) {
    const filePath = path.join(this.config.watchDir, fileName)
    if (!existsSync(filePath)) return

    if (!(await waitUntilStable(filePath, this.config.settleMs))) {
      log(`${fileName}: still changing or gone, will retry on next scan`)
      return
    }

    const match = matchAccount(fileName, this.config.accounts, this.config.defaultAccountId)
    if (!match) {
      log(`${fileName}: no account rule matches this file name`)
      await this.move(filePath, fileName, FAILED_DIR)
      return
    }

    const data = new Uint8Array(await fs.readFile(filePath))
    log(`${fileName}: uploading (${data.byteLength} bytes) to account ${match.accountId} [rule ${match.matchedBy}]`)
    const outcome = await uploadFile(this.config, fileName, data, match)

    switch (outcome.kind) {
      case 'ok': {
        const { inserted, duplicates, needsReview } = outcome.body
        log(`${fileName}: imported ${inserted} new, ${duplicates} duplicates, ${needsReview} need review`)
        this.attempts.delete(fileName)
        await this.move(filePath, fileName, PROCESSED_DIR)
        return
      }
      case 'rejected':
        log(`${fileName}: rejected (${outcome.status}) ${outcome.message}`)
        this.attempts.delete(fileName)
        await this.move(filePath, fileName, FAILED_DIR)
        return
      case 'transient': {
        const attempt = (this.attempts.get(fileName) ?? 0) + 1
        this.attempts.set(fileName, attempt)
        if (attempt >= MAX_TRANSIENT_ATTEMPTS) {
          log(`${fileName}: giving up after ${attempt} attempts: ${outcome.message}`)
          this.attempts.delete(fileName)
          await this.move(filePath, fileName, FAILED_DIR)
        } else {
          log(`${fileName}: temporary failure (${outcome.message}), attempt ${attempt}/${MAX_TRANSIENT_ATTEMPTS}; will retry`)
        }
        return
      }
    }
  }

  private async move(filePath: string, fileName: string, subdir: string) {
    try {
      const destination = await uniqueDestination(path.join(this.config.watchDir, subdir), fileName)
      await fs.rename(filePath, destination)
      log(`${fileName}: moved to ${subdir}/${path.basename(destination)}`)
    } catch (error) {
      log(`${fileName}: could not move to ${subdir}/: ${error instanceof Error ? error.message : error}`)
    }
  }
}

async function main() {
  // Same convention as Next.js: .env.local wins over .env
  loadDotenv({ path: '.env.local', quiet: true })
  loadDotenv({ quiet: true })

  const { config, errors } = buildConfig(process.env, await readConfigFile())
  if (!config) {
    for (const error of errors) console.error(`config error: ${error}`)
    process.exit(1)
  }

  if (!existsSync(config.watchDir)) {
    await fs.mkdir(config.watchDir, { recursive: true })
    log(`created ${config.watchDir}`)
  }

  const watcher = new ImportWatcher(config)
  await watcher.start()

  const shutdown = () => {
    log('stopping')
    watcher.stop()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch(error => {
  console.error(`watch-imports failed: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})
