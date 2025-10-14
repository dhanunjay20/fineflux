import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, Plus, Search, Edit, Eye, Phone, Mail, Calendar, Filter, Clock,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogOverlay,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export type ShiftTiming = { start?: string; end?: string };
export type Address = {
  line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string;
};
export type EmergencyContact = { name?: string; phone?: string; relationship?: string };

export type Employee = {
  id: string;
  empId: string;
  organizationId: string;
  role: string;
  department: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailId: string;
  username: string;
  status: string;
  joinedDate?: string;
  shiftTiming?: ShiftTiming;
  address?: Address;
  emergencyContact?: EmergencyContact;
};

export type EmployeeCreateRequest = Omit<Employee, "id" | "status" | "joinedDate"> & {
  password: string;
};
export type EmployeeUpdateRequest = Partial<Omit<Employee, "id" | "joinedDate">> & {
  newPassword?: string;
};

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'https://fineflux-spring.onrender.com';

const IN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Employee ID helpers
function extractOrgLetters(org: string) {
  return (org.match(/[A-Za-z]+/g)?.join('') || '').toUpperCase();
}
function buildEmpId(org: string, n: number) {
  const prefix = extractOrgLetters(org);
  const seq = n.toString().padStart(4, '0');
  return `${prefix}EMP${seq}`;
}
function getNextEmpId(orgId: string, employees: Employee[]) {
  const prefix = extractOrgLetters(orgId) + 'EMP';
  const re = new RegExp(`^${prefix}(\\d{4})$`, 'i');
  let max = 0;
  for (const e of employees) {
    const m = typeof e.empId === "string" && e.empId.match(re);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!Number.isNaN(num)) max = Math.max(max, num);
    }
  }
  return buildEmpId(orgId, max + 1);
}

const normalizeStatus = (s: string | undefined) => (s ? s.toLowerCase() : '');
const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '—');
const formatTime = (t?: string) => t || '';

