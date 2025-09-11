import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createOrUpdateUser, getCurrentUser } from '@/lib/db-utils'

export default async function SetupPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  // Check if user already exists in database
  let dbUser = await getCurrentUser()
  
  if (!dbUser) {
    try {
      // Create the user in the database
      dbUser = await createOrUpdateUser({
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        imageUrl: user.imageUrl || '',
      })
      
      if (dbUser) {
        // User created successfully, redirect to dashboard
        redirect('/dashboard')
      }
    } catch (error) {
      console.error('Error creating user during setup:', error)
    }
  } else {
    // User already exists, redirect to dashboard
    redirect('/dashboard')
  }

  // If we get here, something went wrong with user creation
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-4">Setting up your account...</h1>
        <p className="text-muted-foreground mb-4">
          We&apos;re preparing your dashboard. This will just take a moment.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          If this persists, there may be a database connection issue.
        </p>
        <a 
          href="/dashboard" 
          className="text-primary hover:underline text-sm"
        >
          Try accessing your dashboard directly
        </a>
      </div>
    </div>
  )
}
