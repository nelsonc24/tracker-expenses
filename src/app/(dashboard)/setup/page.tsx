export default function SetupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-4">Setting up your account...</h1>
        <p className="text-muted-foreground mb-4">
          We're preparing your dashboard. This will just take a moment.
        </p>
        <p className="text-sm text-muted-foreground">
          If this persists, please refresh the page.
        </p>
      </div>
    </div>
  )
}
