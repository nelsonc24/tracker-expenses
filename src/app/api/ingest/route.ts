import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { bankFormats } from '@/lib/csv-processing'
import { drizzleStore, ingest, IngestError } from '@/lib/ingest'
import { apiTokenLookup } from '@/lib/api-tokens/store'
import { authenticateBearer, hasApiTokenBearer } from '@/lib/api-tokens/tokens'

/**
 * POST /api/ingest — upload one bank CSV or PDF statement and import it.
 *
 * Auth: `Authorization: Bearer trk_...` (personal API token, see Settings → Data)
 *       or a normal Clerk session.
 * Body (multipart/form-data): `file`, `accountId`, optional `bankFormat` (CSV only; default auto-detect).
 *
 * Used by scripts/watch-imports.ts. Calls ingest() with source 'api'.
 */

export const runtime = 'nodejs'
// AI PDF fallback can take a while
export const maxDuration = 60

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
// multipart overhead allowance for the early Content-Length check
const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024
const ALLOWED_EXTENSIONS = new Set(['csv', 'pdf'])
const MAX_FILE_NAME_LENGTH = 255

function error(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status })
}

async function resolveUserId(request: NextRequest): Promise<string | NextResponse> {
  const authorization = request.headers.get('authorization')

  // Personal API token. Never fall back to Clerk when a trk_ token was presented but is bad.
  if (hasApiTokenBearer(authorization)) {
    const result = await authenticateBearer(authorization, apiTokenLookup)
    if (!result.ok) return error(result.reason === 'revoked' ? 'Token has been revoked' : 'Invalid token', 401)
    return result.userId
  }

  const { userId } = await auth()
  return userId ?? error('Unauthorized', 401)
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

/** Keep only the base name; it ends up in import_sessions.file_name. */
function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'upload'
  return base.slice(0, MAX_FILE_NAME_LENGTH)
}

export async function POST(request: NextRequest) {
  try {
    const userIdOrResponse = await resolveUserId(request)
    if (userIdOrResponse instanceof NextResponse) return userIdOrResponse
    const userId = userIdOrResponse

    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BODY_BYTES) return error('File is larger than 10 MB', 413)

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return error('Expected multipart/form-data with a "file" field', 400)
    }

    const file = form.get('file')
    if (!(file instanceof File)) return error('No file provided', 400)

    const fileName = safeFileName(file.name)
    const extension = extensionOf(fileName)
    if (!ALLOWED_EXTENSIONS.has(extension)) return error('Only .csv and .pdf files are accepted', 400)
    if (file.size === 0) return error('File is empty', 400)
    if (file.size > MAX_FILE_BYTES) return error('File is larger than 10 MB', 413)

    const accountId = form.get('accountId')
    if (typeof accountId !== 'string' || !accountId) return error('accountId is required', 400)
    if (!z.uuid().safeParse(accountId).success) return error('accountId is not valid', 400)

    const bankFormatField = form.get('bankFormat')
    let bankFormat: string | undefined
    if (typeof bankFormatField === 'string' && bankFormatField.trim()) {
      bankFormat = bankFormatField.trim()
      if (bankFormat !== 'auto' && !Object.hasOwn(bankFormats, bankFormat)) {
        return error(`Unknown bankFormat. Use one of: auto, ${Object.keys(bankFormats).join(', ')}`, 400)
      }
    }

    if (!(await drizzleStore.accountBelongsToUser(userId, accountId))) {
      return error('Invalid account or account does not belong to user', 403)
    }

    const buffer = await file.arrayBuffer()
    if (extension === 'pdf' && new TextDecoder().decode(buffer.slice(0, 5)) !== '%PDF-') {
      return error('File is not a valid PDF', 400)
    }

    const result = await ingest({
      userId,
      accountId,
      source: 'api',
      fileName,
      mimeType: file.type || undefined,
      buffer,
      bankFormat,
    })

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      inserted: result.inserted,
      duplicates: result.duplicates,
      needsReview: result.needsReview,
      totalProcessed: result.totalProcessed,
      errors: result.errors,
    })
  } catch (err) {
    if (err instanceof IngestError) {
      switch (err.code) {
        case 'invalid_account':
          return error(err.message, 403)
        case 'parse_failed':
          return NextResponse.json({ success: false, error: 'Failed to parse file', details: err.message }, { status: 422 })
        default:
          return error(err.message, 400)
      }
    }
    console.error('Ingest API error:', err instanceof Error ? err.message : err)
    return error('Failed to import file', 500)
  }
}
