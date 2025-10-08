import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Plus,
  Search,
  Edit,
  Eye,
  Phone,
  Mail,
  Calendar,
  Filter,
  X,
  Clock, // added
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// Safe dev fallback for API base
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080';

type Employee = {
  empId: string;
  organizationId: string;
  role: string | unknown;
  department: string | unknown;
  firstName: string;
  lastName: string;
  phoneNumber?: string | unknown;
  emailId: string;
  username: string;
  status?: unknown;
  joinDate?: string | unknown;
  salary?: number | unknown;
  shift?: string | unknown;
  shiftTiming?: { start?: string | unknown; end?: string | unknown };
  address?: {
    line1?: string | unknown;
    line2?: string | unknown;
    city?: string | unknown;
    state?: string | unknown;
    postalCode?: string | unknown;
    country?: string | unknown;
  };
  emergencyContact?: { name?: string | unknown; phone?: string | unknown; relationship?: string | unknown };
};

type EmployeeCreateRequest = {
  empId: string;
  organizationId: string;
  role: string;
  department: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailId: string;
  username: string;
  password: string;
  shiftTiming?: { start?: string; end?: string };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
};

// Indian States + UTs
const IN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Safe normalizers to avoid .toLowerCase on non-strings
const toLowerSafe = (v: unknown): string => {
  if (typeof v === 'string') return v.toLowerCase();
  if (v && typeof v === 'object') {
    const any = v as any;
    const candidate = any.name ?? any.value ?? any.status ?? '';
    return typeof candidate === 'string' ? candidate.toLowerCase() : String(candidate ?? '').toLowerCase();
  }
  return String(v ?? '').toLowerCase();
}; // Ensures comparisons never call .toLowerCase on non-strings [web:380].

const toStringSafe = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const any = v as any;
    return String(any.name ?? any.value ?? any.status ?? '');
  }
  return String(v);
}; // Converts unknown shapes to a usable string for UI joining and display [web:398].

const normalizeStatus = (s: unknown) => toLowerSafe(s); // Single source for status logic across UI [web:398];

// Added: date/time formatters for consistent UI
const formatDate = (iso: unknown) => {
  const s = toStringSafe(iso);
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN'); // locale-friendly date string [web:380]
};
const formatTime = (t: unknown) => {
  const s = toStringSafe(t);
  if (!s) return '';
  // If it's already "HH:mm" or similar, just show it; further parsing can be added if needed.
  return s;
};

