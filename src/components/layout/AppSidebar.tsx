import { useEffect, useState } from 'react';
import { useLocation, NavLink, matchPath } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Fuel,
  DollarSign,
  UserCheck,
  Settings,
  LogOut,
  Home,
  CreditCard,
  Building2,
  FileText,
  ClipboardList,
  Archive,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: UserRole[];
  badge?: string;
}

const navigationItems: NavItem[] = [
  { title: 'Dashboard', icon: Home, href: '/dashboard', roles: ['owner', 'manager', 'employee'] },
  { title: 'Employee Management', icon: Users, href: '/employees', roles: ['owner', 'manager'] },
  { title: 'Set Employee Duty', icon: ClipboardList, href: '/employee-set-duty', roles: ['owner', 'manager'] },
  { title: 'Tank Inventory', icon: Fuel, href: '/inventory', roles: ['owner', 'manager'] },
  { title: 'Sales & Collections', icon: DollarSign, href: '/sales', roles: ['owner', 'manager'] },
  { title: 'Products', icon: Archive, href: '/products', roles: ['owner', 'manager'] },
  { title: 'Borrowers', icon: CreditCard, href: '/borrowers', roles: ['owner', 'manager'] },
  { title: 'Gun Info', icon: Wrench, href: '/guninfo', roles: ['owner', 'manager'] },
  { title: 'Analytics', icon: BarChart3, href: '/analytics', roles: ['owner', 'manager'] },
  { title: 'Attendance', icon: UserCheck, href: '/attendance', roles: ['employee'] },
  { title: 'My Profile', icon: Users, href: '/profile', roles: ['employee'] },
  { title: 'Reports', icon: FileText, href: '/reports', roles: ['owner', 'manager'] },
  { title: 'Settings', icon: Settings, href: '/settings', roles: ['owner', 'manager'] },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [orgId, setOrgId] = useState<string>('');
  const [empId, setEmpId] = useState<string>('');
  useEffect(() => {
    setOrgId(localStorage.getItem('organizationId') || '');
    setEmpId(localStorage.getItem('empId') || '');
  }, []);

  const filteredItems = navigationItems.filter((item) => user && item.roles.includes(user.role));

  // Support for "active" highlighting on nested routes (e.g. /employees/123)
  const isItemActive = (href: string) =>
    !!matchPath({ path: href, end: false }, location.pathname);

  const getUserInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  const getRoleBadge = (role: UserRole) => {
    const badges = { owner: 'Owner', manager: 'Manager', employee: 'Employee' };
    return badges[role] || role;
  };

  return (
    <Sidebar className="border-r bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="font-bold tracking-tight text-sidebar-foreground">FineFlux</h1>
            <p className="text-xs text-sidebar-foreground/70">Management System</p>
          </div>
        </div>
        <div className="mx-3 h-px bg-border/60" />
      </SidebarHeader>

      <SidebarContent>
        {user && (
          <SidebarGroup>
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/10">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sidebar-foreground truncate">{user.name}</p>
                  {empId && (
                    <span className="ml-2 shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] text-sidebar-foreground/80">
                      {empId}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-xs text-sidebar-foreground/70">{getRoleBadge(user.role)}</p>
                  {orgId && <span className="text-[11px] text-sidebar-foreground/60">• Org: {orgId}</span>}
                </div>
              </div>
            </div>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={[
                        'mx-2 rounded-lg',
                        'hover:bg-muted/60 transition-colors',
                        active ? 'bg-primary/10 text-primary' : '',
                      ].join(' ')}
                    >
                      <NavLink to={item.href} className="flex items-center gap-2 px-2 py-2">
                        <Icon className="h-4 w-4" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto px-1.5 py-0.5 text-xs bg-accent text-accent-foreground rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="mx-3 mb-2 h-px bg-border/60" />
        <Button
          variant="ghost"
          onClick={logout}
          className="mx-2 w-[calc(100%-1rem)] justify-start rounded-lg hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
