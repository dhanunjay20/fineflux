import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  User, Mail, Phone, Calendar, Clock, Edit, Camera, Lock, Bell, Shield,
  Briefcase, Home, UserCircle, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';
  // Replace with your actual API base URL

type AddressDTO = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

type ShiftTimingDTO = {
  start?: string;
  end?: string;
};

type EmployeeResponse = {
  id: string;
  empId: string;
  organizationId: string;
  status?: string;
  role?: string;
  department?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  emailId?: string;
  username?: string;
  gender?: string;
  salary?: number;
  joinedDate?: string;
  shiftTiming?: ShiftTimingDTO;
  address?: AddressDTO;
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
  managerName?: string;
};

type EmployeeUpdateRequest = {
  empId?: string;
  organizationId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  role?: string;
  department?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  emailId?: string;
  username?: string;
  gender?: string;
  salary?: number;
  newPassword?: string;
  shiftTiming?: ShiftTimingDTO;
  address?: AddressDTO;
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
};

export default function Profile() {
  const orgId = localStorage.getItem('organizationId') || '';
  const empId = localStorage.getItem('empId') || '';

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [internalId, setInternalId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Change password dialog state
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [form, setForm] = useState<EmployeeUpdateRequest>({
    role: '',
    department: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    emailId: '',
    username: '',
    gender: '',
    salary: undefined,
    status: 'ACTIVE',
    shiftTiming: { start: '', end: '' },
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
    emergencyContact: { name: '', phone: '', relationship: '' },
  });

  const { toast } = useToast();

  const fullName = useMemo(
    () => (employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : ''),
    [employee]
  );

  const getUserInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const s = status.toLowerCase();
    const colors: Record<string, string> = {
      active: 'bg-success-soft text-success',
      inactive: 'bg-muted text-muted-foreground',
      present: 'bg-success-soft text-success',
      late: 'bg-warning-soft text-warning',
      absent: 'bg-destructive-soft text-destructive',
    };
    return <Badge className={colors[s] || 'bg-muted text-muted-foreground'}>{status.toUpperCase()}</Badge>;
  };

  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orgId || !empId) {
        setError('Missing organization or employee id');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const listUrl = `${API_BASE}/api/organizations/${orgId}/employees?page=0&size=200`;
        const listRes = await axios.get(listUrl, { timeout: 15000 });
        const items = Array.isArray(listRes.data?.content)
          ? listRes.data.content
          : Array.isArray(listRes.data)
            ? listRes.data
            : [];
        const match = items.find((x: any) => x.empId === empId);
        if (!match) throw new Error('No employee found for your empId under this organization.');
        const id = match.id;
        setInternalId(id);

        const getUrl = `${API_BASE}/api/organizations/${orgId}/employees/${id}`;
        const res = await axios.get(getUrl, { timeout: 15000 });
        if (cancelled) return;
        const data: EmployeeResponse = res.data;
        setEmployee(data);

        setForm({
          role: data.role || '',
          department: data.department || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '',
          emailId: data.emailId || '',
          username: data.username || '',
          gender: data.gender || '',
          salary: data.salary,
          status: (data.status?.toUpperCase() as any) || 'ACTIVE',
          shiftTiming: {
            start: data.shiftTiming?.start || '',
            end: data.shiftTiming?.end || '',
          },
          address: {
            line1: data.address?.line1 || '',
            line2: data.address?.line2 || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            postalCode: data.address?.postalCode || '',
            country: data.address?.country || 'India',
          },
          emergencyContact: {
            name: data.emergencyContact?.name || '',
            phone: data.emergencyContact?.phone || '',
            relationship: data.emergencyContact?.relationship || '',
          },
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, empId]);

  const onEditToggle = () => setIsEditing(v => !v);

  const handleChange = (field: keyof EmployeeUpdateRequest, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddress = (k: keyof AddressDTO, v: string) => {
    setForm(prev => ({ ...prev, address: { ...(prev.address || {}), [k]: v } }));
  };

  const handleEC = (k: 'name' | 'phone' | 'relationship', v: string) => {
    setForm(prev => ({ ...prev, emergencyContact: { ...(prev.emergencyContact || {}), [k]: v } }));
  };

  const handleShift = (k: 'start' | 'end', v: string) => {
    setForm(prev => ({ ...prev, shiftTiming: { ...(prev.shiftTiming || {}), [k]: v } }));
  };

  const handleSave = async () => {
    if (!employee || !internalId) return;
    setSaving(true);
    setError(null);
    try {
      const payload: EmployeeUpdateRequest = {
        empId: employee.empId,
        organizationId: employee.organizationId,
        status: form.status,
        role: form.role,
        department: form.department,
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        emailId: form.emailId,
        username: form.username,
        gender: form.gender,
        salary: form.salary,
        shiftTiming: {
          start: form.shiftTiming?.start || '',
          end: form.shiftTiming?.end || '',
        },
        address: form.address,
        emergencyContact: form.emergencyContact,
      };

      const url = `${API_BASE}/api/organizations/${orgId}/employees/${internalId}`;
      const res = await axios.put(url, payload, { timeout: 15000 });
      setEmployee(res.data);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  async function handlePwdChange(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPwd.trim() || !newPwd.trim()) {
      toast({ title: "Validation", description: "Both fields are required!", variant: "destructive" });
      return;
    }
    setSavingPwd(true);
    try {
      await axios.put(
        `${API_BASE}/api/organizations/${orgId}/employees/${employee?.id}/change-password`,
        {
          empId: employee?.empId,
          currentPassword: currentPwd,
          newPassword: newPwd
        }
      );
      setPwdDialogOpen(false);
      setCurrentPwd('');
      setNewPwd('');
      toast({ title: "Password Changed", description: "Your password was updated successfully.", variant: "default" });
    } catch (err: any) {
      toast({ title: "Change Failed", description: err?.response?.data?.message || "Unable to update password.", variant: "destructive" });
    } finally {
      setSavingPwd(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile…</div>;
  }
  if (error) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => location.reload()}>Retry</Button>
      </div>
    );
  }
  if (!employee) {
    return <div className="p-8 text-center text-muted-foreground">Profile not found.</div>;
  }

  function displayTime(val?: string) {
    if (!val) return 'Not Set';
    return val.length === 5 ? val : 'Not Set';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">View and manage your personal information</p>
        </div>
        {!isEditing ? (
          <Button className="btn-gradient-primary" onClick={onEditToggle}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEditToggle} disabled={saving}>
              Cancel
            </Button>
            <Button className="btn-gradient-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Card */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture & Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-muted/30 rounded-lg">
              <Avatar className="h-24 w-24 ring-4 ring-background">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {getUserInitials(fullName || employee.empId || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {fullName || 'Not Set'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Employee ID: {employee.empId}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary-soft text-primary">
                    {employee.role || 'No Role'}
                  </Badge>
                  {getStatusBadge(employee.status)}
                  <Badge variant="outline" className="text-muted-foreground">
                    {employee.department || 'No Department'}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled className="shrink-0">
                <Camera className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
            </div>

            <Separator />

            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-foreground">Basic Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  {!isEditing ? (
                    <Input id="firstName" value={employee.firstName || '—'} disabled />
                  ) : (
                    <Input
                      id="firstName"
                      value={form.firstName || ''}
                      onChange={e => handleChange('firstName', e.target.value)}
                      placeholder="Enter first name"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  {!isEditing ? (
                    <Input id="lastName" value={employee.lastName || '—'} disabled />
                  ) : (
                    <Input
                      id="lastName"
                      value={form.lastName || ''}
                      onChange={e => handleChange('lastName', e.target.value)}
                      placeholder="Enter last name"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={employee.username || '—'} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Account Status</Label>
                  {!isEditing ? (
                    <Input id="status" value={employee.status || 'ACTIVE'} disabled />
                  ) : (
                    <select
                      id="status"
                      className="w-full p-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                      value={form.status || 'ACTIVE'}
                      onChange={e => handleChange('status', e.target.value)}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  {!isEditing ? (
                    <Input id="gender" value={employee.gender || '—'} disabled />
                  ) : (
                    <select
                      id="gender"
                      className="w-full p-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                      value={form.gender || ''}
                      onChange={e => handleChange('gender', e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary">Salary</Label>
                  {!isEditing ? (
                    <Input
                      id="salary"
                      value={employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : '—'}
                      disabled
                    />
                  ) : (
                    <Input
                      id="salary"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.salary || ''}
                      onChange={e => handleChange('salary', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="₹"
                    />
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-foreground">Contact Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  {!isEditing ? (
                    <Input id="email" value={employee.emailId || '—'} disabled />
                  ) : (
                    <Input
                      id="email"
                      type="email"
                      value={form.emailId || ''}
                      onChange={e => handleChange('emailId', e.target.value)}
                      placeholder="email@example.com"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  {!isEditing ? (
                    <Input id="phone" value={employee.phoneNumber || '—'} disabled />
                  ) : (
                    <Input
                      id="phone"
                      value={form.phoneNumber || ''}
                      onChange={e => handleChange('phoneNumber', e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                    />
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Employment Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-foreground">Employment Details</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  {!isEditing ? (
                    <Input id="role" value={employee.role || '—'} disabled />
                  ) : (
                    <select
                      id="role"
                      className="w-full p-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                      value={form.role || ''}
                      onChange={e => handleChange('role', e.target.value)}
                    >
                      <option value="">Select Role</option>
                      <option value="Owner">Owner</option>
                      <option value="Manager">Manager</option>
                      <option value="Employee">Employee</option>
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  {!isEditing ? (
                    <Input id="department" value={employee.department || '—'} disabled />
                  ) : (
                    <select
                      id="department"
                      className="w-full p-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                      value={form.department || ''}
                      onChange={e => handleChange('department', e.target.value)}
                    >
                      <option value="">Select Department</option>
                      <option value="Management">Management</option>
                      <option value="Sales">Sales</option>
                      <option value="Operations">Operations</option>
                      <option value="Accounts">Accounts</option>
                      <option value="HR">HR</option>
                      <option value="Support">Support</option>
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="join-date">Joined Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="join-date"
                      value={formatDate(employee.joinedDate)}
                      disabled
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Manager</Label>
                  <Input value={employee.managerName || 'Not Assigned'} disabled />
                </div>
              </div>
            </div>

            <Separator />

            {/* Shift Timing Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-foreground">Shift Timing</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shiftStart">Shift Start Time</Label>
                  {!isEditing ? (
                    <Input
                      id="shiftStart"
                      value={displayTime(employee.shiftTiming?.start)}
                      disabled
                    />
                  ) : (
                    <input
                      id="shiftStart"
                      type="time"
                      value={form.shiftTiming?.start || ''}
                      onChange={e => handleShift('start', e.target.value)}
                      className="w-full p-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shiftEnd">Shift End Time</Label>
                  {!isEditing ? (
                    <Input
                      id="shiftEnd"
                      value={displayTime(employee.shiftTiming?.end)}
                      disabled
                    />
                  ) : (
                    <input
                      id="shiftEnd"
                      type="time"
                      value={form.shiftTiming?.end || ''}
                      onChange={e => handleShift('end', e.target.value)}
                      className="w-full p-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Address Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Home className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-foreground">Address Information</h4>
              </div>
              {!isEditing ? (
                <div className="space-y-2">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-foreground">
                      {employee.address?.line1 && <span className="block">{employee.address.line1}</span>}
                      {employee.address?.line2 && <span className="block">{employee.address.line2}</span>}
                      {(employee.address?.city || employee.address?.state || employee.address?.postalCode) && (
                        <span className="block">
                          {[employee.address?.city, employee.address?.state, employee.address?.postalCode]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      )}
                      {employee.address?.country && <span className="block font-medium">{employee.address.country}</span>}
                      {!employee.address?.line1 && !employee.address?.city && (
                        <span className="text-muted-foreground">No address provided</span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="line1">Address Line 1</Label>
                    <Input
                      id="line1"
                      placeholder="Street address, P.O. box"
                      value={form.address?.line1 || ''}
                      onChange={e => handleAddress('line1', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                    <Input
                      id="line2"
                      placeholder="Apartment, suite, unit, building, floor"
                      value={form.address?.line2 || ''}
                      onChange={e => handleAddress('line2', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Enter city"
                      value={form.address?.city || ''}
                      onChange={e => handleAddress('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province</Label>
                    <Input
                      id="state"
                      placeholder="Enter state"
                      value={form.address?.state || ''}
                      onChange={e => handleAddress('state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      placeholder="Enter postal code"
                      value={form.address?.postalCode || ''}
                      onChange={e => handleAddress('postalCode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="Enter country"
                      value={form.address?.country || 'India'}
                      onChange={e => handleAddress('country', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Emergency Contact Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-foreground">Emergency Contact</h4>
              </div>
              {!isEditing ? (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Name</p>
                      <p className="text-sm font-medium text-foreground">
                        {employee.emergencyContact?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Phone</p>
                      <p className="text-sm font-medium text-foreground">
                        {employee.emergencyContact?.phone || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Relationship</p>
                      <p className="text-sm font-medium text-foreground">
                        {employee.emergencyContact?.relationship || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ec-name">Contact Name</Label>
                    <Input
                      id="ec-name"
                      placeholder="Full name"
                      value={form.emergencyContact?.name || ''}
                      onChange={e => handleEC('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ec-phone">Contact Phone</Label>
                    <Input
                      id="ec-phone"
                      placeholder="+91 XXXXX XXXXX"
                      value={form.emergencyContact?.phone || ''}
                      onChange={e => handleEC('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ec-relationship">Relationship</Label>
                    <Input
                      id="ec-relationship"
                      placeholder="e.g., Spouse, Parent"
                      value={form.emergencyContact?.relationship || ''}
                      onChange={e => handleEC('relationship', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar - Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Quick Stats Card */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Quick Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  {getStatusBadge(employee.status)}
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Employee ID</span>
                  <span className="font-semibold text-foreground">{employee.empId}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Department</span>
                  <span className="font-semibold text-foreground">{employee.department || '—'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Role</span>
                  <span className="font-semibold text-foreground">{employee.role || '—'}</span>
                </div>
                {employee.salary && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Salary</span>
                    <span className="font-semibold text-foreground">₹{employee.salary.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Reporting Structure</h4>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Reports To</span>
                  <span className="font-semibold text-foreground">{employee.managerName || 'Not Assigned'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setPwdDialogOpen(true)}
                disabled={savingPwd}
              >
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Shield className="mr-2 h-4 w-4" />
                Enable 2FA
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and new password.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePwdChange}>
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  name="current-password"
                  type={showCurrentPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrentPwd(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2"
                  aria-label={showCurrentPwd ? "Hide password" : "Show password"}
                >
                  {showCurrentPwd ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  name="new-password"
                  type={showNewPwd ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNewPwd(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2"
                  aria-label={showNewPwd ? "Hide password" : "Show password"}
                >
                  {showNewPwd ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setPwdDialogOpen(false)}
                disabled={savingPwd}
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-gradient-primary" disabled={savingPwd}>
                {savingPwd ? "Saving..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
}
