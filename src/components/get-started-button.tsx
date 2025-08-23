"use client"

import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

export function GetStartedButton() {
  const { isSignedIn, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <Button size="lg" className="text-lg px-8" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    )
  }

  return (
    <Link href={isSignedIn ? "/dashboard" : "/sign-in"}>
      <Button size="lg" className="text-lg px-8">
        {isSignedIn ? "Go to Dashboard" : "Get Started"}
      </Button>
    </Link>
  )
}
