import { useState } from 'react';
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
  Calendar,
  TrendingUp,
  CreditCard,
  Building2,
  FileText,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    <div
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-sidebar-primary" />
              <div>
                <h1 className="font-bold text-sidebar-foreground">PetrolBunk</h1>
                <p className="text-xs text-sidebar-foreground/70">Management System</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
                {getUserInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-sm text-sidebar-foreground/70">{getRoleBadge(user.role)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md',
                isCollapsed && 'justify-center'
              )}
            >
              <Icon className={cn('h-5 w-5', isCollapsed ? 'h-6 w-6' : '')} />
              {!isCollapsed && (
                <span className="font-medium">{item.title}</span>
              )}
              {!isCollapsed && item.badge && (
                <span className="ml-auto px-2 py-1 text-xs bg-accent text-accent-foreground rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}