import { ingest, IngestError, type IngestResult } from './index'

export const MAX_INGEST_FILE_BYTES = 10 * 1024 * 1024

export interface IngestHttpDeps {
  /** Resolves the caller: bearer token first, then Clerk session. Null = not authenticated. */
  resolveUserId: (request: Request) => Promise<string | null>
  ingest: typeof ingest
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

/** Body of `POST /api/ingest` (multipart: file, accountId, optional bankFormat). */
export async function handleIngestRequest(request: Request, deps: IngestHttpDeps): Promise<Response> {
  const userId = await deps.resolveUserId(request)
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Expected a multipart/form-data body with a file and accountId' }, 400)
  }

  const file = form.get('file')
  const accountId = form.get('accountId')
  const bankFormat = form.get('bankFormat')

  if (!(file instanceof File)) return json({ error: 'No file provided' }, 400)
  if (typeof accountId !== 'string' || !accountId) return json({ error: 'Account ID is required' }, 400)
  if (file.size === 0) return json({ error: 'The file is empty' }, 400)
  if (file.size > MAX_INGEST_FILE_BYTES) return json({ error: 'File is too large (10 MB max)' }, 413)

  try {
    const result: IngestResult = await deps.ingest({
      userId,
      accountId,
      source: 'api',
      fileName: file.name,
      mimeType: file.type || undefined,
      buffer: await file.arrayBuffer(),
      bankFormat: typeof bankFormat === 'string' && bankFormat ? bankFormat : undefined,
    })

    return json({
      success: true,
      sessionId: result.sessionId,
      inserted: result.inserted,
      duplicates: result.duplicates,
      needsReview: result.needsReview,
      errors: result.errors,
    })
  } catch (error) {
    if (error instanceof IngestError) {
      const status =
        error.code === 'invalid_account' ? 403 : error.code === 'parse_failed' ? 422 : 400
      return json({ error: error.message, code: error.code }, status)
    }
    console.error('API ingest error:', error)
    return json({ error: 'Failed to ingest file' }, 500)
  }
}
