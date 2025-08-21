"use client"

import { UserButton, useUser, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function AuthButton() {
  const { isSignedIn, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <Button disabled size="sm">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  if (isSignedIn) {
    return (
      <UserButton 
        appearance={{
          elements: {
            avatarBox: "h-8 w-8",
            userButtonPopoverCard: "bg-popover border border-border",
            userButtonPopoverActionButton: "text-foreground hover:bg-accent",
          }
        }}
      />
    )
  }

  return (
    <SignInButton mode="modal">
      <Button size="sm">
        Sign In
      </Button>
    </SignInButton>
  )
}
