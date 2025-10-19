import { useEffect, useState } from 'react';
import { useLocation, NavLink, matchPath } from 'react-router-dom';
import {
  BarChart3, Users, Fuel, DollarSign, UserCheck, Settings, LogOut,
  Home, CreditCard, FileText, ClipboardList, Archive, Wrench, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: UserRole[];
  badge?: string;
}

export const navigationItems: NavItem[] = [
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
    'profileImageUrl',
    'imageUrl',
    'avatarUrl',
    'photoUrl',
    'profilePic',
    'picture',
    'profile_image_url',
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

  useEffect(() => {
    setOrgId(localStorage.getItem('organizationId') || '');
    setEmpId(localStorage.getItem('empId') || '');
  }, []);

  // Fetch employee image (prefer AuthContext, else API)
  useEffect(() => {
    let mounted = true;

    const setFromUser = () => {
      const fromUser = pickEmployeeImage(user || {});
      if (fromUser && mounted) setAvatarUrl(fromUser);
    };

    const fetchFromApi = async () => {
      if (!orgId || !empId) return;
      try {
        // Try direct employee-by-id route first (if supported)
        const one = await axios.get(`${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/employees/${encodeURIComponent(empId)}`, { timeout: 15000 });
        const img = pickEmployeeImage(one.data || {});
        if (img && mounted) {
          setAvatarUrl(img);
          return;
        }
      } catch {
        // Fallback to list and filter by empId
      }
      try {
        const list = await axios.get(`${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/employees`, { timeout: 15000 });
        const arr = Array.isArray(list.data) ? list.data : Array.isArray(list.data?.content) ? list.data.content : [];
        const found = arr.find((e: any) => String(e.empId || '').trim() === String(empId).trim());
        const img2 = pickEmployeeImage(found || {});
        if (img2 && mounted) setAvatarUrl(img2);
      } catch {
        // ignore
      }
    };

    // Prefer auth user image if present
    setFromUser();
    if (!avatarUrl) fetchFromApi();

    return () => {
      mounted = false;
    };
  }, [orgId, empId, user]);

  const filteredItems = navigationItems.filter((item) => user && item.roles.includes(user.role));
  const isItemActive = (href: string) => !!matchPath({ path: href, end: false }, location.pathname);
  const getUserInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const handleNavClick = () => {
    if (isMobile) setOpenMobile?.(false);
  };

  const handleLogout = () => {
    logout();
    if (isMobile) setOpenMobile?.(false);
  };

  return (
    <Sidebar className="border-r bg-gradient-to-b from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Header */}
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
        {/* User Card */}
        {user && (
          <div className="mb-4 mx-1 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 shadow-sm relative">
            <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-green-400 shadow-sm" title="Online" />
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-background shadow-md">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={user.name || user.username || 'User'}
                    onError={() => setAvatarUrl('')}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm">
                  {getUserInitials(user.name || user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-bold truncate text-foreground">{user.name || user.username}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-2 py-0.5 font-bold capitalize border-0 hover:bg-blue-100 dark:hover:bg-blue-950">
                    {user.role}
                  </Badge>
                  {empId && <span className="text-[10px] text-muted-foreground">• {empId}</span>}
                </div>
                {orgId && (
                  <p className="text-[10px] text-muted-foreground font-medium mt-1">Org: {orgId}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
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
                      className={`rounded-lg transition-all ${
                        active
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

      {/* Footer */}
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
