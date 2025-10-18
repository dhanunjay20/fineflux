import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User, Mail, Phone, Calendar, Clock, Edit3, Camera, Lock, Shield,
  Briefcase, MapPin, Users, Building, Eye, EyeOff, Loader2, Save, X, 
  AlertCircle, CheckCircle2, Home, UserCircle
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL || 'https://api.cloudinary.com/v1_1/dosyyvmtb/auto/upload';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PROFILE_UPLOAD_PRESET || 'Profile_Pictures';

type AddressDTO = { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
type ShiftTimingDTO = { start?: string; end?: string };
type EmployeeResponse = {
  id: string; empId: string; organizationId: string; status?: string; role?: string; department?: string;
  firstName?: string; lastName?: string; phoneNumber?: string; emailId?: string; username?: string; gender?: string;
  salary?: number; joinedDate?: string; shiftTiming?: ShiftTimingDTO; address?: AddressDTO;
  emergencyContact?: { name?: string; phone?: string; relationship?: string }; managerName?: string; profileImageUrl?: string;
};
type EmployeeUpdateRequest = {
  empId?: string; organizationId?: string; status?: string; role?: string; department?: string;
  firstName?: string; lastName?: string; phoneNumber?: string; emailId?: string; username?: string; gender?: string;
  salary?: number; shiftTiming?: ShiftTimingDTO; address?: AddressDTO;
  emergencyContact?: { name?: string; phone?: string; relationship?: string }; profileImageUrl?: string;
};

export default function Profile() {
  const orgId = localStorage.getItem('organizationId') || '';
  const empId = localStorage.getItem('empId') || '';
  const { toast } = useToast();

  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [internalId, setInternalId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [form, setForm] = useState<EmployeeUpdateRequest>({
    role: '', department: '', firstName: '', lastName: '', phoneNumber: '', emailId: '', username: '', gender: '',
    salary: undefined, status: 'ACTIVE', shiftTiming: { start: '', end: '' },
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
    emergencyContact: { name: '', phone: '', relationship: '' }, profileImageUrl: '',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const listUrl = `${API_BASE}/api/organizations/${orgId}/employees?page=0&size=200`;
        const listRes = await axios.get(listUrl, { timeout: 15000 });
        const items = Array.isArray(listRes.data?.content) ? listRes.data.content : Array.isArray(listRes.data) ? listRes.data : [];
        const match = items.find((x: any) => x.empId === empId);
        if (!match) throw new Error('Employee not found');
        const id = match.id;
        setInternalId(id);
        const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/employees/${id}`, { timeout: 15000 });
        if (cancelled) return;
        const data: EmployeeResponse = res.data;
        setEmployee(data);
        setForm({
          role: data.role || '', department: data.department || '', firstName: data.firstName || '', lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '', emailId: data.emailId || '', username: data.username || '', gender: data.gender || '',
          salary: data.salary, status: data.status?.toUpperCase() || 'ACTIVE',
          shiftTiming: { start: data.shiftTiming?.start || '', end: data.shiftTiming?.end || '' },
          address: {
            line1: data.address?.line1 || '', line2: data.address?.line2 || '', city: data.address?.city || '',
            state: data.address?.state || '', postalCode: data.address?.postalCode || '', country: data.address?.country || 'India',
          },
          emergencyContact: { name: data.emergencyContact?.name || '', phone: data.emergencyContact?.phone || '', relationship: data.emergencyContact?.relationship || '' },
          profileImageUrl: data.profileImageUrl || '',
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orgId, empId]);

  const fullName = useMemo(() => employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : '', [employee]);
  const getUserInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  
  const handleChange = (field: keyof EmployeeUpdateRequest, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const handleAddress = (k: keyof AddressDTO, v: string) => setForm(prev => ({ ...prev, address: { ...prev.address, [k]: v } }));
  const handleEC = (k: 'name' | 'phone' | 'relationship', v: string) => setForm(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [k]: v } }));
  const handleShift = (k: 'start' | 'end', v: string) => setForm(prev => ({ ...prev, shiftTiming: { ...prev.shiftTiming, [k]: v } }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Invalid file type', variant: 'destructive' }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large (max 5MB)', variant: 'destructive' }); return; }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'Profile_Photos');
      const res = await axios.post(CLOUDINARY_UPLOAD_URL, formData);
      const imageUrl = res.data.secure_url;
      setForm(prev => ({ ...prev, profileImageUrl: imageUrl }));
      await saveProfileImage(imageUrl);
      toast({ title: 'Profile photo updated successfully' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveProfileImage = async (imageUrl: string) => {
    if (!employee || !internalId) return;
    const res = await axios.put(`${API_BASE}/api/organizations/${orgId}/employees/${internalId}`, { 
      empId: employee.empId, organizationId: employee.organizationId, profileImageUrl: imageUrl 
    });
    setEmployee(res.data);
  };

  const handleSave = async () => {
    if (!employee || !internalId) return;
    setSaving(true);
    try {
      const payload = { ...form, empId: employee.empId, organizationId: employee.organizationId };
      const res = await axios.put(`${API_BASE}/api/organizations/${orgId}/employees/${internalId}`, payload);
      setEmployee(res.data);
      setIsEditing(false);
      toast({ title: 'Profile updated successfully' });
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePwdChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd || !newPwd) { toast({ title: 'All fields required', variant: 'destructive' }); return; }
    setSavingPwd(true);
    try {
      await axios.put(`${API_BASE}/api/organizations/${orgId}/employees/${employee?.id}/change-password`, {
        empId: employee?.empId, currentPassword: currentPwd, newPassword: newPwd
      });
      setPwdDialogOpen(false);
      setCurrentPwd(''); setNewPwd('');
      toast({ title: 'Password changed successfully' });
    } catch {
      toast({ title: 'Password change failed', variant: 'destructive' });
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
        <p className="text-lg font-medium text-slate-700">Loading profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full shadow-xl border-red-100">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Unable to Load Profile</h2>
          <p className="text-slate-600">{error}</p>
          <Button onClick={() => location.reload()} className="w-full bg-blue-600 hover:bg-blue-700">
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!employee) return null;

  return (
    <div className="min-h-screen ">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card */}
        <Card className="mb-8 overflow-hidden border-0 shadow-xl bg-white">
          <div className="h-32 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
          <CardContent className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-white shadow-2xl ring-4 ring-blue-100">
                  {employee.profileImageUrl ? (
                    <AvatarImage src={employee.profileImageUrl} alt={fullName} className="object-cover" />
                  ) : (
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                      {getUserInitials(fullName || employee.empId || 'U')}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-white shadow-lg border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-200"
                >
                  {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> : <Camera className="h-5 w-5 text-blue-600" />}
                </Button>
              </div>

              {/* Info */}
              <div className="flex-1 pt-4">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{fullName || 'Employee'}</h1>
                <p className="text-slate-600 mb-3">
                  <span className="font-medium">Employee ID:</span> <span className="text-blue-600 font-semibold">{employee.empId}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200">
                    <Briefcase className="h-3 w-3 mr-1.5" />
                    {employee.role || 'No Role'}
                  </Badge>
                  <Badge className={`px-3 py-1 ${employee.status?.toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-700'}`}>
                    <Shield className="h-3 w-3 mr-1.5" />
                    {employee.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                  <Badge className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200">
                    <Building className="h-3 w-3 mr-1.5" />
                    {employee.department || 'No Department'}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                {!isEditing ? (
                  <>
                    <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button onClick={() => setPwdDialogOpen(true)} variant="outline" className="border-slate-300">
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                    <Button onClick={() => setIsEditing(false)} disabled={saving} variant="outline" className="border-slate-300">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                    <p className="text-sm text-slate-500">Basic profile details</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'First Name', id: 'firstName', value: employee.firstName, formValue: form.firstName, icon: User },
                    { label: 'Last Name', id: 'lastName', value: employee.lastName, formValue: form.lastName, icon: User },
                    { label: 'Username', id: 'username', value: employee.username, disabled: true, icon: UserCircle },
                    { label: 'Gender', id: 'gender', value: employee.gender, formValue: form.gender, type: 'select', options: ['', 'Male', 'Female', 'Other'], icon: User },
                    { label: 'Email Address', id: 'emailId', value: employee.emailId, formValue: form.emailId, icon: Mail },
                    { label: 'Phone Number', id: 'phoneNumber', value: employee.phoneNumber, formValue: form.phoneNumber, icon: Phone },
                  ].map(field => {
                    const Icon = field.icon;
                    return (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-slate-400" />
                          {field.label}
                        </Label>
                        {!isEditing || field.disabled ? (
                          <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium">
                            {field.value || <span className="text-slate-400">Not set</span>}
                          </div>
                        ) : field.type === 'select' ? (
                          <select 
                            className="w-full h-11 px-4 border border-slate-300 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            value={field.formValue || ''} 
                            onChange={e => handleChange(field.id as any, e.target.value)}
                          >
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt || 'Select...'}</option>)}
                          </select>
                        ) : (
                          <Input 
                            value={field.formValue || ''} 
                            onChange={e => handleChange(field.id as any, e.target.value)}
                            className="h-11 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Employment Details */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Employment Details</h2>
                    <p className="text-sm text-slate-500">Work information and schedule</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Role</Label>
                    {!isEditing ? (
                      <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">
                        {employee.role || <span className="text-slate-400">Not set</span>}
                      </div>
                    ) : (
                      <select className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200" value={form.role || ''} onChange={e => handleChange('role', e.target.value)}>
                        <option value="">Select...</option>
                        {['Owner', 'Manager', 'Employee'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Department</Label>
                    {!isEditing ? (
                      <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">
                        {employee.department || <span className="text-slate-400">Not set</span>}
                      </div>
                    ) : (
                      <select className="w-full h-11 px-4 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200" value={form.department || ''} onChange={e => handleChange('department', e.target.value)}>
                        <option value="">Select...</option>
                        {['Management', 'Sales', 'Operations', 'Accounts', 'HR', 'Support'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Joined Date
                    </Label>
                    <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">
                      {formatDate(employee.joinedDate)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      Reporting Manager
                    </Label>
                    <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">
                      {employee.managerName || <span className="text-slate-400">Not assigned</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Monthly Salary</Label>
                    {!isEditing ? (
                      <div className="h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">
                        {employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : <span className="text-slate-400">Not set</span>}
                      </div>
                    ) : (
                      <Input type="number" value={form.salary || ''} onChange={e => handleChange('salary', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-11 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      Shift Timing
                    </Label>
                    <div className="flex gap-2">
                      {['start', 'end'].map(t => (
                        !isEditing ? (
                          <div key={t} className="flex-1 h-11 px-4 flex items-center bg-slate-50 border border-slate-200 rounded-lg font-medium">
                            {(employee.shiftTiming as any)?.[t] || '—'}
                          </div>
                        ) : (
                          <input key={t} type="time" value={(form.shiftTiming as any)?.[t] || ''} onChange={e => handleShift(t as any, e.target.value)} className="flex-1 h-11 px-4 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Address Information</h2>
                    <p className="text-sm text-slate-500">Residential address details</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {!isEditing ? (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200">
                    {employee.address?.line1 ? (
                      <div className="space-y-1 text-slate-700 leading-relaxed">
                        <p className="font-medium">{employee.address.line1}</p>
                        {employee.address.line2 && <p>{employee.address.line2}</p>}
                        <p>{[employee.address.city, employee.address.state, employee.address.postalCode].filter(Boolean).join(', ')}</p>
                        {employee.address.country && <p className="font-semibold mt-2">{employee.address.country}</p>}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-center py-4">No address provided</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Address Line 1', id: 'line1', span: 2 },
                      { label: 'Address Line 2', id: 'line2', span: 2 },
                      { label: 'City', id: 'city' },
                      { label: 'State', id: 'state' },
                      { label: 'Postal Code', id: 'postalCode' },
                      { label: 'Country', id: 'country' },
                    ].map(field => (
                      <div key={field.id} className={`space-y-2 ${field.span === 2 ? 'md:col-span-2' : ''}`}>
                        <Label className="text-sm font-semibold text-slate-700">{field.label}</Label>
                        <Input value={(form.address as any)?.[field.id] || ''} onChange={e => handleAddress(field.id as any, e.target.value)} className="h-11 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Emergency Contact</h2>
                    <p className="text-sm text-slate-500">Person to contact in case of emergency</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {!isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-xl bg-slate-50 border border-slate-200">
                    {[
                      { label: 'Name', value: employee.emergencyContact?.name },
                      { label: 'Phone', value: employee.emergencyContact?.phone },
                      { label: 'Relationship', value: employee.emergencyContact?.relationship },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{item.label}</p>
                        <p className="text-lg font-semibold text-slate-900">{item.value || <span className="text-slate-400">Not set</span>}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['name', 'phone', 'relationship'].map(id => (
                      <div key={id} className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 capitalize">{id}</Label>
                        <Input value={(form.emergencyContact as any)?.[id] || ''} onChange={e => handleEC(id as any, e.target.value)} className="h-11 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="border-0 shadow-lg sticky top-6">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                <h3 className="font-bold text-slate-900">Quick Overview</h3>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {[
                  { label: 'Employee ID', value: employee.empId, icon: User, color: 'blue' },
                  { label: 'Status', value: employee.status?.toUpperCase() || '—', icon: CheckCircle2, color: employee.status?.toLowerCase() === 'active' ? 'emerald' : 'slate' },
                  { label: 'Role', value: employee.role || '—', icon: Briefcase, color: 'purple' },
                  { label: 'Department', value: employee.department || '—', icon: Building, color: 'orange' },
                  { label: 'Salary', value: employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : '—', icon: Calendar, color: 'pink' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={`flex items-center justify-between p-4 rounded-xl bg-${item.color}-50 border border-${item.color}-100 hover:shadow-md transition-all`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg bg-${item.color}-100 flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 text-${item.color}-600`} />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-blue-600" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4 pt-4" onSubmit={handlePwdChange}>
            {[
              { label: 'Current Password', value: currentPwd, setValue: setCurrentPwd, show: showCurrentPwd, setShow: setShowCurrentPwd },
              { label: 'New Password', value: newPwd, setValue: setNewPwd, show: showNewPwd, setShow: setShowNewPwd, minLength: 6 },
            ].map(field => (
              <div key={field.label} className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">{field.label}</Label>
                <div className="relative">
                  <Input
                    type={field.show ? "text" : "password"}
                    value={field.value}
                    onChange={e => field.setValue(e.target.value)}
                    required
                    minLength={field.minLength}
                    className="h-11 pr-12 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <button 
                    type="button" 
                    onClick={() => field.setShow(!field.show)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {field.show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            ))}
            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setPwdDialogOpen(false)} disabled={savingPwd} className="border-slate-300">
                Cancel
              </Button>
              <Button type="submit" disabled={savingPwd} className="bg-blue-600 hover:bg-blue-700">
                {savingPwd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