export default function Employees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ---- Organization ID (robust, up-to-date) ----
  const orgId = typeof window !== "undefined"
    ? localStorage.getItem('organizationId') || ''
    : '';

  if (!orgId) {
    return <div className="p-10 text-center text-muted-foreground">Loading organization…</div>;
  }

  // Backend fetch (paging: .content)
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/employees`, { timeout: 15000 });
      // Support both array or { content: [...] }
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.content)) return res.data.content;
      return [];
    },
    enabled: !!orgId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const employees: Employee[] = Array.isArray(data) ? data : [];
  const nextEmpId = useMemo(() => getNextEmpId(orgId, employees), [orgId, employees]);

  // Stats panel
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => normalizeStatus(e.status) === 'active').length;
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
      }
    ];
  }, [employees, isFetching]);

  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const fullName = `${e.firstName} ${e.lastName}`.trim();
      const fields = [
        fullName, e.empId, e.role, e.department, e.emailId, e.phoneNumber, e.username, e.status
      ].filter(Boolean).join(' ').toLowerCase();
      return fields.includes(q);
    });
  }, [employees, search]);

  /*** VIEW & EDIT DIALOGS ***/
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);

  // ----------------- CREATE EMPLOYEE -----------------
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      ...prev,
      organizationId: orgId || prev.organizationId,
      empId: nextEmpId,
      address: { ...(prev.address || {}), country: 'India' },
    }));
  }, [open, orgId, nextEmpId]);

  // CREATE submit
  const [submitting, setSubmitting] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EmployeeCreateRequest = {
      ...form,
      organizationId: orgId || form.organizationId,
      empId: nextEmpId, // FORCE new next empId before POST
      address: { ...(form.address || {}), country: 'India' },
    };
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
        toast({ title: 'Validation', description: `${label} is required.`, variant: 'destructive' });
        return;
      }
    }
    try {
      setSubmitting(true);
      await axios.post(`${API_BASE}/api/organizations/${payload.organizationId}/employees`, payload, { timeout: 15000 });
      toast({ title: 'Employee created', description: `${payload.firstName} ${payload.lastName} added.` });
      setOpen(false);
      setForm(() => ({
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
      }));
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
    } catch (err: any) {
      toast({ title: 'Create failed', description: err?.response?.data?.message || 'Unable to create employee.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  /*** Edit state ***/
  const [editForm, setEditForm] = useState<EmployeeUpdateRequest | null>(null);
  const [updating, setUpdating] = useState(false);
  const onEdit = (emp: Employee) => {
    setSelected(emp);
    setEditForm({
      empId: emp.empId,
      organizationId: emp.organizationId,
      status: emp.status,
      role: emp.role,
      department: emp.department,
      firstName: emp.firstName,
      lastName: emp.lastName,
      phoneNumber: emp.phoneNumber,
      emailId: emp.emailId,
      username: emp.username,
      newPassword: '',
      shiftTiming: emp.shiftTiming,
      address: emp.address,
      emergencyContact: emp.emergencyContact,
    });
    setEditOpen(true);
  };
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      setUpdating(true);
      await axios.put(`${API_BASE}/api/organizations/${orgId}/employees/${selected.id}`, editForm, { timeout: 15000 });
      toast({ title: 'Employee updated', description: `${editForm?.firstName} ${editForm?.lastName}` });
      setEditOpen(false);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.response?.data?.message || 'Unable to update employee.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const getUserInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase();
  const getStatusBadge = (status?: string) =>
    normalizeStatus(status) === 'active'
      ? <Badge className="bg-success-soft text-success">Active</Badge>
      : <Badge className="bg-muted text-muted-foreground">Inactive</Badge>;
  // Replace your current getRoleBadge with this version
  const getRoleBadge = (role?: string) => {
    const key = String(role || '').trim().toLowerCase();

    // Core role palettes (capsule look)
    const ROLE_STYLES: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
      manager: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
      employee: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
    };

    // Map similar roles to a core category (optional)
    const ALIASES: Record<string, string> = {
      // treat these as "employee"-type
      attendant: 'employee',
      cashier: 'employee',
      mechanic: 'employee',
      cleaner: 'employee',
      staff: 'employee',
    };

    const resolved = ROLE_STYLES[key] || ROLE_STYLES[ALIASES[key] || ''] || 'bg-muted text-muted-foreground ring-1 ring-border/40';

    // Pretty label
    const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : '—';

    return (
      <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${resolved}`}>
        {label}
      </Badge>
    );
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header: mobile-safe stacked, no overlap */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
            Employee Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage team members and their information
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching || !orgId}
            className="w-full sm:w-auto"
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            className="btn-gradient-primary w-full sm:w-auto"
            onClick={() => setOpen(true)}
            disabled={!orgId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
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

      {/* Search bar: stack on mobile to avoid squeeze */}
      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline" className="w-full sm:w-auto">
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
                const fullName = `${employee.firstName} ${employee.lastName}`.trim() || employee.empId;
                const start = formatTime(employee.shiftTiming?.start);
                const end = formatTime(employee.shiftTiming?.end);
                return (
                  <div
                    key={employee.empId}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {getUserInitials(fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
                          {getRoleBadge(employee.role)}
                          {getStatusBadge(employee.status)}
                        </div>
                        <p className="text-sm text-muted-foreground break-all">ID: {employee.empId}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{employee.emailId}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {employee.phoneNumber || '—'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Joined: {formatDate(employee.joinedDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Shift: {start && end ? `${start} — ${end}` : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelected(employee); setViewOpen(true); }}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(employee)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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
                Full profile for {selected?.firstName} {selected?.lastName}
              </DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Employee ID</p>
                    <p className="font-medium">{selected.empId}</p></div>
                  <div><p className="text-sm text-muted-foreground">Organization</p>
                    <p className="font-medium">{selected.organizationId}</p></div>
                  <div><p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium">{selected.role}</p></div>
                  <div><p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{selected.department}</p></div>
                  <div><p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {selected.firstName} {selected.lastName}
                    </p></div>
                  <div><p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium break-all">{selected.emailId}</p></div>
                  <div><p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selected.phoneNumber || '—'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium break-all">{selected.username}</p></div>
                  <div><p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">{formatDate(selected.joinedDate)}</p></div>
                  <div><p className="text-sm text-muted-foreground">Shift</p>
                    <p className="font-medium">
                      {formatTime(selected.shiftTiming?.start) || '—'}
                      {selected.shiftTiming?.start || selected.shiftTiming?.end ? ' — ' : ''}
                      {formatTime(selected.shiftTiming?.end) || ''}
                    </p></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {[
                        selected.address?.line1,
                        selected.address?.line2,
                        selected.address?.city,
                        selected.address?.state,
                        selected.address?.postalCode,
                        selected.address?.country,
                      ].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                  <div><p className="text-sm text-muted-foreground">Emergency Contact</p>
                    <p className="font-medium">
                      {selected.emergencyContact?.name || '—'}
                      {selected.emergencyContact?.phone ? ` (${selected.emergencyContact?.phone})` : ''}
                      {selected.emergencyContact?.relationship ? ` – ${selected.emergencyContact?.relationship}` : ''}
                    </p></div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>Edit and save changes for this employee.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empId">Employee ID</Label>
                  <Input id="empId" value={editForm?.empId || ''} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationId">Organization ID</Label>
                  <Input id="organizationId" value={editForm?.organizationId || ''} readOnly disabled />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={editForm?.role || ''} onChange={e => setEditForm(f => ({ ...f!, role: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={editForm?.department || ''} onChange={e => setEditForm(f => ({ ...f!, department: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={editForm?.firstName || ''} onChange={e => setEditForm(f => ({ ...f!, firstName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={editForm?.lastName || ''} onChange={e => setEditForm(f => ({ ...f!, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone</Label>
                  <Input id="phoneNumber" value={editForm?.phoneNumber || ''} onChange={e => setEditForm(f => ({ ...f!, phoneNumber: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" className="w-full rounded-md border p-2" value={editForm?.status || ""} onChange={e => setEditForm(f => ({ ...f!, status: e.target.value }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password (leave blank to keep)</Label>
                  <Input id="newPassword" type="password" value={editForm?.newPassword || ''} onChange={e => setEditForm(f => ({ ...f!, newPassword: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailId">Email (read only)</Label>
                  <Input id="emailId" value={editForm?.emailId || ''} readOnly disabled />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Shift Start</Label>
                  <Input id="start" type="time" value={editForm?.shiftTiming?.start || ''} onChange={e => setEditForm(f => ({
                    ...f!,
                    shiftTiming: { ...(f?.shiftTiming || {}), start: e.target.value }
                  }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Shift End</Label>
                  <Input id="end" type="time" value={editForm?.shiftTiming?.end || ''} onChange={e => setEditForm(f => ({
                    ...f!,
                    shiftTiming: { ...(f?.shiftTiming || {}), end: e.target.value }
                  }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Address Line 1" value={editForm?.address?.line1 || ''} onChange={e => setEditForm(f => ({ ...f!, address: { ...(f?.address || {}), line1: e.target.value } }))} />
                  <Input placeholder="Address Line 2" value={editForm?.address?.line2 || ''} onChange={e => setEditForm(f => ({ ...f!, address: { ...(f?.address || {}), line2: e.target.value } }))} />
                  <Input placeholder="City" value={editForm?.address?.city || ''} onChange={e => setEditForm(f => ({ ...f!, address: { ...(f?.address || {}), city: e.target.value } }))} />
                  <select className="w-full rounded-md border border-border bg-background p-2" value={editForm?.address?.state || ''} onChange={e => setEditForm(f => ({ ...f!, address: { ...(f?.address || {}), state: e.target.value } }))}>
                    <option value="">Select State</option>
                    {IN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Input placeholder="Postal Code" value={editForm?.address?.postalCode || ''} onChange={e => setEditForm(f => ({ ...f!, address: { ...(f?.address || {}), postalCode: e.target.value } }))} />
                  <Input value={editForm?.address?.country || 'India'} readOnly disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="Name" value={editForm?.emergencyContact?.name || ''} onChange={e => setEditForm(f => ({ ...f!, emergencyContact: { ...(f?.emergencyContact || {}), name: e.target.value } }))} />
                  <Input placeholder="Phone" value={editForm?.emergencyContact?.phone || ''} onChange={e => setEditForm(f => ({ ...f!, emergencyContact: { ...(f?.emergencyContact || {}), phone: e.target.value } }))} />
                  <Input placeholder="Relationship" value={editForm?.emergencyContact?.relationship || ''} onChange={e => setEditForm(f => ({ ...f!, emergencyContact: { ...(f?.emergencyContact || {}), relationship: e.target.value } }))} />
                </div>
              </div>
              <DialogFooter className="flex items-center justify-between gap-3 pt-2">
                <div className="text-sm text-muted-foreground">Edit only the necessary details and save.</div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={updating} onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-gradient-primary" disabled={updating}>
                    {updating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
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
              {/* Organization ID and Employee ID (read-only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationId">Organization ID <span className="text-destructive">*</span></Label>
                  <Input id="organizationId" value={orgId} readOnly disabled required aria-required="true" className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empId">Employee ID <span className="text-destructive">*</span></Label>
                  <Input id="empId" value={nextEmpId} readOnly disabled required aria-required="true" className="bg-muted/50" />
                </div>
              </div>

              {/* Role and Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role <span className="text-destructive">*</span></Label>
                  <Input id="role" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} required aria-required="true" placeholder="e.g., Manager" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
                  <Input id="department" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} required aria-required="true" placeholder="e.g., Operations" />
                </div>
              </div>

              {/* First Name and Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                  <Input id="firstName" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required aria-required="true" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                  <Input id="lastName" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required aria-required="true" />
                </div>
              </div>

              {/* Phone and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone</Label>
                  <Input id="phoneNumber" value={form.phoneNumber || ''} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="+91 90000 00000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailId">Email <span className="text-destructive">*</span></Label>
                  <Input id="emailId" type="email" value={form.emailId} onChange={e => setForm(p => ({ ...p, emailId: e.target.value }))} required aria-required="true" />
                </div>
              </div>

              {/* Username and Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                  <Input id="username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required aria-required="true" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                  <Input id="password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required aria-required="true" />
                </div>
              </div>

              {/* Shift Timing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Shift Start</Label>
                  <Input id="start" type="time" value={form.shiftTiming?.start || ''} onChange={e => setForm(p => ({ ...p, shiftTiming: { ...(p.shiftTiming || {}), start: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Shift End</Label>
                  <Input id="end" type="time" value={form.shiftTiming?.end || ''} onChange={e => setForm(p => ({ ...p, shiftTiming: { ...(p.shiftTiming || {}), end: e.target.value } }))} />
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-2">
                <Label>Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Address Line 1" value={form.address?.line1 || ''} onChange={e => setForm(p => ({ ...p, address: { ...(p.address || {}), line1: e.target.value } }))} />
                  <Input placeholder="Address Line 2" value={form.address?.line2 || ''} onChange={e => setForm(p => ({ ...p, address: { ...(p.address || {}), line2: e.target.value } }))} />
                  <Input placeholder="City" value={form.address?.city || ''} onChange={e => setForm(p => ({ ...p, address: { ...(p.address || {}), city: e.target.value } }))} />
                  <select className="w-full rounded-md border border-border bg-background p-2" value={form.address?.state || ''} onChange={e => setForm(p => ({ ...p, address: { ...(p.address || {}), state: e.target.value } }))}>
                    <option value="">Select State</option>
                    {IN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Input placeholder="Postal Code" value={form.address?.postalCode || ''} onChange={e => setForm(p => ({ ...p, address: { ...(p.address || {}), postalCode: e.target.value } }))} />
                  <Input value={form.address?.country || 'India'} readOnly disabled />
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="Name" value={form.emergencyContact?.name || ''} onChange={e => setForm(p => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), name: e.target.value } }))} />
                  <Input placeholder="Phone" value={form.emergencyContact?.phone || ''} onChange={e => setForm(p => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), phone: e.target.value } }))} />
                  <Input placeholder="Relationship" value={form.emergencyContact?.relationship || ''} onChange={e => setForm(p => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), relationship: e.target.value } }))} />
                </div>
              </div>

              {/* Submit Buttons */}
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
