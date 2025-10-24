import { useEffect, useState } from 'react';
import { useLocation, NavLink, matchPath } from 'react-router-dom';
import { BarChart3, Users, Fuel, DollarSign, UserCheck, Settings, LogOut, Home, CreditCard, FileText, ClipboardList, Archive, Wrench, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';

// PRODUCTION: MOVE navigationItems TO src/constants/sidebarNavigation.ts FOR VITE HMR SAFETY
const PROFILE_URL_KEY = 'profileImageUrl';

const navigationItems: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: UserRole[];
  badge?: string;
}[] = [
  { title: 'Dashboard', icon: Home, href: '/dashboard', roles: ['owner', 'manager', 'employee'] },
  { title: 'Analytics', icon: BarChart3, href: '/analytics', roles: ['owner', 'manager'], badge: 'New' },
  { title: 'Employees', icon: Users, href: '/employees', roles: ['owner', 'manager'] },
  { title: 'Set Duty', icon: ClipboardList, href: '/employee-set-duty', roles: ['owner', 'manager'] },
  { title: 'Tank Inventory', icon: Fuel, href: '/inventory', roles: ['owner', 'manager'] },
  { title: 'Sales & Collections', icon: DollarSign, href: '/sales', roles: ['owner', 'manager', 'employee'] },
  { title: 'Products', icon: Archive, href: '/products', roles: ['owner', 'manager'] },
  { title: 'Borrowers', icon: CreditCard, href: '/borrowers', roles: ['owner', 'manager'] },
  { title: 'Documents', icon: FileText, href: '/documents', roles: ['owner', 'manager'] },
  { title: 'Gun Info', icon: Wrench, href: '/guninfo', roles: ['owner', 'manager'] },
  { title: 'Expenses', icon: DollarSign, href: '/expenses', roles: ['owner', 'manager'] },
  { title: 'Reports', icon: FileText, href: '/reports', roles: ['owner', 'manager'] },
  { title: 'Attendance', icon: UserCheck, href: '/attendance', roles: ['employee'] },
  { title: 'Special Duties', icon: Sparkles, href: '/special-duties', roles: ['employee'] },
  { title: 'Pump Duty', icon: BarChart3, href: '/daily-duties', roles: ['employee'] },
  { title: 'My Profile', icon: Users, href: '/profile', roles: ['employee', 'manager', 'owner'] },
  { title: 'Settings', icon: Settings, href: '/settings', roles: ['owner', 'manager'] },
];

const pickEmployeeImage = (obj: any): string => {
  const keys = [
    'profileImageUrl', 'imageUrl', 'avatarUrl', 'photoUrl', 'profilePic', 'picture', 'profile_image_url'
  ];
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [orgId, setOrgId] = useState<string>('');
  const [empId, setEmpId] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Load orgId/empId from localStorage once
  useEffect(() => {
    setOrgId(localStorage.getItem('organizationId') || '');
    setEmpId(localStorage.getItem('empId') || '');
  }, []);

  // Always get avatar from localStorage profile key, reactively across tabs
  useEffect(() => {
    setAvatarUrl(localStorage.getItem(PROFILE_URL_KEY) || '');
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILE_URL_KEY) {
        setAvatarUrl(e.newValue || '');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const filteredItems = navigationItems.filter((item) => user && item.roles.includes(user.role));
  const isItemActive = (href: string) => !!matchPath({ path: href, end: false }, location.pathname);
  const getUserInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const handleNavClick = () => {
    if (isMobile) setOpenMobile?.(false);
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem(PROFILE_URL_KEY);
    if (isMobile) setOpenMobile?.(false);
  };

  return (
    <Sidebar className="border-r bg-gradient-to-b from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <SidebarHeader className="border-b px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              FinFlux
            </h1>
            <p className="text-xs text-muted-foreground font-semibold">Fuel Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        {user && (
          <div className="mb-7">
            <div className="relative rounded-3xl border border-blue-200/70 dark:border-blue-900/70 bg-gradient-to-br from-blue-50/95 via-white/90 to-indigo-100/80 dark:from-slate-900/95 dark:to-blue-950/90 shadow-lg px-3 py-6 flex flex-col items-center max-w-full overflow-visible">
              <span className="absolute right-5 top-5 h-3 w-3 rounded-full bg-green-400 border-2 border-white dark:border-slate-900 animate-pulse shadow" title="Online"></span>
              <div className="relative mb-1">
                <Avatar className="h-16 w-16 ring-2 ring-primary shadow-lg">
                  {avatarUrl ? (
                    <AvatarImage
                      src={avatarUrl}
                      alt={user.name || user.username || 'User'}
                      onError={() => setAvatarUrl('')}
                    />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xl">
                    {getUserInitials(user.name || user.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-tr from-primary to-blue-600 text-white text-xs px-3 py-1 rounded-xl font-semibold shadow-md border border-white dark:border-blue-950">
                  {user.role}
                </span>
              </div>
              <span className="mt-3 text-lg sm:text-xl font-extrabold text-blue-900 dark:text-blue-100 truncate max-w-full text-center">
                {user.name || user.username}
              </span>
              {empId && (
                <span className="mt-1 px-2 py-px rounded-full font-mono bg-blue-200/60 dark:bg-blue-900/50 text-xs text-blue-800 dark:text-blue-100 border border-blue-300/50 dark:border-blue-900/50 shadow-sm">
                  {empId}
                </span>
              )}
              {orgId && (
                <span className="mt-2 text-xs font-medium text-blue-700/80 dark:text-blue-200/80 truncate w-full text-center">
                  <span className="opacity-80">Org:</span> <span className="font-semibold">{orgId}</span>
                </span>
              )}
            </div>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={`rounded-lg transition-all ${active
                        ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold shadow-sm border border-blue-200 dark:border-blue-800'
                        : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-slate-800/50 hover:text-foreground font-medium'
                        }`}
                    >
                      <NavLink
                        to={item.href}
                        className="flex items-center gap-3 px-3 py-2.5"
                        onClick={handleNavClick}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden text-sm flex-1">
                          {item.title}
                        </span>
                        {item.badge && (
                          <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0 font-bold group-data-[collapsible=icon]:hidden hover:bg-emerald-500 shadow-sm">
                            {item.badge}
                          </Badge>
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
      <SidebarFooter className="border-t p-3 shadow-sm">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