export default function Employees() {
  const { toast } = useToast();

  // Org scope
  const [orgId, setOrgId] = useState('');
  useEffect(() => {
    const stored = localStorage.getItem('organizationId') || '';
    setOrgId(stored);
  }, []); // localStorage holds org context for building scoped endpoints [web:398].

  // Fetch employees (robust unwrapping for arrays)
  const fetchEmployees = async (): Promise<Employee[]> => {
    const url = `${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/employees`;
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;
    if (Array.isArray(data)) return data as Employee[];
    const keys = ['data', 'items', 'content', 'results', 'result', 'records', 'rows'];
    for (const k of keys) {
      if (Array.isArray((data as any)?.[k])) return (data as any)[k] as Employee[];
    }
    const firstArray = Object.values(data || {}).find((v) => Array.isArray(v)) as Employee[] | undefined;
    return Array.isArray(firstArray) ? firstArray : [];
  }; // Axios GET + shape unwrapping ensures list rendering across common API formats [web:398].

  const { data: employees = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: fetchEmployees,
    enabled: !!orgId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  }); // useQuery manages server state and reactivity for employees data [web:398].

  // Derived stats (safe status handling)
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => normalizeStatus(e.status) === 'active').length;
    const numericSalary = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
    const avg = total > 0 ? Math.round((employees.reduce((s, e) => s + numericSalary(e.salary), 0) / total) / 1000) : 0;
    return [
      {
        title: 'Total Employees',
        value: total.toString(),
        change: isFetching ? 'Refreshing...' : '+0',
        icon: Users,
        color: 'text-primary',
        bgColor: 'bg-primary-soft',
      },
      {
        title: 'Active',
        value: active.toString(),
        change: 'Currently working',
        icon: Users,
        color: 'text-success',
        bgColor: 'bg-success-soft',
      },
      {
        title: 'Average Salary',
        value: `₹${avg}K`,
        change: 'Per month',
        icon: Users,
        color: 'text-accent',
        bgColor: 'bg-accent-soft',
      },
    ];
  }, [employees, isFetching]); // Stats recompute from live server data using safe coercions [web:398].

  // Utilities
  const getUserInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase(); // Simple initials fallback for avatars in list UI [web:398].

  const getStatusBadge = (status?: unknown) => {
    return normalizeStatus(status) === 'active' ? (
      <Badge className="bg-success-soft text-success">Active</Badge>
    ) : (
      <Badge className="bg-muted text-muted-foreground">Inactive</Badge>
    );
  }; // Uses normalized status to avoid runtime type errors in badges [web:398].

  const getRoleBadge = (role?: unknown) => {
    const roleStr = toStringSafe(role);
    const colors: Record<string, string> = {
      Manager: 'bg-primary-soft text-primary',
      Cashier: 'bg-accent-soft text-accent',
      Attendant: 'bg-success-soft text-success',
      Mechanic: 'bg-warning-soft text-warning',
      Cleaner: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[roleStr] || 'bg-muted text-muted-foreground'}>{roleStr || '—'}</Badge>;
  }; // Ensures role rendering won’t break if role is not a plain string from API [web:398].

  // Search/filter (with safe coercions)
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const fullName = `${toStringSafe(e.firstName)} ${toStringSafe(e.lastName)}`.trim();
      const fields = [
        fullName,
        toStringSafe(e.empId),
        toStringSafe(e.role),
        toStringSafe(e.department),
        toStringSafe(e.emailId),
        toStringSafe(e.phoneNumber),
        toStringSafe(e.username),
        toStringSafe(e.status),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return fields.includes(q);
    });
  }, [employees, search]); // Client-side filter with safe string conversion prevents errors during typing [web:398].

  // Details dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const openView = (e: Employee) => {
    setSelected(e);
    setViewOpen(true);
  }; // Eye button displays full employee profile from current list [web:398].

  // Add employee dialog
  const { toast: notify } = useToast();
  const [open, setOpen] = useState(false);

  // Generate next empId based on orgId letters + 'EMP' + 4-digit counter
  const extractOrgLetters = (org: string) => (org.match(/[A-Za-z]+/g)?.join('') || '').toUpperCase();
  const buildEmpId = (org: string, n: number) => {
    const prefix = extractOrgLetters(org);
    const seq = n.toString().padStart(4, '0');
    return `${prefix}EMP${seq}`;
  }; // Emp ID rule: org letters + EMP + 0001 with +1 per new employee per org [web:398].

  const nextEmpId = useMemo(() => {
    if (!orgId) return '';
    const prefix = extractOrgLetters(orgId) + 'EMP';
    const re = new RegExp(`^${prefix}(\\d{4})$`, 'i');
    let max = 0;
    for (const e of employees) {
      const m = toStringSafe(e.empId).match(re);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!Number.isNaN(num)) max = Math.max(max, num);
      }
    }
    return buildEmpId(orgId, max + 1);
  }, [orgId, employees]); // Computes next available employee id from current org employees [web:398].

  // Create form state
  const [form, setForm] = useState<EmployeeCreateRequest>({
    empId: '',
    organizationId: '',
    role: '',
    department: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    emailId: '',
    username: '',
    password: '',
    shiftTiming: { start: '', end: '' },
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
    emergencyContact: { name: '', phone: '', relationship: '' },
  });

  // Sync ids and generated empId when dialog opens or deps change
  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      ...prev,
      organizationId: orgId || prev.organizationId,
      empId: prev.empId || nextEmpId || '',
      address: { ...(prev.address || {}), country: 'India' },
    }));
  }, [open, orgId, nextEmpId]); // Keeps form ids aligned with org scope and computed emp id [web:398].

  // Submit create
  const [submitting, setSubmitting] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EmployeeCreateRequest = {
      ...form,
      organizationId: orgId || form.organizationId,
      empId: form.empId || nextEmpId,
      address: { ...(form.address || {}), country: 'India' },
    };

    // Basic validations mirroring server constraints
    const required = [
      ['Employee ID', payload.empId],
      ['Organization ID', payload.organizationId],
      ['Role', payload.role],
      ['Department', payload.department],
      ['First name', payload.firstName],
      ['Last name', payload.lastName],
      ['Email', payload.emailId],
      ['Username', payload.username],
      ['Password', payload.password],
    ];
    for (const [label, value] of required) {
      if (!String(value || '').trim()) {
        notify({ title: 'Validation', description: `${label} is required.`, variant: 'destructive' });
        return;
      }
    }

    try {
      setSubmitting(true);
      const url = `${API_BASE}/api/organizations/${encodeURIComponent(payload.organizationId)}/employees`;
      await axios.post(url, payload, { timeout: 15000 });
      notify({ title: 'Employee created', description: `${payload.firstName} ${payload.lastName} added.` });
      setOpen(false);
      setForm((prev) => ({
        ...prev,
        empId: '',
        role: '',
        department: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        emailId: '',
        username: '',
        password: '',
        shiftTiming: { start: '', end: '' },
        address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
        emergencyContact: { name: '', phone: '', relationship: '' },
        organizationId: orgId,
      }));
      await refetch();
    } catch (err: any) {
      notify({
        title: 'Create failed',
        description: err?.response?.data?.message || 'Unable to create employee.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }; // Axios serializes JSON body automatically and TanStack refetch syncs the UI with server [web:398].

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground">Manage team members and their information</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching || !orgId}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button className="btn-gradient-primary" onClick={() => setOpen(true)} disabled={!orgId}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </div>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and Search */}
      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-muted-foreground p-2">Loading employees…</div>}
          {isError && (
            <div className="text-destructive p-2">
              Failed to load employees{error instanceof Error ? `: ${error.message}` : ''}.
            </div>
          )}
          {!isLoading && !isError && (
            <div className="space-y-4">
              {filtered.map((employee) => {
                const fullName =
                  `${toStringSafe(employee.firstName)} ${toStringSafe(employee.lastName)}`.trim() ||
                  toStringSafe(employee.empId);
                const salaryNum =
                  typeof employee.salary === 'number' ? employee.salary : Number(employee.salary) || undefined;
                const start = formatTime(employee.shiftTiming?.start);
                const end = formatTime(employee.shiftTiming?.end);
                return (
                  <div
                    key={toStringSafe(employee.empId)}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {getUserInitials(fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{fullName}</h3>
                          {getRoleBadge(employee.role)}
                          {getStatusBadge(employee.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">ID: {toStringSafe(employee.empId)}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {toStringSafe(employee.emailId)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {toStringSafe(employee.phoneNumber) || '—'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Joined: {formatDate(employee.joinDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Shift: {start && end ? `${start} — ${end}` : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right space-y-1">
                        <p className="font-semibold text-foreground">
                          {salaryNum ? `₹${salaryNum.toLocaleString()}` : '—'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {toStringSafe(employee.shift) || (start && end ? `${start} — ${end}` : '—')}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => openView(employee)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground">No employees match the current filter.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Employee Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogOverlay className="fixed inset-0 z-[90] grid place-items-center bg-background/80 backdrop-blur-sm" />
        <DialogContent
          className="
            fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2
            w-[96vw] sm:w-[80vw] lg:w-[60vw]
            max-w-3xl p-0 sm:rounded-lg shadow-xl
          "
        >


          <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
              <DialogDescription>
                Full profile for {toStringSafe(selected?.firstName)} {toStringSafe(selected?.lastName)}
              </DialogDescription>
            </DialogHeader>

            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Employee ID</p>
                    <p className="font-medium">{toStringSafe(selected.empId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Organization</p>
                    <p className="font-medium">{toStringSafe(selected.organizationId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium">{toStringSafe(selected.role)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{toStringSafe(selected.department)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {toStringSafe(selected.firstName)} {toStringSafe(selected.lastName)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{toStringSafe(selected.emailId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{toStringSafe(selected.phoneNumber) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">{toStringSafe(selected.username)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">{formatDate(selected.joinDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shift</p>
                    <p className="font-medium">
                      {formatTime(selected.shiftTiming?.start) || '—'}
                      {selected.shiftTiming?.start || selected.shiftTiming?.end ? ' — ' : ''}
                      {formatTime(selected.shiftTiming?.end) || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {[
                        toStringSafe(selected.address?.line1),
                        toStringSafe(selected.address?.line2),
                        toStringSafe(selected.address?.city),
                        toStringSafe(selected.address?.state),
                        toStringSafe(selected.address?.postalCode),
                        toStringSafe(selected.address?.country),
                      ]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Emergency Contact</p>
                    <p className="font-medium">
                      {toStringSafe(selected.emergencyContact?.name) || '—'}{' '}
                      {selected.emergencyContact?.phone ? `(${toStringSafe(selected.emergencyContact?.phone)})` : ''}{' '}
                      {selected.emergencyContact?.relationship ? `– ${toStringSafe(selected.emergencyContact?.relationship)}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogOverlay className="fixed inset-0 z-[90] grid place-items-center bg-background/80 backdrop-blur-sm" />
        <DialogContent
          className="
            fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2
            w-[96vw] sm:w-[92vw] md:w-[86vw] lg:w-[70vw] xl:w-[60vw]
            max-w-5xl p-0 sm:rounded-lg shadow-xl
          "
        >

          <div className="max-h-[85vh] overflow-y-auto p-4 sm:p-6 md:p-8">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>Fill in the details to create a new employee.</DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Org / Emp ID (read-only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationId">Organization ID <span className="text-destructive">*</span></Label>
                  <Input id="organizationId" value={orgId} readOnly disabled required aria-required="true" className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empId">Employee ID <span className="text-destructive">*</span></Label>
                  <Input id="empId" value={form.empId || nextEmpId} readOnly disabled required aria-required="true" className="bg-muted/50" />
                </div>
              </div>

              {/* Role / Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role <span className="text-destructive">*</span></Label>
                  <Input id="role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} required aria-required="true" placeholder="e.g., Manager" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
                  <Input id="department" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} required aria-required="true" placeholder="e.g., Operations" />
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                  <Input id="firstName" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required aria-required="true" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                  <Input id="lastName" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required aria-required="true" />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone</Label>
                  <Input id="phoneNumber" value={form.phoneNumber || ''} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} placeholder="+91 90000 00000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailId">Email <span className="text-destructive">*</span></Label>
                  <Input id="emailId" type="email" value={form.emailId} onChange={(e) => setForm((p) => ({ ...p, emailId: e.target.value }))} required aria-required="true" />
                </div>
              </div>

              {/* Auth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                  <Input id="username" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required aria-required="true" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                  <Input id="password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required aria-required="true" />
                </div>
              </div>

              {/* Shift timing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Shift Start</Label>
                  <Input id="start" type="time" value={form.shiftTiming?.start || ''} onChange={(e) => setForm((p) => ({ ...p, shiftTiming: { ...(p.shiftTiming || {}), start: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Shift End</Label>
                  <Input id="end" type="time" value={form.shiftTiming?.end || ''} onChange={(e) => setForm((p) => ({ ...p, shiftTiming: { ...(p.shiftTiming || {}), end: e.target.value } }))} />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label>Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Address Line 1" value={form.address?.line1 || ''} onChange={(e) => setForm((p) => ({ ...p, address: { ...(p.address || {}), line1: e.target.value } }))} />
                  <Input placeholder="Address Line 2" value={form.address?.line2 || ''} onChange={(e) => setForm((p) => ({ ...p, address: { ...(p.address || {}), line2: e.target.value } }))} />
                  <Input placeholder="City" value={form.address?.city || ''} onChange={(e) => setForm((p) => ({ ...p, address: { ...(p.address || {}), city: e.target.value } }))} />
                  <select className="w-full rounded-md border border-border bg-background p-2" value={form.address?.state || ''} onChange={(e) => setForm((p) => ({ ...p, address: { ...(p.address || {}), state: e.target.value } }))}>
                    <option value="">Select State</option>
                    {IN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Input placeholder="Postal Code" value={form.address?.postalCode || ''} onChange={(e) => setForm((p) => ({ ...p, address: { ...(p.address || {}), postalCode: e.target.value } }))} />
                  <Input value={form.address?.country || 'India'} readOnly disabled />
                </div>
              </div>

              {/* Emergency contact */}
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="Name" value={form.emergencyContact?.name || ''} onChange={(e) => setForm((p) => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), name: e.target.value } }))} />
                  <Input placeholder="Phone" value={form.emergencyContact?.phone || ''} onChange={(e) => setForm((p) => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), phone: e.target.value } }))} />
                  <Input placeholder="Relationship" value={form.emergencyContact?.relationship || ''} onChange={(e) => setForm((p) => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), relationship: e.target.value } }))} />
                </div>
              </div>

              {/* Submit */}
              <DialogFooter className="flex items-center justify-between gap-3 pt-2">
                <div className="text-sm text-muted-foreground">Ensure details are correct before saving.</div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={submitting} onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-gradient-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Employee'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
