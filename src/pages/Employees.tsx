import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Plus, Search, Edit, Eye, EyeOff, Phone, Mail, Filter, Camera, Loader2, UserCheck, UserX, Briefcase, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';
const CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL || 'https://api.cloudinary.com/v1_1/dosyyvmtb/auto/upload';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'FineFlux';

export type ShiftTiming = { start?: string; end?: string };
export type Address = {
  line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string;
};
export type EmergencyContact = { name?: string; phone?: string; relationship?: string };

export type Employee = {
  id: string;
  empId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  username: string;
  role: string;
  department: string;
  status: string;
  gender?: string;
  salary?: number;
  joinedDate?: string;
  profileImageUrl?: string;
  shiftTiming?: ShiftTiming;
  address?: Address;
  emergencyContact?: EmergencyContact;
};

type EmployeeFormData = {
  empId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  username: string;
  password: string;
  role: string;
  department: string;
  status: string;
  gender?: string;
  salary?: number;
  profileImageUrl?: string;
  shiftTiming: ShiftTiming;
  address: Address;
  emergencyContact: EmergencyContact;
};

export default function Employees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orgId = typeof window !== 'undefined' ? localStorage.getItem('organizationId') || '' : '';

  if (!orgId) {
    return <div className="p-6 text-center text-muted-foreground">Loading organization context…</div>;
  }

  const [search, setSearch] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState<EmployeeFormData>({
    empId: '',
    organizationId: orgId,
    firstName: '',
    lastName: '',
    emailId: '',
    phoneNumber: '',
    username: '',
    password: '',
    role: 'Employee',
    department: '',
    status: 'ACTIVE',
    gender: '',
    salary: undefined,
    profileImageUrl: '',
    shiftTiming: { start: '', end: '' },
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
    emergencyContact: { name: '', phone: '', relationship: '' },
  });

  useEffect(() => {
    if (viewOpen || editOpen || createOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewOpen, editOpen, createOpen]);

  const { data: employeesRaw = [], isLoading } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/employees?page=0&size=200`);
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.content)) return res.data.content;
      return [];
    },
    enabled: !!orgId,
  });

  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];

  const stats = useMemo(() => ([
    {
      title: 'Total Employees',
      value: employees.length.toString(),
      change: 'All team members',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Active',
      value: employees.filter((e: Employee) => (e.status || '').toLowerCase() === 'active').length.toString(),
      change: 'Currently working',
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Inactive',
      value: employees.filter((e: Employee) => (e.status || '').toLowerCase() === 'inactive').length.toString(),
      change: 'Not currently working',
      icon: UserX,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      title: 'Departments',
      value: new Set(employees.map((e: Employee) => e.department)).size.toString(),
      change: 'Active departments',
      icon: Briefcase,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
  ]), [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e: Employee) => {
      const fullName = `${e.firstName} ${e.lastName}`.trim();
      return [fullName, e.empId, e.emailId, e.phoneNumber, e.role, e.department]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [employees, search]);

  const resetForm = useCallback(() => {
    setForm({
      empId: '',
      organizationId: orgId,
      firstName: '',
      lastName: '',
      emailId: '',
      phoneNumber: '',
      username: '',
      password: '',
      role: 'Employee',
      department: '',
      status: 'ACTIVE',
      gender: '',
      salary: undefined,
      profileImageUrl: '',
      shiftTiming: { start: '', end: '' },
      address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
      emergencyContact: { name: '', phone: '', relationship: '' },
    });
  }, [orgId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Image must be less than 5MB.', variant: 'destructive' });
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'Profile_Photos');

      const res = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = res.data.secure_url;
      setForm(prev => ({ ...prev, profileImageUrl: imageUrl }));
      toast({ title: 'Success', description: 'Profile photo uploaded successfully!', variant: 'default' });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload Failed',
        description: err?.response?.data?.error?.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openView = (emp: Employee) => {
    setCurrentEmp(emp);
    setViewOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setCurrentEmp(emp);
    setForm({
      empId: emp.empId,
      organizationId: emp.organizationId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      emailId: emp.emailId,
      phoneNumber: emp.phoneNumber,
      username: emp.username,
      password: '',
      role: emp.role,
      department: emp.department,
      status: emp.status,
      gender: emp.gender || '',
      salary: emp.salary,
      profileImageUrl: emp.profileImageUrl || '',
      shiftTiming: emp.shiftTiming || { start: '', end: '' },
      address: emp.address || { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
      emergencyContact: emp.emergencyContact || { name: '', phone: '', relationship: '' },
    });
    setEditOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/organizations/${orgId}/employees`, form);
      toast({ title: 'Employee created', description: `${form.firstName} ${form.lastName}` });
      queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
      setCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast({
        title: 'Create failed',
        description: err?.response?.data?.message || 'Could not create employee.',
        variant: 'destructive',
      });
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEmp) return;
    try {
      const payload: any = { ...form };
      if (!form.password || form.password.trim() === '') {
        delete payload.password;
      } else {
        payload.newPassword = form.password;
        delete payload.password;
      }
      await axios.put(`${API_BASE}/api/organizations/${orgId}/employees/${currentEmp.id}`, payload);
      toast({ title: 'Employee updated', description: `${form.firstName} ${form.lastName}` });
      queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
      setEditOpen(false);
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err?.response?.data?.message || 'Could not update employee.',
        variant: 'destructive',
      });
    }
  }

  const getUserInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    const colors: Record<string, string> = {
      active: 'bg-success-soft text-success',
      inactive: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[s] || 'bg-muted'}>{status}</Badge>;
  };

  function formatTime(t?: string) {
    return t || '—';
  }

  return (
    <div className="space-y-6 animate-fade-in -mt-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
        disabled={uploadingImage}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground">Manage your organization's workforce</p>
        </div>
        <Button className="btn-gradient-primary" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                    <div>
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

      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-muted-foreground">Loading employees…</div>}
          {!isLoading && (
            <div className="space-y-4">
              {filtered.map((emp: Employee) => {
                const fullName = `${emp.firstName} ${emp.lastName}`;
                return (
                  <div
                    key={emp.id}
                    className="grid gap-3 sm:grid-cols-[1fr_auto] items-start sm:items-center p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="h-12 w-12 shrink-0">
                        {emp.profileImageUrl ? (
                          <AvatarImage src={emp.profileImageUrl} alt={fullName} />
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                            {getUserInitials(emp.firstName, emp.lastName)}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
                          <Badge className="shrink-0">{emp.role}</Badge>
                          {getStatusBadge(emp.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs">{emp.empId}</span>
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{emp.emailId}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{emp.phoneNumber}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openView(emp)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(emp)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground">No employees found.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIEW DIALOG */}
      {viewOpen && currentEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setViewOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {currentEmp.profileImageUrl ? (
                    <AvatarImage src={currentEmp.profileImageUrl} alt={`${currentEmp.firstName} ${currentEmp.lastName}`} />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials(currentEmp.firstName, currentEmp.lastName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{currentEmp.firstName} {currentEmp.lastName}</h2>
                  <p className="text-sm text-muted-foreground">{currentEmp.role} • {currentEmp.department}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Employee ID</Label>
                  <p className="font-mono font-medium mt-1">{currentEmp.empId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Username</Label>
                  <p className="font-medium mt-1">{currentEmp.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Status</Label>
                  <div className="mt-1">{getStatusBadge(currentEmp.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Gender</Label>
                  <p className="font-medium mt-1">{currentEmp.gender || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Email</Label>
                  <p className="font-medium mt-1 truncate">{currentEmp.emailId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Phone</Label>
                  <p className="font-medium mt-1">{currentEmp.phoneNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Salary</Label>
                  <p className="font-medium mt-1">{currentEmp.salary ? `₹${currentEmp.salary.toLocaleString('en-IN')}` : '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Joined Date</Label>
                  <p className="font-medium mt-1">{currentEmp.joinedDate ? new Date(currentEmp.joinedDate).toLocaleDateString('en-IN') : '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Shift Start</Label>
                  <p className="font-medium mt-1">{formatTime(currentEmp.shiftTiming?.start)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs uppercase">Shift End</Label>
                  <p className="font-medium mt-1">{formatTime(currentEmp.shiftTiming?.end)}</p>
                </div>
              </div>

              {currentEmp.address && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase mb-3 block">Address</Label>
                    <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-1">
                      {currentEmp.address.line1 && <p className="font-medium">{currentEmp.address.line1}</p>}
                      {currentEmp.address.line2 && <p className="font-medium">{currentEmp.address.line2}</p>}
                      {(currentEmp.address.city || currentEmp.address.state || currentEmp.address.postalCode) && (
                        <p className="text-muted-foreground">
                          {[currentEmp.address.city, currentEmp.address.state, currentEmp.address.postalCode]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {currentEmp.address.country && <p className="font-medium">{currentEmp.address.country}</p>}
                    </div>
                  </div>
                </>
              )}

              {currentEmp.emergencyContact && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase mb-3 block">Emergency Contact</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium mt-1">{currentEmp.emergencyContact.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium mt-1">{currentEmp.emergencyContact.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Relationship</p>
                        <p className="font-medium mt-1">{currentEmp.emergencyContact.relationship || '—'}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE DIALOG */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">Create New Employee</h2>
                <p className="text-sm text-muted-foreground">Fill in the details below to add a new team member</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-8">
                {/* Profile Photo */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24 border-4 border-border">
                    {form.profileImageUrl ? (
                      <AvatarImage src={form.profileImageUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {getUserInitials(form.firstName, form.lastName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF • Max 5MB</p>
                  </div>
                </div>

                <Separator />

                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Employee ID *</Label>
                      <Input required value={form.empId} onChange={(e) => setForm({ ...form, empId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Username *</Label>
                      <Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" required value={form.emailId} onChange={(e) => setForm({ ...form, emailId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input required value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Employment Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Employment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Owner">Owner</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <Select value={form.department} onValueChange={(value) => setForm({ ...form, department: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Management">Management</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Accounts">Accounts</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status *</Label>
                      <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Salary</Label>
                      <Input
                        type="number"
                        value={form.salary || ''}
                        onChange={(e) => setForm({ ...form, salary: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Enter salary amount"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Shift Timing */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Shift Timing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Shift Start</Label>
                      <Input
                        type="time"
                        value={form.shiftTiming.start}
                        onChange={(e) => setForm({ ...form, shiftTiming: { ...form.shiftTiming, start: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shift End</Label>
                      <Input
                        type="time"
                        value={form.shiftTiming.end}
                        onChange={(e) => setForm({ ...form, shiftTiming: { ...form.shiftTiming, end: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Address */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Address Line 1</Label>
                      <Input
                        value={form.address.line1}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Address Line 2</Label>
                      <Input
                        value={form.address.line2}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, line2: e.target.value } })}
                        placeholder="Apartment, suite, etc. (optional)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={form.address.city}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={form.address.state}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input
                        value={form.address.postalCode}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, postalCode: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={form.address.country}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input
                        value={form.emergencyContact.name}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input
                        value={form.emergencyContact.phone}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input
                        value={form.emergencyContact.relationship}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient-primary">
                  Create Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DIALOG - Same improved design */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">Edit Employee</h2>
                <p className="text-sm text-muted-foreground">Update employee information</p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-8">
                {/* Profile Photo */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24 border-4 border-border">
                    {form.profileImageUrl ? (
                      <AvatarImage src={form.profileImageUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {getUserInitials(form.firstName, form.lastName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Change Photo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF • Max 5MB</p>
                  </div>
                </div>

                <Separator />

                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Employee ID</Label>
                      <Input disabled value={form.empId} className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input disabled value={form.username} className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" required value={form.emailId} onChange={(e) => setForm({ ...form, emailId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input required value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>New Password (optional)</Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Employment Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Employment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Owner">Owner</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <Select value={form.department} onValueChange={(value) => setForm({ ...form, department: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Management">Management</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Accounts">Accounts</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status *</Label>
                      <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Salary</Label>
                      <Input
                        type="number"
                        value={form.salary || ''}
                        onChange={(e) => setForm({ ...form, salary: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Enter salary amount"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Shift Timing */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Shift Timing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Shift Start</Label>
                      <Input
                        type="time"
                        value={form.shiftTiming.start}
                        onChange={(e) => setForm({ ...form, shiftTiming: { ...form.shiftTiming, start: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shift End</Label>
                      <Input
                        type="time"
                        value={form.shiftTiming.end}
                        onChange={(e) => setForm({ ...form, shiftTiming: { ...form.shiftTiming, end: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Address */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Address Line 1</Label>
                      <Input
                        value={form.address.line1}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Address Line 2</Label>
                      <Input
                        value={form.address.line2}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, line2: e.target.value } })}
                        placeholder="Apartment, suite, etc. (optional)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={form.address.city}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={form.address.state}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input
                        value={form.address.postalCode}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, postalCode: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={form.address.country}
                        onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input
                        value={form.emergencyContact.name}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input
                        value={form.emergencyContact.phone}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input
                        value={form.emergencyContact.relationship}
                        onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient-primary">
                  Update Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
