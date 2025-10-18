import { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User, Mail, Phone, Calendar, Clock, Edit, Camera, Lock, Shield,
  Briefcase, Home, AlertCircle, Eye, EyeOff, Loader2, Save, X, MapPin, Users, Building, Sparkles, Star
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";


const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL || 'https://api.cloudinary.com/v1_1/dosyyvmtb/auto/upload';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_PROFILE_UPLOAD_PRESET || 'Profile_Pictures';


type AddressDTO = { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string; };
type ShiftTimingDTO = { start?: string; end?: string; };
type EmployeeResponse = {
  id: string; empId: string; organizationId: string; status?: string; role?: string; department?: string;
  firstName?: string; lastName?: string; phoneNumber?: string; emailId?: string; username?: string; gender?: string;
  salary?: number; joinedDate?: string; shiftTiming?: ShiftTimingDTO; address?: AddressDTO;
  emergencyContact?: { name?: string; phone?: string; relationship?: string }; managerName?: string; profileImageUrl?: string;
};
type EmployeeUpdateRequest = {
  empId?: string; organizationId?: string; status?: 'ACTIVE' | 'INACTIVE' | string; role?: string; department?: string;
  firstName?: string; lastName?: string; phoneNumber?: string; emailId?: string; username?: string; gender?: string;
  salary?: number; newPassword?: string; shiftTiming?: ShiftTimingDTO; address?: AddressDTO;
  emergencyContact?: { name?: string; phone?: string; relationship?: string }; profileImageUrl?: string;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [form, setForm] = useState<EmployeeUpdateRequest>({
    role: '', department: '', firstName: '', lastName: '', phoneNumber: '', emailId: '', username: '', gender: '',
    salary: undefined, status: 'ACTIVE', shiftTiming: { start: '', end: '' },
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
    emergencyContact: { name: '', phone: '', relationship: '' }, profileImageUrl: '',
  });
  const { toast } = useToast();


  useEffect(() => { setMounted(true); }, []);


  const fullName = useMemo(() => (employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : ''), [employee]);
  const getUserInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();
  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '');


  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orgId || !empId) { setError('Missing organization or employee id'); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const listUrl = `${API_BASE}/api/organizations/${orgId}/employees?page=0&size=200`;
        const listRes = await axios.get(listUrl, { timeout: 15000 });
        const items = Array.isArray(listRes.data?.content) ? listRes.data.content : Array.isArray(listRes.data) ? listRes.data : [];
        const match = items.find((x: any) => x.empId === empId);
        if (!match) throw new Error('No employee found');
        const id = match.id;
        setInternalId(id);
        const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/employees/${id}`, { timeout: 15000 });
        if (cancelled) return;
        const data: EmployeeResponse = res.data;
        setEmployee(data);
        setForm({
          role: data.role || '', department: data.department || '', firstName: data.firstName || '', lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '', emailId: data.emailId || '', username: data.username || '', gender: data.gender || '',
          salary: data.salary, status: (data.status?.toUpperCase() as any) || 'ACTIVE',
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


  const handleChange = (field: keyof EmployeeUpdateRequest, value: any) => { setForm(prev => ({ ...prev, [field]: value })); };
  const handleAddress = (k: keyof AddressDTO, v: string) => { setForm(prev => ({ ...prev, address: { ...(prev.address || {}), [k]: v } })); };
  const handleEC = (k: 'name' | 'phone' | 'relationship', v: string) => { setForm(prev => ({ ...prev, emergencyContact: { ...(prev.emergencyContact || {}), [k]: v } })); };
  const handleShift = (k: 'start' | 'end', v: string) => { setForm(prev => ({ ...prev, shiftTiming: { ...(prev.shiftTiming || {}), [k]: v } })); };


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Invalid File', variant: 'destructive' }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File Too Large', variant: 'destructive' }); return; }
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
      toast({ title: 'Success', description: 'Photo uploaded!' });
    } catch (err: any) {
      toast({ title: 'Upload Failed', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const saveProfileImage = async (imageUrl: string) => {
    if (!employee || !internalId) return;
    const url = `${API_BASE}/api/organizations/${orgId}/employees/${internalId}`;
    const res = await axios.put(url, { empId: employee.empId, organizationId: employee.organizationId, profileImageUrl: imageUrl });
    setEmployee(res.data);
  };


  const handleSave = async () => {
    if (!employee || !internalId) return;
    setSaving(true);
    try {
      const payload: EmployeeUpdateRequest = {
        empId: employee.empId, organizationId: employee.organizationId, status: form.status, role: form.role, department: form.department,
        firstName: form.firstName, lastName: form.lastName, phoneNumber: form.phoneNumber, emailId: form.emailId, username: form.username,
        gender: form.gender, salary: form.salary, shiftTiming: form.shiftTiming, address: form.address, emergencyContact: form.emergencyContact, profileImageUrl: form.profileImageUrl,
      };
      const url = `${API_BASE}/api/organizations/${orgId}/employees/${internalId}`;
      const res = await axios.put(url, payload);
      setEmployee(res.data);
      setIsEditing(false);
      toast({ title: 'Success', description: 'Profile updated!' });
    } catch (e: any) {
      toast({ title: 'Update Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };


  async function handlePwdChange(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPwd.trim() || !newPwd.trim()) { toast({ title: "Validation", description: "Both fields required!", variant: "destructive" }); return; }
    setSavingPwd(true);
    try {
      await axios.put(`${API_BASE}/api/organizations/${orgId}/employees/${employee?.id}/change-password`, {
        empId: employee?.empId, currentPassword: currentPwd, newPassword: newPwd
      });
      setPwdDialogOpen(false);
      setCurrentPwd(''); setNewPwd('');
      toast({ title: "Success", description: "Password changed!" });
    } catch (err: any) {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setSavingPwd(false);
    }
  }


  // Helper function to get stat card styles
  const getStatCardStyles = (label: string) => {
    const styleMap: Record<string, { bgClass: string; iconBg: string; iconColor: string }> = {
      'Employee ID': { bgClass: 'bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-300', iconBg: 'bg-purple-500', iconColor: 'text-white' },
      'Status': { bgClass: 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-300', iconBg: 'bg-green-500', iconColor: 'text-white' },
      'Role': { bgClass: 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-300', iconBg: 'bg-blue-500', iconColor: 'text-white' },
      'Department': { bgClass: 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-300', iconBg: 'bg-orange-500', iconColor: 'text-white' },
      'Salary': { bgClass: 'bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-950/30 dark:to-pink-900/30 border-pink-300', iconBg: 'bg-pink-500', iconColor: 'text-white' },
    };
    return styleMap[label] || { bgClass: 'bg-gray-100', iconBg: 'bg-gray-500', iconColor: 'text-white' };
  };


  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
        <div className="relative">
          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-white"></div>
          <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-white animate-pulse" />
        </div>
        <p className="mt-6 text-2xl font-bold text-white animate-pulse">Loading Your Profile...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-rose-400 to-red-600 p-4">
        <Card className="max-w-md border-none shadow-2xl">
          <CardContent className="p-10 text-center space-y-4">
            <AlertCircle className="h-20 w-20 text-red-600 mx-auto animate-bounce" />
            <h2 className="text-2xl font-bold">Error</h2>
            <p className="text-red-600 font-semibold">{error}</p>
            <Button onClick={() => location.reload()} size="lg" className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!employee) return null;


  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-purple-950 dark:to-pink-950 transition-all duration-700 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .dark .glass-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>


      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* STUNNING HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-1 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 opacity-50 blur-3xl animate-pulse"></div>
          <div className="relative glass-card rounded-3xl p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Avatar with Glow */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full blur-lg group-hover:blur-xl transition-all opacity-75 animate-pulse"></div>
                <Avatar className="relative h-32 w-32 border-4 border-white dark:border-slate-900 shadow-2xl ring-4 ring-purple-400/50 transition-transform hover:scale-110 duration-300">
                  {employee.profileImageUrl ? (
                    <AvatarImage src={employee.profileImageUrl} alt={fullName} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-4xl font-black">
                      {getUserInitials(fullName || employee.empId || 'U')}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute -bottom-2 -right-2 rounded-full h-12 w-12 p-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg border-4 border-white dark:border-slate-900"
                >
                  {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
                </Button>
              </div>


              {/* Info Section */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 animate-pulse" />
                  <h1 className="text-4xl font-black bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                    {fullName || 'Not Set'}
                  </h1>
                  <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 animate-pulse" />
                </div>
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Employee ID: <span className="text-purple-600 dark:text-purple-400">{employee.empId}</span></p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-1 text-sm font-bold shadow-lg">
                    <Briefcase className="h-3 w-3 mr-1 text-white" />
                    {employee.role || 'No Role'}
                  </Badge>
                  <Badge className={`px-4 py-1 text-sm font-bold shadow-lg ${employee.status?.toLowerCase() === 'active' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gray-500 text-white'}`}>
                    <Shield className="h-3 w-3 mr-1 text-white" />
                    {employee.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                  <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-1 text-sm font-bold shadow-lg">
                    <Building className="h-3 w-3 mr-1 text-white" />
                    {employee.department || 'No Department'}
                  </Badge>
                </div>
              </div>


              {/* Action Buttons - FIXED HOVER STATES */}
              <div className="flex flex-col gap-3">
                {!isEditing ? (
                  <>
                    <Button 
                      onClick={() => setIsEditing(true)}
                      size="lg"
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all font-bold"
                    >
                      <Edit className="mr-2 h-5 w-5 text-white" />
                      <span className="text-white">Edit Profile</span>
                    </Button>
                    <Button 
                      onClick={() => setPwdDialogOpen(true)}
                      size="lg"
                      variant="outline"
                      className="border-2 border-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950 font-bold text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300"
                    >
                      <Lock className="mr-2 h-5 w-5" />
                      Change Password
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={handleSave} 
                      disabled={saving}
                      size="lg"
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl font-bold"
                    >
                      {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" /> : <Save className="mr-2 h-5 w-5 text-white" />}
                      <span className="text-white">{saving ? 'Saving...' : 'Save Changes'}</span>
                    </Button>
                    <Button 
                      onClick={() => setIsEditing(false)} 
                      disabled={saving}
                      size="lg"
                      variant="outline"
                      className="border-2 border-red-300 hover:bg-red-100 dark:hover:bg-red-950 font-bold text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <X className="mr-2 h-5 w-5" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <Card className="glass-card border-none shadow-2xl overflow-hidden group hover:shadow-purple-500/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative bg-gradient-to-r from-violet-500/20 to-purple-500/20 border-b border-purple-200/50">
                <CardTitle className="flex items-center gap-3 text-2xl font-black">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="relative p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'First Name', id: 'firstName', value: employee.firstName, formValue: form.firstName, onChange: (v: string) => handleChange('firstName', v), icon: User },
                  { label: 'Last Name', id: 'lastName', value: employee.lastName, formValue: form.lastName, onChange: (v: string) => handleChange('lastName', v), icon: User },
                  { label: 'Username', id: 'username', value: employee.username, disabled: true, icon: User },
                  { label: 'Gender', id: 'gender', value: employee.gender, formValue: form.gender, type: 'select', options: ['', 'Male', 'Female', 'Other'], onChange: (v: string) => handleChange('gender', v), icon: User },
                  { label: 'Email', id: 'emailId', value: employee.emailId, formValue: form.emailId, onChange: (v: string) => handleChange('emailId', v), icon: Mail },
                  { label: 'Phone', id: 'phoneNumber', value: employee.phoneNumber, formValue: form.phoneNumber, onChange: (v: string) => handleChange('phoneNumber', v), icon: Phone },
                ].map(field => {
                  const Icon = field.icon;
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        {field.label}
                      </Label>
                      {!isEditing || field.disabled ? (
                        <Input value={field.value || '—'} disabled className="h-11 font-semibold bg-white/50 dark:bg-slate-900/50 border-purple-200/50" />
                      ) : field.type === 'select' ? (
                        <select className="w-full h-11 px-3 border-2 border-purple-200/50 rounded-lg bg-white/50 dark:bg-slate-900/50 font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" value={field.formValue || ''} onChange={e => field.onChange?.(e.target.value)}>
                          {field.options?.map(opt => <option key={opt} value={opt}>{opt || 'Select'}</option>)}
                        </select>
                      ) : (
                        <Input value={field.formValue || ''} onChange={e => field.onChange?.(e.target.value)} className="h-11 font-semibold border-2 border-purple-200/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>


            {/* Employment */}
            <Card className="glass-card border-none shadow-2xl overflow-hidden group hover:shadow-blue-500/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-blue-200/50">
                <CardTitle className="flex items-center gap-3 text-2xl font-black">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="relative p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Role
                  </Label>
                  {!isEditing ? (
                    <Input value={employee.role || '—'} disabled className="h-11 font-semibold bg-white/50 dark:bg-slate-900/50 border-blue-200/50" />
                  ) : (
                    <select className="w-full h-11 px-3 border-2 border-blue-200/50 rounded-lg bg-white/50 dark:bg-slate-900/50 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" value={form.role || ''} onChange={e => handleChange('role', e.target.value)}>
                      <option value="">Select</option>
                      {['Owner', 'Manager', 'Employee'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Department
                  </Label>
                  {!isEditing ? (
                    <Input value={employee.department || '—'} disabled className="h-11 font-semibold bg-white/50 dark:bg-slate-900/50 border-blue-200/50" />
                  ) : (
                    <select className="w-full h-11 px-3 border-2 border-blue-200/50 rounded-lg bg-white/50 dark:bg-slate-900/50 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" value={form.department || ''} onChange={e => handleChange('department', e.target.value)}>
                      <option value="">Select</option>
                      {['Management', 'Sales', 'Operations', 'Accounts', 'HR', 'Support'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Joined Date
                  </Label>
                  <Input value={formatDate(employee.joinedDate)} disabled className="h-11 font-semibold bg-white/50 dark:bg-slate-900/50 border-blue-200/50" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Manager
                  </Label>
                  <Input value={employee.managerName || 'Not Assigned'} disabled className="h-11 font-semibold bg-white/50 dark:bg-slate-900/50 border-blue-200/50" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">₹</span>
                    Salary
                  </Label>
                  {!isEditing ? (
                    <Input value={employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : '—'} disabled className="h-11 font-semibold bg-white/50 dark:bg-slate-900/50 border-blue-200/50" />
                  ) : (
                    <Input type="number" value={form.salary || ''} onChange={e => handleChange('salary', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-11 font-semibold border-2 border-blue-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Shift Timing
                  </Label>
                  <div className="flex gap-2">
                    {['start', 'end'].map(t => (
                      !isEditing ? (
                        <Input key={t} value={(employee.shiftTiming as any)?.[t] || '—'} disabled className="h-11 font-semibold bg-white/50 dark:bg-slate-900/50 border-blue-200/50" />
                      ) : (
                        <input key={t} type="time" value={(form.shiftTiming as any)?.[t] || ''} onChange={e => handleShift(t as any, e.target.value)} className="w-full h-11 px-3 border-2 border-blue-200/50 rounded-lg bg-white/50 dark:bg-slate-900/50 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                      )
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Address */}
            <Card className="glass-card border-none shadow-2xl overflow-hidden group hover:shadow-orange-500/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-b border-orange-200/50">
                <CardTitle className="flex items-center gap-3 text-2xl font-black">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="relative p-6">
                {!isEditing ? (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-950/30 dark:to-pink-950/30 border-2 border-orange-200/50">
                    <p className="font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                      {employee.address?.line1 && <span className="block">{employee.address.line1}</span>}
                      {employee.address?.line2 && <span className="block">{employee.address.line2}</span>}
                      {(employee.address?.city || employee.address?.state || employee.address?.postalCode) && (
                        <span className="block">{[employee.address?.city, employee.address?.state, employee.address?.postalCode].filter(Boolean).join(', ')}</span>
                      )}
                      {employee.address?.country && <span className="block font-bold mt-2">{employee.address.country}</span>}
                      {!employee.address?.line1 && <span className="text-muted-foreground">No address provided</span>}
                    </p>
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
                        <Label className="font-bold text-slate-700 dark:text-slate-300">{field.label}</Label>
                        <Input value={(form.address as any)?.[field.id] || ''} onChange={e => handleAddress(field.id as any, e.target.value)} className="h-11 font-semibold border-2 border-orange-200/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Emergency */}
            <Card className="glass-card border-none shadow-2xl overflow-hidden group hover:shadow-red-500/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative bg-gradient-to-r from-red-500/20 to-rose-500/20 border-b border-red-200/50">
                <CardTitle className="flex items-center gap-3 text-2xl font-black">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="relative p-6">
                {!isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-2 border-red-200/50">
                    {[
                      { label: 'Name', value: employee.emergencyContact?.name },
                      { label: 'Phone', value: employee.emergencyContact?.phone },
                      { label: 'Relationship', value: employee.emergencyContact?.relationship },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-xs text-muted-foreground font-bold uppercase mb-2">{item.label}</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{item.value || '—'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['name', 'phone', 'relationship'].map(id => (
                      <div key={id} className="space-y-2">
                        <Label className="font-bold text-slate-700 dark:text-slate-300 capitalize">{id}</Label>
                        <Input value={(form.emergencyContact as any)?.[id] || ''} onChange={e => handleEC(id as any, e.target.value)} className="h-11 font-semibold border-2 border-red-200/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>


          {/* RIGHT SIDEBAR - FIXED DYNAMIC COLORS */}
          <div className="space-y-6">
            <Card className="glass-card border-none shadow-2xl overflow-hidden sticky top-6">
              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-6 border-b border-purple-200/50">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400 animate-pulse" />
                  Quick Stats
                </h3>
              </div>
              <CardContent className="p-6 space-y-3">
                {[
                  { label: 'Employee ID', value: employee.empId, icon: User },
                  { label: 'Status', value: employee.status?.toUpperCase() || '—', icon: Shield },
                  { label: 'Role', value: employee.role || '—', icon: Briefcase },
                  { label: 'Department', value: employee.department || '—', icon: Building },
                  { label: 'Salary', value: employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : '—', icon: Calendar },
                ].map(item => {
                  const Icon = item.icon;
                  const styles = getStatCardStyles(item.label);
                  return (
                    <div key={item.label} className={`flex items-center justify-between p-4 rounded-xl ${styles.bgClass} border-2 hover:shadow-lg transition-all`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
                          <Icon className={`h-5 w-5 ${styles.iconColor}`} />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                      </div>
                      <span className="font-black text-slate-900 dark:text-white">{item.value}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>


            <Card className="glass-card border-none shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-6 border-b border-emerald-200/50">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Security
                </h3>
              </div>
              <CardContent className="p-6">
                <Button onClick={() => setPwdDialogOpen(true)} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg">
                  <Lock className="mr-2 h-5 w-5 text-white" />
                  <span className="text-white">Change Password</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>


      {/* Password Dialog - FIXED */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="glass-card border-none shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePwdChange}>
            {[
              { label: 'Current Password', value: currentPwd, setValue: setCurrentPwd, show: showCurrentPwd, setShow: setShowCurrentPwd },
              { label: 'New Password', value: newPwd, setValue: setNewPwd, show: showNewPwd, setShow: setShowNewPwd, minLength: 6 },
            ].map(field => (
              <div key={field.label}>
                <Label className="font-bold text-slate-700 dark:text-slate-300">{field.label}</Label>
                <div className="relative mt-2">
                  <Input
                    type={field.show ? "text" : "password"}
                    value={field.value}
                    onChange={e => field.setValue(e.target.value)}
                    required
                    minLength={field.minLength}
                    className="h-11 pr-12 font-semibold border-2 border-purple-200/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                  <button type="button" onClick={() => field.setShow(!field.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    {field.show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            ))}
            <DialogFooter className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setPwdDialogOpen(false)} disabled={savingPwd} className="font-bold">
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-bold" disabled={savingPwd}>
                {savingPwd ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : null}
                <span className="text-white">Update Password</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
