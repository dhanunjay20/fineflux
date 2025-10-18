import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  ChevronRight,
  Sparkles,
  User,
  Search,
  LogOut,
  UserCircle,
  ChevronDown,
  BarChart3,
  Users,
  Fuel,
  DollarSign,
  UserCheck,
  Settings,
  CreditCard,
  FileText,
  ClipboardList,
  Archive,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMemo, useState, useRef, useEffect } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  if (!user) {
    return null;
  }

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Complete navigation items based on user role
  const allNavItems = useMemo(() => {
    const items = [
      { title: 'Dashboard', href: '/dashboard', Icon: Home, roles: ['owner', 'manager', 'employee'] },
      { title: 'Analytics', href: '/analytics', Icon: BarChart3, roles: ['owner', 'manager'] },
      { title: 'Employees', href: '/employees', Icon: Users, roles: ['owner', 'manager'] },
      { title: 'Set Employee Duty', href: '/employee-set-duty', Icon: ClipboardList, roles: ['owner', 'manager'] },
      { title: 'Tank Inventory', href: '/inventory', Icon: Fuel, roles: ['owner', 'manager'] },
      { title: 'Sales & Collections', href: '/sales', Icon: DollarSign, roles: ['owner', 'manager', 'employee'] },
      { title: 'Products', href: '/products', Icon: Archive, roles: ['owner', 'manager'] },
      { title: 'Borrowers', href: '/borrowers', Icon: CreditCard, roles: ['owner', 'manager'] },
      { title: 'Documents', href: '/documents', Icon: FileText, roles: ['owner', 'manager'] },
      { title: 'Gun Info', href: '/guninfo', Icon: Wrench, roles: ['owner', 'manager'] },
      { title: 'Expenses', href: '/expenses', Icon: DollarSign, roles: ['owner', 'manager'] },
      { title: 'Reports', href: '/reports', Icon: FileText, roles: ['owner', 'manager'] },
      { title: 'Attendance', href: '/attendance', Icon: UserCheck, roles: ['employee'] },
      { title: 'My Duties', href: '/employee-duty-info', Icon: ClipboardList, roles: ['employee'] },
      { title: 'My Profile', href: '/profile', Icon: UserCircle, roles: ['employee', 'manager', 'owner'] },
      { title: 'Settings', href: '/settings', Icon: Settings, roles: ['owner', 'manager'] },
    ];

    // Filter based on user role
    return items.filter(item => item.roles.includes(user.role as any));
  }, [user.role]);

  // Search filtering with better matching
  const filteredResults = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return [];

    return allNavItems.filter(item => 
      item.title.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limit to 8 results
  }, [query, allNavItems]);

  // Show search results when there's a query and results
  useEffect(() => {
    setShowSearchResults(query.trim().length > 0 && filteredResults.length > 0);
  }, [query, filteredResults]);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      return { title, href, isLast: index === segments.length - 1 };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = () => {
    setShowProfileMenu(false);
    logout();
  };

  const handleProfileClick = () => {
    setShowProfileMenu(false);
    navigate('/profile');
  };

  const handleSearchSelect = (href: string) => {
    setQuery('');
    setShowSearchResults(false);
    navigate(href);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <AppSidebar />
        
        <SidebarInset className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* STICKY HEADER */}
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-b border-white/20 dark:border-slate-700/50 shadow-lg shadow-black/5 shrink-0"
          >
            <div className="flex items-center gap-4 h-16 px-6">
              {/* Left Section */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <SidebarTrigger className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all rounded-lg p-2 shrink-0" />
                <Separator orientation="vertical" className="h-6 bg-gradient-to-b from-transparent via-border to-transparent" />

                {/* Breadcrumbs */}
                <Breadcrumb className="flex-1 min-w-0">
                  <BreadcrumbList className="flex items-center gap-2 overflow-x-auto">
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href="/dashboard"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group shrink-0"
                      >
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 group-hover:from-blue-500/20 group-hover:to-indigo-500/20 transition-all">
                          <Home className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">Home</span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.map((crumb, idx) => (
                      <div key={idx} className="flex items-center gap-2 shrink-0">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        <BreadcrumbItem>
                          {crumb.isLast ? (
                            <BreadcrumbPage className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-800/50">
                              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="font-semibold text-foreground whitespace-nowrap">{crumb.title}</span>
                            </BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink
                              href={crumb.href}
                              className="text-muted-foreground hover:text-foreground transition-colors font-medium whitespace-nowrap"
                            >
                              {crumb.title}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-2">
                {/* Search Bar with Results */}
                <div className="relative" ref={searchRef}>
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search pages..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                      if (query.trim() && filteredResults.length > 0) {
                        setShowSearchResults(true);
                      }
                    }}
                    className="pl-9 pr-4 w-64 h-9 bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                  
                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {showSearchResults && filteredResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 w-full top-full mt-2 z-50 rounded-lg bg-white dark:bg-slate-800 border border-border shadow-2xl overflow-hidden"
                      >
                        <div className="py-2">
                          {filteredResults.map((item) => (
                            <button
                              key={item.href}
                              type="button"
                              onClick={() => handleSearchSelect(item.href)}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors group"
                            >
                              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                                <item.Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="text-sm font-medium">{item.title}</span>
                            </button>
                          ))}
                        </div>
                        {query.trim() && filteredResults.length === 0 && (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No pages found for "{query}"
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileMenuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="gap-2 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all rounded-lg px-3"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="hidden xl:flex flex-col items-start">
                      <span className="text-xs font-semibold text-foreground">{user.name || 'User'}</span>
                      <span className="text-xs text-muted-foreground capitalize">{user.role || 'Admin'}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                  </Button>

                  {/* Profile Menu */}
                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-white dark:bg-slate-800 border border-border shadow-2xl overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                          <p className="font-semibold text-sm text-foreground">{user.name || 'User'}</p>
                          <p className="text-xs text-muted-foreground">{user.email || 'user@example.com'}</p>
                          <Badge variant="secondary" className="mt-2 text-xs capitalize">
                            {user.role || 'Admin'}
                          </Badge>
                        </div>
                        <div className="py-2">
                          <button
                            onClick={handleProfileClick}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <UserCircle className="h-4 w-4 text-blue-600" />
                            <span>My Profile</span>
                          </button>
                          <Separator className="my-1" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="container max-w-full p-4 md:p-6 lg:p-8"
            >
              {children}
            </motion.div>
          </main>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-t border-white/20 dark:border-slate-700/50 px-6 py-4 shrink-0"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>© 2025</span>
                <span className="font-semibold text-foreground">FinFlux</span>
                <span className="hidden sm:inline">• All rights reserved</span>
              </div>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                <Separator orientation="vertical" className="h-4" />
                <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                <Separator orientation="vertical" className="h-4" />
                <a href="#" className="hover:text-foreground transition-colors">Support</a>
              </div>
            </div>
          </motion.footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
