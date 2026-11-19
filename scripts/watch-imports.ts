/**
 * Watches a folder for bank CSV/PDF exports and uploads each one to /api/ingest.
 *
 *   INGEST_URL=https://your-app.vercel.app/api/ingest INGEST_TOKEN=txk_... \
 *   WATCH_CONFIG=~/.config/tracker-expenses/watch.json pnpm tsx scripts/watch-imports.ts
 *
 * See docs/FOLDER_WATCHER.md for the config file and running it at login with launchd.
 */
import path from 'node:path'
import {
  findReadyFiles,
  loadConfig,
  moveFile,
  resolveAccountId,
  uploadFile,
} from './watch-imports-core'
import { promises as fs } from 'node:fs'

const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`)

async function main() {
  const config = await loadConfig()
  await fs.mkdir(config.watchDir, { recursive: true })
  log(`Watching ${config.watchDir} -> ${config.ingestUrl}`)

  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      for (const file of await findReadyFiles(config.watchDir, config.settleMs)) {
        const name = path.basename(file)
        const accountId = resolveAccountId(name, config.accounts, config.defaultAccountId)
        if (!accountId) {
          await moveFile(file, 'failed', new Date(), 'No account pattern matched this file name and no default account is set.')
          log(`FAILED ${name}: no account matched`)
          continue
        }

        const outcome = await uploadFile(file, accountId, config)
        if (outcome.kind === 'processed') {
          await moveFile(file, 'processed')
          log(`OK ${name}: ${outcome.summary}`)
        } else if (outcome.kind === 'failed') {
          await moveFile(file, 'failed', new Date(), outcome.reason)
          log(`FAILED ${name}: ${outcome.reason}`)
        } else {
          log(`RETRY ${name}: ${outcome.reason} (will try again)`)
        }
      }
    } catch (error) {
      log(`ERROR ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      busy = false
    }
  }

  await tick()
  setInterval(tick, config.pollMs)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
