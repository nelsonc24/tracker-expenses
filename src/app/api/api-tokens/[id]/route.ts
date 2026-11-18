import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { revokeToken } from '@/lib/api-tokens/store'

// DELETE /api/api-tokens/[id] — revoke a token (soft: sets revoked_at, the row is kept)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const revoked = await revokeToken(userId, id)
    if (!revoked) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to revoke api token:', error)
    return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 })
  }
}
