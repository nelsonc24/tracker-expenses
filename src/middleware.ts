import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { hasApiTokenBearer } from '@/lib/api-tokens/bearer'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/accounts(.*)',
  '/transactions(.*)',
  '/budgets(.*)',
  '/rules(.*)',
  '/insights(.*)',
  '/settings(.*)',
])

// Routes that accept a personal API token (Authorization: Bearer trk_...).
// Clerk would otherwise try to read that header as a session JWT. The route itself verifies the token.
const isApiTokenRoute = createRouteMatcher(['/api/ingest'])

// Provider webhooks authenticate with their own signatures, never a Clerk session
const isWebhookRoute = createRouteMatcher(['/api/webhooks/inbound-email(.*)'])

const clerk = clerkMiddleware(async (auth, req) => {
  if (isWebhookRoute(req)) return
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isApiTokenRoute(req) && hasApiTokenBearer(req.headers.get('authorization'))) {
    return NextResponse.next()
  }
  return clerk(req, event)
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
