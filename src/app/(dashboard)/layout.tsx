import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { ClientErrorBoundary } from '@/components/error-boundary'
import { MobileLayoutWrapper } from '@/components/mobile-layout-wrapper'
import { MobileFloatingActionButton } from '@/components/mobile-floating-action-button'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  // Get the sidebar state from cookies, default to expanded if no cookie exists
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarState === "false" ? false : true

  return (
    <ClientErrorBoundary>
      <SidebarProvider defaultOpen={defaultOpen}>
        {/* Desktop Sidebar */}
        <AppSidebar />
        
        <main className="flex flex-1 flex-col transition-all duration-300 ease-in-out">
          {/* Mobile Header */}
          <header className="flex md:hidden h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          
          {/* Desktop Header */}
          <header className="hidden md:flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          
          {/* Content with normal padding for mobile */}
          <MobileLayoutWrapper className="flex-1 p-4 sm:p-6">
            {children}
          </MobileLayoutWrapper>
        </main>
        
        {/* Mobile Floating Action Button */}
        <MobileFloatingActionButton />
      </SidebarProvider>
    </ClientErrorBoundary>
  )
}
