import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground mt-2">
            Start tracking your expenses and take control of your finances
          </p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-card border border-border shadow-lg",
            },
            variables: {
              colorPrimary: "hsl(var(--primary))",
              colorBackground: "hsl(var(--background))",
              colorText: "hsl(var(--foreground))",
              colorInputBackground: "hsl(var(--background))",
              colorInputText: "hsl(var(--foreground))",
            }
          }}
        />
      </div>
    </div>
  )
}
