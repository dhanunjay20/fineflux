import { useLocation, NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  {
    title: 'Dashboard',
    icon: Home,
    href: '/dashboard',
    roles: ['owner', 'manager', 'employee'],
  },
  {
    title: 'Employee Management',
    icon: Users,
    href: '/employees',
    roles: ['owner', 'manager'],
  },
  {
    title: 'Tank Inventory',
    icon: Fuel,
    href: '/inventory',
    roles: ['owner', 'manager'],
  },
  {
    title: 'Sales & Collections',
    icon: DollarSign,
    href: '/sales',
    roles: ['owner', 'manager'],
  },
  {
    title: 'Borrowers',
    icon: CreditCard,
    href: '/borrowers',
    roles: ['owner', 'manager'],
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    href: '/analytics',
    roles: ['owner', 'manager'],
  },
  {
    title: 'Attendance',
    icon: UserCheck,
    href: '/attendance',
    roles: ['employee'],
  },
  {
    title: 'My Profile',
    icon: Users,
    href: '/profile',
    roles: ['employee'],
  },
  {
    title: 'Reports',
    icon: FileText,
    href: '/reports',
    roles: ['owner', 'manager'],
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/settings',
    roles: ['owner', 'manager'],
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredItems = navigationItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleBadge = (role: UserRole) => {
    const badges = {
      owner: 'Owner',
      manager: 'Manager', 
      employee: 'Employee',
    };
    return badges[role];
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <Building2 className="h-8 w-8 text-primary" />
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="font-bold text-sidebar-foreground">PetrolBunk</h1>
            <p className="text-xs text-sidebar-foreground/70">Management System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* User Info */}
        {user && (
          <SidebarGroup>
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="font-medium text-sidebar-foreground truncate text-sm">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/70">{getRoleBadge(user.role)}</p>
              </div>
            </div>
          </SidebarGroup>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.href}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}