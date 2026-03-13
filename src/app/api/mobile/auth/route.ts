import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Mobile Auth validation endpoint
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({ 
      authenticated: true,
      userId 
    })
  } catch (error) {
    console.error('[Mobile Auth Error]:', error)
    return NextResponse.json({ 
      authenticated: false,
      error: 'Authentication failed' 
    }, { status: 401 })
  }
}
