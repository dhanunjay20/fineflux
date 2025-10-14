import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      {/* Prevent horizontal overflow on small screens */}
      <div className="min-h-screen bg-gradient-surface flex w-full overflow-x-hidden">
        <AppSidebar />
        {/* Allow this flex child to shrink to avoid overflow */}
        <SidebarInset className="flex-1 min-w-0">
          <header className="w-full flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            {/* Avoid negative margin on mobile */}
            <SidebarTrigger className="ml-0 md:-ml-1" />
            <div className="flex items-center gap-2 px-4">
              <h1 className="text-lg font-semibold text-foreground">
                {user.role === 'owner'
                  ? 'Owner'
                  : user.role === 'manager'
                  ? 'Manager'
                  : 'Employee'} Dashboard
              </h1>
            </div>
          </header>
          {/* Ensure main can shrink and not force overflow */}
          <main className="flex-1 overflow-auto min-w-0">
            {/* Prevent children from exceeding width */}
            <div className="p-4 md:p-6 max-w-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
