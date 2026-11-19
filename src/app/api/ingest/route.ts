import { auth } from '@clerk/nextjs/server'
import { authenticateBearer } from '@/lib/api-tokens'
import { ingest } from '@/lib/ingest'
import { handleIngestRequest } from '@/lib/ingest/http'

// Upload a statement from a script or the folder watcher.
// Auth: `Authorization: Bearer txk_...` (personal API token) or a Clerk session.
export async function POST(request: Request) {
  return handleIngestRequest(request, {
    ingest,
    resolveUserId: async req => {
      const header = req.headers.get('authorization')
      if (header) {
        // A bearer header that doesn't resolve is a rejection, not a fall-through to the session
        return authenticateBearer(header)
      }
      const { userId } = await auth()
      return userId
    },
  })
}
