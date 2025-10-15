// src/pages/OnboardOrganization.tsx
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import WaveBackground from '@/components/lightswind/wave-background';
import { ConfettiButton } from '@/components/lightswind/confetti-button';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'https://finflux-64307221061.asia-south1.run.app';

type OrganizationCreateRequest = {
  organizationId: string;
  organizationName: string;
  gstNumber?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phoneNumber?: string;
  email?: string;
  licenseNumber?: string;
  ownerFirstName: string;
  ownerLastName: string;
};

type OrganizationResponse = {
  id: string;
  organizationId: string;
  organizationName: string;
  gstNumber?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phoneNumber?: string;
  email?: string;
  licenseNumber?: string;
  ownerFirstName: string;
  ownerLastName: string;
};

type OrganizationUpdateRequest = {
  organizationName?: string;
  gstNumber?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  licenseNumber?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
};

type EmployeeCreateRequest = {
  empId: string;
  organizationId: string;
  status?: string; // ACTIVE | INACTIVE
  role: string;
  department: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailId: string;
  username: string;
  password: string;
  // shiftTiming removed from owner creation UI by request
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
  newPassword?: string;
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

type EmployeeResponse = {
  id: string;
  empId: string;
  organizationId: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  role: string;
  department: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailId: string;
  username: string;
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

type Page<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

const IN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha',
  'Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
];

const makeOrgId = (name: string) => {
  const initials = (name || '').trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase();
  const rand = Math.floor(Math.random() * 10000);
  return `${initials}-${String(rand).padStart(4, '0')}`;
};

const orgLetters = (orgId: string) => (orgId.match(/[A-Za-z]+/g)?.join('') || '').toUpperCase();

type View =
  | 'menu'
  | 'createOrg'
  | 'updateOrg'
  | 'createOwner'
  | 'updateOwner';

export default function OnboardOrganization() {
  const { toast } = useToast();

  const [view, setView] = useState<View>('menu');

  // Common: organization search list state
  const [orgs, setOrgs] = useState<OrganizationResponse[]>([]);
  const [orgPage, setOrgPage] = useState(0);
  const [orgHasMore, setOrgHasMore] = useState(true);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgQuery, setOrgQuery] = useState('');

  const filteredOrgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(o =>
      (o.organizationName || '').toLowerCase().includes(q) ||
      (o.organizationId || '').toLowerCase().includes(q) ||
      (o.city || '').toLowerCase().includes(q) ||
      (o.state || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q)
    );
  }, [orgs, orgQuery]);

  const resetOrgList = () => {
    setOrgs([]);
    setOrgPage(0);
    setOrgHasMore(true);
  };

  const loadMoreOrgs = async () => {
    if (orgLoading || !orgHasMore) return;
    try {
      setOrgLoading(true);
      const res = await axios.get<Page<OrganizationResponse>>(`${API_BASE}/api/organizations`, {
        params: { page: orgPage, size: 20 },
        timeout: 15000,
      });
      const page = res.data;
      setOrgs(prev => [...prev, ...page.content]);
      setOrgPage(page.number + 1);
      setOrgHasMore(!page.last);
    } catch (err: any) {
      toast({
        title: 'Load organizations failed',
        description: err?.response?.data?.message || 'Unable to load organizations.',
        variant: 'destructive',
      });
    } finally {
      setOrgLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'updateOrg' || view === 'createOwner' || view === 'updateOwner') {
      // pre-load organizations list on these flows
      resetOrgList();
      loadMoreOrgs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // View: Create Organization
  const [orgForm, setOrgForm] = useState<OrganizationCreateRequest>({
    organizationId: '',
    organizationName: '',
    gstNumber: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    phoneNumber: '',
    email: '',
    licenseNumber: '',
    ownerFirstName: '',
    ownerLastName: '',
  });
  const derivedOrgId = useMemo(() => {
    if (!orgForm.organizationName.trim()) return '';
    return makeOrgId(orgForm.organizationName);
  }, [orgForm.organizationName]);
  const updateOrgCreate = <K extends keyof OrganizationCreateRequest>(k: K) => (v: OrganizationCreateRequest[K]) =>
    setOrgForm(p => ({ ...p, [k]: v }));
  const createOrgRequiredOk = useMemo(() => {
    const required: Array<string> = [
      derivedOrgId || orgForm.organizationId,
      orgForm.organizationName,
      orgForm.address1,
      orgForm.city,
      orgForm.state,
      orgForm.country,
      orgForm.postalCode,
      orgForm.ownerFirstName,
      orgForm.ownerLastName,
    ];
    return required.every(v => String(v || '').trim().length > 0);
  }, [derivedOrgId, orgForm]);

  const [submittingOrg, setSubmittingOrg] = useState(false);

  const submitCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOrgRequiredOk) {
      toast({ title: 'Validation', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingOrg(true);
      const payload: OrganizationCreateRequest = {
        ...orgForm,
        organizationId: derivedOrgId || orgForm.organizationId,
      };
      const res = await axios.post<OrganizationResponse>(`${API_BASE}/api/organizations`, payload, { timeout: 15000 });
      toast({ title: 'Organization created', description: 'Onboarding completed successfully.' });
      // Offer to onboard owner next with selected org
      setSelectedOrg(res.data);
    } catch (err: any) {
      toast({
        title: 'Create failed',
        description: err?.response?.data?.message || 'Unable to create organization.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOrg(false);
    }
  };

  // View: Update Organization
  const [selectedOrg, setSelectedOrg] = useState<OrganizationResponse | null>(null);
  const [orgUpdateForm, setOrgUpdateForm] = useState<OrganizationUpdateRequest>({
    organizationName: '',
    gstNumber: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    phoneNumber: '',
    email: '',
    licenseNumber: '',
    ownerFirstName: '',
    ownerLastName: '',
  });
  useEffect(() => {
    if (selectedOrg && (view === 'updateOrg' || view === 'createOwner')) {
      // Prefill updateOrgForm when selected
      setOrgUpdateForm({
        organizationName: selectedOrg.organizationName || '',
        gstNumber: selectedOrg.gstNumber || '',
        address1: selectedOrg.address1 || '',
        address2: selectedOrg.address2 || '',
        city: selectedOrg.city || '',
        state: selectedOrg.state || '',
        country: selectedOrg.country || 'India',
        postalCode: selectedOrg.postalCode || '',
        phoneNumber: selectedOrg.phoneNumber || '',
        email: selectedOrg.email || '',
        licenseNumber: selectedOrg.licenseNumber || '',
        ownerFirstName: selectedOrg.ownerFirstName || '',
        ownerLastName: selectedOrg.ownerLastName || '',
      });
    }
  }, [selectedOrg, view]);

  const updateOrgUpdate = <K extends keyof OrganizationUpdateRequest>(k: K) => (v: OrganizationUpdateRequest[K]) =>
    setOrgUpdateForm(p => ({ ...p, [k]: v }));

  const updateOrgRequiredOk = useMemo(() => {
    if (!selectedOrg) return false;
    const r = orgUpdateForm;
    const required = [
      r.organizationName,
      r.address1,
      r.city,
      r.state,
      r.country,
      r.postalCode,
      r.ownerFirstName,
      r.ownerLastName,
    ];
    return required.every(v => String(v || '').trim().length > 0);
  }, [selectedOrg, orgUpdateForm]);

  const [submittingOrgUpdate, setSubmittingOrgUpdate] = useState(false);
  const submitUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    if (!updateOrgRequiredOk) {
      toast({ title: 'Validation', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingOrgUpdate(true);
      await axios.put<OrganizationResponse>(
        `${API_BASE}/api/organizations/${encodeURIComponent(selectedOrg.id)}`,
        orgUpdateForm,
        { timeout: 15000 }
      );
      toast({ title: 'Organization updated', description: `${selectedOrg.organizationName} updated successfully.` });
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err?.response?.data?.message || 'Unable to update organization.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOrgUpdate(false);
    }
  };

  // View: Create Owner (select org then create owner without shift timing)
  const [ownerCreateForm, setOwnerCreateForm] = useState<EmployeeCreateRequest>({
    empId: '',
    organizationId: '',
    status: 'ACTIVE',
    role: 'Owner',
    department: 'Management',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    emailId: '',
    username: '',
    password: '',
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
    emergencyContact: { name: '', phone: '', relationship: '' },
  });

  const computedCreateOwnerEmpId = useMemo(() => {
    const org = selectedOrg?.organizationId;
    return org ? `${orgLetters(org)}EMP0001` : '';
  }, [selectedOrg]);

  useEffect(() => {
    if (view === 'createOwner') {
      setOwnerCreateForm(p => ({
        ...p,
        organizationId: selectedOrg?.organizationId || '',
        empId: selectedOrg ? computedCreateOwnerEmpId : '',
        status: (p.status || 'ACTIVE').toUpperCase(),
        role: p.role || 'Owner',
        department: p.department || 'Management',
        address: { ...(p.address || {}), country: p.address?.country || 'India' },
      }));
    }
  }, [view, selectedOrg, computedCreateOwnerEmpId]);

  const updateOwnerCreate = <K extends keyof EmployeeCreateRequest>(k: K) => (v: EmployeeCreateRequest[K]) =>
    setOwnerCreateForm(p => ({ ...p, [k]: v }));
  const updateOwnerCreateAddress = (k: keyof NonNullable<EmployeeCreateRequest['address']>, v: string) =>
    setOwnerCreateForm(p => ({ ...p, address: { ...(p.address || {}), [k]: v } }));
  const updateOwnerCreateEmergency = (k: keyof NonNullable<EmployeeCreateRequest['emergencyContact']>, v: string) =>
    setOwnerCreateForm(p => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), [k]: v } }));

  const createOwnerRequiredOk = useMemo(() => {
    if (!selectedOrg) return false;
    const p = ownerCreateForm;
    const required: Array<string> = [
      selectedOrg.organizationId,
      computedCreateOwnerEmpId || p.empId,
      p.role,
      p.department,
      p.firstName,
      p.lastName,
      p.emailId,
      p.username,
      p.password,
    ];
    return required.every(v => String(v || '').trim().length > 0);
  }, [selectedOrg, ownerCreateForm, computedCreateOwnerEmpId]);

  const [submittingOwnerCreate, setSubmittingOwnerCreate] = useState(false);
  const submitCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    if (!createOwnerRequiredOk) {
      toast({ title: 'Validation', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingOwnerCreate(true);
      const payload: EmployeeCreateRequest = {
        ...ownerCreateForm,
        organizationId: selectedOrg.organizationId,
        empId: computedCreateOwnerEmpId || ownerCreateForm.empId,
        status: (ownerCreateForm.status || 'ACTIVE').toUpperCase(),
        // No shiftTiming in owner creation UI
        address: { ...(ownerCreateForm.address || {}), country: ownerCreateForm.address?.country || 'India' },
      };
      await axios.post(
        `${API_BASE}/api/organizations/${encodeURIComponent(payload.organizationId)}/employees`,
        payload,
        { timeout: 15000 }
      );
      toast({ title: 'Owner created', description: `Owner ${payload.firstName} ${payload.lastName} onboarded.` });
      // Reset form for next potential create
      setOwnerCreateForm(p => ({
        ...p,
        firstName: '',
        lastName: '',
        phoneNumber: '',
        emailId: '',
        username: '',
        password: '',
      }));
    } catch (err: any) {
      toast({
        title: 'Create failed',
        description: err?.response?.data?.message || 'Unable to create owner.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOwnerCreate(false);
    }
  };

  // View: Update Owner (select org -> select owner -> update owner, shift timing allowed here)
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [empPage, setEmpPage] = useState(0);
  const [empHasMore, setEmpHasMore] = useState(true);
  const [empLoading, setEmpLoading] = useState(false);
  const [empQuery, setEmpQuery] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<EmployeeResponse | null>(null);

  const filteredEmps = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    const base = employees;
    if (!q) {
      // Default: show Owners first by sorting
      return [...base].sort((a, b) => (a.role === 'Owner' ? -1 : 1) - (b.role === 'Owner' ? -1 : 1));
    }
    return base.filter(e =>
      (e.firstName || '').toLowerCase().includes(q) ||
      (e.lastName || '').toLowerCase().includes(q) ||
      (e.username || '').toLowerCase().includes(q) ||
      (e.emailId || '').toLowerCase().includes(q) ||
      (e.empId || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q)
    );
  }, [employees, empQuery]);

  const resetEmpList = () => {
    setEmployees([]);
    setEmpPage(0);
    setEmpHasMore(true);
  };

  const loadMoreEmployees = async () => {
    if (!selectedOrg || empLoading || !empHasMore) return;
    try {
      setEmpLoading(true);
      const res = await axios.get<Page<EmployeeResponse>>(
        `${API_BASE}/api/organizations/${encodeURIComponent(selectedOrg.organizationId)}/employees`,
        { params: { page: empPage, size: 20 }, timeout: 15000 }
      );
      const page = res.data;
      setEmployees(prev => [...prev, ...page.content]);
      setEmpPage(page.number + 1);
      setEmpHasMore(!page.last);
    } catch (err: any) {
      toast({
        title: 'Load employees failed',
        description: err?.response?.data?.message || 'Unable to load employees.',
        variant: 'destructive',
      });
    } finally {
      setEmpLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'updateOwner' && selectedOrg) {
      resetEmpList();
      loadMoreEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedOrg?.organizationId]);

  const [ownerUpdateForm, setOwnerUpdateForm] = useState<EmployeeUpdateRequest>({
    status: 'ACTIVE',
    role: 'Owner',
    department: 'Management',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    emailId: '',
    username: '',
    newPassword: '',
    shiftTiming: { start: '', end: '' },
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
    emergencyContact: { name: '', phone: '', relationship: '' },
  });

  useEffect(() => {
    if (selectedEmp && view === 'updateOwner') {
      setOwnerUpdateForm({
        status: (selectedEmp.status as any) || 'ACTIVE',
        role: selectedEmp.role || 'Owner',
        department: selectedEmp.department || 'Management',
        firstName: selectedEmp.firstName || '',
        lastName: selectedEmp.lastName || '',
        phoneNumber: selectedEmp.phoneNumber || '',
        emailId: selectedEmp.emailId || '',
        username: selectedEmp.username || '',
        newPassword: '',
        shiftTiming: { start: selectedEmp.shiftTiming?.start || '', end: selectedEmp.shiftTiming?.end || '' },
        address: {
          line1: selectedEmp.address?.line1 || '',
          line2: selectedEmp.address?.line2 || '',
          city: selectedEmp.address?.city || '',
          state: selectedEmp.address?.state || '',
          postalCode: selectedEmp.address?.postalCode || '',
          country: selectedEmp.address?.country || 'India',
        },
        emergencyContact: {
          name: selectedEmp.emergencyContact?.name || '',
          phone: selectedEmp.emergencyContact?.phone || '',
          relationship: selectedEmp.emergencyContact?.relationship || '',
        },
      });
    }
  }, [selectedEmp, view]);

  const updateOwnerUpdate = <K extends keyof EmployeeUpdateRequest>(k: K) => (v: EmployeeUpdateRequest[K]) =>
    setOwnerUpdateForm(p => ({ ...p, [k]: v }));
  const updateOwnerUpdateAddress = (k: keyof NonNullable<EmployeeUpdateRequest['address']>, v: string) =>
    setOwnerUpdateForm(p => ({ ...p, address: { ...(p.address || {}), [k]: v } }));
  const updateOwnerUpdateShift = (k: keyof NonNullable<EmployeeUpdateRequest['shiftTiming']>, v: string) =>
    setOwnerUpdateForm(p => ({ ...p, shiftTiming: { ...(p.shiftTiming || {}), [k]: v } }));
  const updateOwnerUpdateEmergency = (k: keyof NonNullable<EmployeeUpdateRequest['emergencyContact']>, v: string) =>
    setOwnerUpdateForm(p => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), [k]: v } }));

  const updateOwnerRequiredOk = useMemo(() => {
    if (!selectedOrg || !selectedEmp) return false;
    // Ensure core fields present
    const p = ownerUpdateForm;
    const required = [p.role, p.department, p.firstName, p.lastName, p.emailId, p.username];
    return required.every(v => String(v || '').trim().length > 0);
  }, [selectedOrg, selectedEmp, ownerUpdateForm]);

  const [submittingOwnerUpdate, setSubmittingOwnerUpdate] = useState(false);
  const submitUpdateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !selectedEmp) return;
    if (!updateOwnerRequiredOk) {
      toast({ title: 'Validation', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingOwnerUpdate(true);
      await axios.put(
        `${API_BASE}/api/organizations/${encodeURIComponent(selectedOrg.organizationId)}/employees/${encodeURIComponent(selectedEmp.id)}`,
        ownerUpdateForm,
        { timeout: 15000 }
      );
      toast({ title: 'Owner updated', description: `Employee ${selectedEmp.firstName} ${selectedEmp.lastName} updated.` });
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err?.response?.data?.message || 'Unable to update owner.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOwnerUpdate(false);
    }
  };

  const renderOrgPicker = (title = 'Select Organization', onPick?: (o: OrganizationResponse) => void) => (
    <Card className="backdrop-blur-xl bg-white/10 border-white/10 shadow-2xl">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-xl text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Input
          placeholder="Search by name, ID, city, state, email"
          value={orgQuery}
          onChange={(e) => setOrgQuery(e.target.value)}
          className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
        />
        <div className="max-h-80 overflow-auto divide-y divide-white/10 rounded-md border border-white/10">
          {filteredOrgs.length === 0 ? (
            <div className="p-4 text-sm text-white/70">No organizations found.</div>
          ) : (
            filteredOrgs.map((o) => (
              <div key={o.id} className="p-3 flex items-center justify-between hover:bg-white/5">
                <div className="text-white/90">
                  <div className="text-sm font-medium">{o.organizationName}</div>
                  <div className="text-xs text-white/60">{o.organizationId} • {o.city}, {o.state}</div>
                </div>
                <ConfettiButton
                  variant="gradient"
                  size="sm"
                  animation="scale"
                  onClick={() => {
                    setSelectedOrg(o);
                    onPick?.(o);
                  }}
                >
                  Select
                </ConfettiButton>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/60">
            Loaded {orgs.length} item(s)
          </div>
          <ConfettiButton
            onClick={loadMoreOrgs}
            disabled={!orgHasMore || orgLoading}
            variant="outline"
            size="sm"
            animation="scale"
          >
            {orgLoading ? 'Loading...' : orgHasMore ? 'Load more' : 'No more'}
          </ConfettiButton>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmpPicker = (title = 'Select Owner/Employee', onPick?: (e: EmployeeResponse) => void) => (
    <Card className="backdrop-blur-xl bg-white/10 border-white/10 shadow-2xl">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-xl text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Input
          placeholder="Search by name, username, email, empId, role"
          value={empQuery}
          onChange={(e) => setEmpQuery(e.target.value)}
          className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
        />
        <div className="max-h-80 overflow-auto divide-y divide-white/10 rounded-md border border-white/10">
          {filteredEmps.length === 0 ? (
            <div className="p-4 text-sm text-white/70">No employees found.</div>
          ) : (
            filteredEmps.map((emp) => (
              <div key={emp.id} className="p-3 flex items-center justify-between hover:bg-white/5">
                <div className="text-white/90">
                  <div className="text-sm font-medium">{emp.firstName} {emp.lastName} ({emp.role})</div>
                  <div className="text-xs text-white/60">{emp.empId} • {emp.username} • {emp.emailId}</div>
                </div>
                <ConfettiButton
                  variant="gradient"
                  size="sm"
                  animation="scale"
                  onClick={() => {
                    setSelectedEmp(emp);
                    onPick?.(emp);
                  }}
                >
                  Select
                </ConfettiButton>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/60">
            Loaded {employees.length} item(s)
          </div>
          <ConfettiButton
            onClick={loadMoreEmployees}
            disabled={!empHasMore || empLoading}
            variant="outline"
            size="sm"
            animation="scale"
          >
            {empLoading ? 'Loading...' : empHasMore ? 'Load more' : 'No more'}
          </ConfettiButton>
        </div>
      </CardContent>
    </Card>
  );

  const resetAll = () => {
    setView('menu');
    setSelectedOrg(null);
    setSelectedEmp(null);
    resetOrgList();
    resetEmpList();
    setOrgQuery('');
    setEmpQuery('');
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-30">
        <WaveBackground backdropBlurAmount="sm" className="absolute inset-0" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,11,17,0.75) 0%, rgba(8,11,17,0.65) 50%, rgba(8,11,17,0.75) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-6xl space-y-10">

          {/* Main Action Menu */}
          {view === 'menu' && (
            <Card className="backdrop-blur-xl bg-white/10 border-white/10 shadow-2xl transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-2xl text-white">Organization & Owner Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ConfettiButton
                    variant="gradient"
                    size="default"
                    animation="scale"
                    onClick={() => setView('createOrg')}
                  >
                    Onboard New Organization
                  </ConfettiButton>

                  <ConfettiButton
                    variant="gradient"
                    size="default"
                    animation="scale"
                    onClick={() => setView('updateOrg')}
                  >
                    Update Organization
                  </ConfettiButton>

                  <ConfettiButton
                    variant="gradient"
                    size="default"
                    animation="scale"
                    onClick={() => setView('createOwner')}
                  >
                    Onboard Owner
                  </ConfettiButton>

                  <ConfettiButton
                    variant="gradient"
                    size="default"
                    animation="scale"
                    onClick={() => setView('updateOwner')}
                  >
                    Update Owner
                  </ConfettiButton>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Organization */}
          {view === 'createOrg' && (
            <Card className="backdrop-blur-xl bg-white/10 border-white/10 shadow-2xl">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl text-white">Onboard Organization</CardTitle>
                  <ConfettiButton variant="outline" size="sm" animation="scale" onClick={resetAll}>
                    Back
                  </ConfettiButton>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={submitCreateOrganization} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="organizationName" className="text-white/90">
                        Organization Name <span className="text-cyan-300">*</span>
                      </Label>
                      <Input
                        id="organizationName"
                        value={orgForm.organizationName}
                        onChange={(e) => updateOrgCreate('organizationName')(e.target.value)}
                        placeholder="FineFlux Fuel Station"
                        required
                        aria-required="true"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organizationId" className="text-white/90">
                        Organization ID <span className="text-cyan-300">*</span>
                      </Label>
                      <Input
                        id="organizationId"
                        value={derivedOrgId || ''}
                        readOnly
                        disabled
                        placeholder="Auto-generated"
                        required
                        aria-required="true"
                        className="bg-black border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gstNumber" className="text-white/90">GST Number</Label>
                      <Input
                        id="gstNumber"
                        value={orgForm.gstNumber || ''}
                        onChange={(e) => updateOrgCreate('gstNumber')(e.target.value)}
                        placeholder="Optional"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber" className="text-white/90">License Number</Label>
                      <Input
                        id="licenseNumber"
                        value={orgForm.licenseNumber || ''}
                        onChange={(e) => updateOrgCreate('licenseNumber')(e.target.value)}
                        placeholder="Optional"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/90">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={orgForm.email || ''}
                        onChange={(e) => updateOrgCreate('email')(e.target.value)}
                        placeholder="info@company.com"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/90">Address</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Address Line 1"
                        value={orgForm.address1}
                        onChange={(e) => updateOrgCreate('address1')(e.target.value)}
                        required
                        aria-required="true"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                      <Input
                        placeholder="Address Line 2"
                        value={orgForm.address2 || ''}
                        onChange={(e) => updateOrgCreate('address2')(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                      <Input
                        placeholder="City"
                        value={orgForm.city}
                        onChange={(e) => updateOrgCreate('city')(e.target.value)}
                        required
                        aria-required="true"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                      <select
                        className="w-full rounded-md border bg-black border-white/20 p-2 text-white"
                        value={orgForm.state}
                        onChange={(e) => updateOrgCreate('state')(e.target.value)}
                        required
                        aria-required="true"
                      >
                        <option value="">Select State</option>
                        {IN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <Input
                        placeholder="Postal Code"
                        value={orgForm.postalCode}
                        onChange={(e) => updateOrgCreate('postalCode')(e.target.value)}
                        required
                        aria-required="true"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                      <Input
                        value={orgForm.country}
                        onChange={(e) => updateOrgCreate('country')(e.target.value)}
                        required
                        aria-required="true"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white/90">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={orgForm.phoneNumber || ''}
                        onChange={(e) => updateOrgCreate('phoneNumber')(e.target.value)}
                        placeholder="+91 90000 00000"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerFirstName" className="text-white/90">
                        Owner First Name <span className="text-cyan-300">*</span>
                      </Label>
                      <Input
                        id="ownerFirstName"
                        value={orgForm.ownerFirstName}
                        onChange={(e) => updateOrgCreate('ownerFirstName')(e.target.value)}
                        required
                        aria-required="true"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerLastName" className="text-white/90">
                        Owner Last Name <span className="text-cyan-300">*</span>
                      </Label>
                      <Input
                        id="ownerLastName"
                        value={orgForm.ownerLastName}
                        onChange={(e) => updateOrgCreate('ownerLastName')(e.target.value)}
                        required
                        aria-required="true"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <ConfettiButton
                      type="button"
                      variant="outline"
                      size="default"
                      animation="scale"
                      onClick={resetAll}
                    >
                      Cancel
                    </ConfettiButton>
                    <ConfettiButton
                      type="submit"
                      disabled={submittingOrg || !createOrgRequiredOk}
                      variant="gradient"
                      size="default"
                      animation="scale"
                    >
                      {submittingOrg ? 'Submitting...' : 'Create Organization'}
                    </ConfettiButton>
                  </div>
                </form>

                {/* Quick next step: If created and selectedOrg seeded, offer Create Owner shortcut */}
                {selectedOrg && (
                  <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                    <div className="text-sm text-white/80">
                      Organization created with ID:{' '}
                      <span className="font-medium text-cyan-300">{selectedOrg.organizationId}</span>
                    </div>
                    <ConfettiButton
                      onClick={() => setView('createOwner')}
                      variant="gradient"
                      size="default"
                      animation="scale"
                    >
                      Onboard Owner
                    </ConfettiButton>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Update Organization */}
          {view === 'updateOrg' && (
            <>
              {!selectedOrg ? (
                renderOrgPicker('Select Organization to Update')
              ) : (
                <Card className="backdrop-blur-xl bg-white/10 border-white/10 shadow-2xl">
                  <CardHeader className="border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl text-white">Update Organization</CardTitle>
                      <div className="flex gap-2">
                        <ConfettiButton
                          variant="outline"
                          size="sm"
                          animation="scale"
                          onClick={() => setSelectedOrg(null)}
                        >
                          Change Organization
                        </ConfettiButton>
                        <ConfettiButton
                          variant="outline"
                          size="sm"
                          animation="scale"
                          onClick={resetAll}
                        >
                          Back
                        </ConfettiButton>
                      </div>
                    </div>
                    <div className="text-xs text-white/70 pt-2">
                      Selected: {selectedOrg.organizationName} • {selectedOrg.organizationId}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={submitUpdateOrganization} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-white/90">Organization Name <span className="text-cyan-300">*</span></Label>
                          <Input
                            value={orgUpdateForm.organizationName || ''}
                            onChange={(e) => updateOrgUpdate('organizationName')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Organization ID</Label>
                          <Input value={selectedOrg.organizationId} readOnly disabled className="bg-black border-white/20 text-white" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">GST Number</Label>
                          <Input
                            value={orgUpdateForm.gstNumber || ''}
                            onChange={(e) => updateOrgUpdate('gstNumber')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">License Number</Label>
                          <Input
                            value={orgUpdateForm.licenseNumber || ''}
                            onChange={(e) => updateOrgUpdate('licenseNumber')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Email</Label>
                          <Input
                            type="email"
                            value={orgUpdateForm.email || ''}
                            onChange={(e) => updateOrgUpdate('email')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/90">Address</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            placeholder="Address Line 1"
                            value={orgUpdateForm.address1 || ''}
                            onChange={(e) => updateOrgUpdate
('address1')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                          <Input
                            placeholder="Address Line 2"
                            value={orgUpdateForm.address2 || ''}
                            onChange={(e) => updateOrgUpdate('address2')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                          <Input
                            placeholder="City"
                            value={orgUpdateForm.city || ''}
                            onChange={(e) => updateOrgUpdate('city')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                          <select
                            className="w-full rounded-md border bg-black border-white/20 p-2 text-white"
                            value={orgUpdateForm.state || ''}
                            onChange={e => updateOrgUpdate('state')(e.target.value)}
                          >
                            <option value="">Select State</option>
                            {IN_STATES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <Input
                            placeholder="Postal Code"
                            value={orgUpdateForm.postalCode || ''}
                            onChange={(e) => updateOrgUpdate('postalCode')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                          <Input
                            placeholder="Country"
                            value={orgUpdateForm.country || 'India'}
                            onChange={(e) => updateOrgUpdate('country')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">Phone</Label>
                          <Input
                            type="tel"
                            value={orgUpdateForm.phoneNumber || ''}
                            onChange={(e) => updateOrgUpdate('phoneNumber')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Owner First Name <span className="text-cyan-300">*</span></Label>
                          <Input
                            value={orgUpdateForm.ownerFirstName || ''}
                            onChange={(e) => updateOrgUpdate('ownerFirstName')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Owner Last Name <span className="text-cyan-300">*</span></Label>
                          <Input
                            value={orgUpdateForm.ownerLastName || ''}
                            onChange={(e) => updateOrgUpdate('ownerLastName')(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <ConfettiButton
                          type="button"
                          variant="outline"
                          size="default"
                          animation="scale"
                          onClick={resetAll}
                        >
                          Cancel
                        </ConfettiButton>
                        <ConfettiButton
                          type="submit"
                          disabled={submittingOrgUpdate || !updateOrgRequiredOk}
                          variant="gradient"
                          size="default"
                          animation="scale"
                        >
                          {submittingOrgUpdate ? 'Updating...' : 'Update Organization'}
                        </ConfettiButton>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Create Owner (Onboard) */}
          {view === 'createOwner' && (
            <>
              {!selectedOrg ? (
                renderOrgPicker('Select Organization for Owner')
              ) : (
                <Card className="backdrop-blur-xl bg-white/10 border-white/10 shadow-2xl">
                  <CardHeader className="border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl text-white">Onboard Owner</CardTitle>
                      <div className="flex gap-2">
                        <ConfettiButton
                          variant="outline"
                          size="sm"
                          animation="scale"
                          onClick={() => setSelectedOrg(null)}
                        >
                          Change Organization
                        </ConfettiButton>
                        <ConfettiButton
                          variant="outline"
                          size="sm"
                          animation="scale"
                          onClick={resetAll}
                        >
                          Back
                        </ConfettiButton>
                      </div>
                    </div>
                    <div className="text-xs text-white/70 pt-2">
                      Selected: {selectedOrg.organizationName} • {selectedOrg.organizationId}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={submitCreateOwner} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">Organization ID <span className="text-cyan-300">*</span></Label>
                          <Input value={selectedOrg.organizationId} readOnly disabled className="bg-white/5 border-white/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Employee ID <span className="text-cyan-300">*</span></Label>
                          <Input value={computedCreateOwnerEmpId} readOnly disabled className="bg-white/5 border-white/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Status</Label>
                          <Input value={ownerCreateForm.status || 'ACTIVE'} readOnly disabled className="bg-white/5 border-white/20 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">Role <span className="text-cyan-300">*</span></Label>
                          <Input value={ownerCreateForm.role} onChange={e => updateOwnerCreate('role')(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Department <span className="text-cyan-300">*</span></Label>
                          <Input value={ownerCreateForm.department} onChange={e => updateOwnerCreate('department')(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">First Name <span className="text-cyan-300">*</span></Label>
                          <Input value={ownerCreateForm.firstName} onChange={e => updateOwnerCreate('firstName')(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Last Name <span className="text-cyan-300">*</span></Label>
                          <Input value={ownerCreateForm.lastName} onChange={e => updateOwnerCreate('lastName')(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">Phone</Label>
                          <Input value={ownerCreateForm.phoneNumber || ''} onChange={e => updateOwnerCreate('phoneNumber')(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Email <span className="text-cyan-300">*</span></Label>
                          <Input type="email" value={ownerCreateForm.emailId} onChange={e => updateOwnerCreate('emailId')(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">Username <span className="text-cyan-300">*</span></Label>
                          <Input value={ownerCreateForm.username} onChange={e => updateOwnerCreate('username')(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Password <span className="text-cyan-300">*</span></Label>
                          <Input type="password" value={ownerCreateForm.password} onChange={e => updateOwnerCreate('password')(e.target.value)} />
                        </div>
                      </div>
                      {/* No shift-timing fields here */}
                      <div className="space-y-2">
                        <Label className="text-white/90">Address</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input placeholder="Address Line 1" value={ownerCreateForm.address?.line1 || ''} onChange={e => updateOwnerCreateAddress('line1', e.target.value)} />
                          <Input placeholder="Address Line 2" value={ownerCreateForm.address?.line2 || ''} onChange={e => updateOwnerCreateAddress('line2', e.target.value)} />
                          <Input placeholder="City" value={ownerCreateForm.address?.city || ''} onChange={e => updateOwnerCreateAddress('city', e.target.value)} />
                          <select className="w-full rounded-md border bg-black border-white/20 p-2 text-white"
                            value={ownerCreateForm.address?.state || ''} onChange={e => updateOwnerCreateAddress('state', e.target.value)}>
                            <option value="">Select State</option>
                            {IN_STATES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <Input placeholder="Postal Code" value={ownerCreateForm.address?.postalCode || ''} onChange={e => updateOwnerCreateAddress('postalCode', e.target.value)} />
                          <Input value={ownerCreateForm.address?.country || 'India'} readOnly disabled />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/90">Emergency Contact</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input placeholder="Name" value={ownerCreateForm.emergencyContact?.name || ''} onChange={e => updateOwnerCreateEmergency('name', e.target.value)} />
                          <Input placeholder="Phone" value={ownerCreateForm.emergencyContact?.phone || ''} onChange={e => updateOwnerCreateEmergency('phone', e.target.value)} />
                          <Input placeholder="Relationship" value={ownerCreateForm.emergencyContact?.relationship || ''} onChange={e => updateOwnerCreateEmergency('relationship', e.target.value)} />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <ConfettiButton type="button" variant="outline" size="default" animation="scale" onClick={resetAll}>
                          Cancel
                        </ConfettiButton>
                        <ConfettiButton type="submit" disabled={submittingOwnerCreate || !createOwnerRequiredOk} variant="gradient" size="default" animation="scale">
                          {submittingOwnerCreate ? 'Submitting...' : 'Create Owner'}
                        </ConfettiButton>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Update Owner */}
          {view === 'updateOwner' && (
            <>
              {!selectedOrg ? (
                renderOrgPicker('Select Organization for Owner')
              ) : !selectedEmp ? (
                renderEmpPicker('Select Owner/Employee to Update')
              ) : (
                <Card className="backdrop-blur-xl bg-white/10 border-white/10 shadow-2xl">
                  <CardHeader className="border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl text-white">Update Owner</CardTitle>
                      <div className="flex gap-2">
                        <ConfettiButton variant="outline" size="sm" animation="scale" onClick={() => setSelectedEmp(null)}>
                          Change Employee
                        </ConfettiButton>
                        <ConfettiButton variant="outline" size="sm" animation="scale" onClick={() => setSelectedOrg(null)}>
                          Change Organization
                        </ConfettiButton>
                        <ConfettiButton variant="outline" size="sm" animation="scale" onClick={resetAll}>
                          Back
                        </ConfettiButton>
                      </div>
                    </div>
                    <div className="text-xs text-white/70 pt-2">
                      Selected: {selectedOrg.organizationName} • {selectedEmp.firstName} {selectedEmp.lastName} ({selectedEmp.role})
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={submitUpdateOwner} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">Employee ID</Label>
                          <Input value={selectedEmp.empId} readOnly disabled className="bg-white/5 border-white/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Status</Label>
                          <Input value={ownerUpdateForm.status || 'ACTIVE'} onChange={e => updateOwnerUpdate('status')(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Role</Label>
                          <Input value={ownerUpdateForm.role || ''} onChange={e => updateOwnerUpdate('role')(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">Department</Label>
                          <Input value={ownerUpdateForm.department || ''} onChange={e => updateOwnerUpdate('department')(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">First Name</Label>
                          <Input value={ownerUpdateForm.firstName || ''} onChange={e => updateOwnerUpdate('firstName')(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">Last Name</Label>
                          <Input value={ownerUpdateForm.lastName || ''} onChange={e => updateOwnerUpdate('lastName')(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Phone</Label>
                          <Input value={ownerUpdateForm.phoneNumber || ''} onChange={e => updateOwnerUpdate('phoneNumber')(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">Email</Label>
                          <Input type="email" value={ownerUpdateForm.emailId || ''} onChange={e => updateOwnerUpdate('emailId')(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Username</Label>
                          <Input value={ownerUpdateForm.username || ''} onChange={e => updateOwnerUpdate('username')(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/90">New Password</Label>
                          <Input type="password" value={ownerUpdateForm.newPassword || ''} onChange={e => updateOwnerUpdate('newPassword')(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Shift Start</Label>
                          <Input type="time" value={ownerUpdateForm.shiftTiming?.start || ''} onChange={e => updateOwnerUpdateShift('start', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/90">Shift End</Label>
                          <Input type="time" value={ownerUpdateForm.shiftTiming?.end || ''} onChange={e => updateOwnerUpdateShift('end', e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/90">Address</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input placeholder="Address Line 1" value={ownerUpdateForm.address?.line1 || ''} onChange={e => updateOwnerUpdateAddress('line1', e.target.value)} />
                          <Input placeholder="Address Line 2" value={ownerUpdateForm.address?.line2 || ''} onChange={e => updateOwnerUpdateAddress('line2', e.target.value)} />
                          <Input placeholder="City" value={ownerUpdateForm.address?.city || ''} onChange={e => updateOwnerUpdateAddress('city', e.target.value)} />
                          <select className="w-full rounded-md border bg-black border-white/20 p-2 text-white"
                            value={ownerUpdateForm.address?.state || ''} onChange={e => updateOwnerUpdateAddress('state', e.target.value)}>
                            <option value="">Select State</option>
                            {IN_STATES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <Input placeholder="Postal Code" value={ownerUpdateForm.address?.postalCode || ''} onChange={e => updateOwnerUpdateAddress('postalCode', e.target.value)} />
                          <Input value={ownerUpdateForm.address?.country || 'India'} readOnly disabled />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/90">Emergency Contact</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input placeholder="Name" value={ownerUpdateForm.emergencyContact?.name || ''} onChange={e => updateOwnerUpdateEmergency('name', e.target.value)} />
                          <Input placeholder="Phone" value={ownerUpdateForm.emergencyContact?.phone || ''} onChange={e => updateOwnerUpdateEmergency('phone', e.target.value)} />
                          <Input placeholder="Relationship" value={ownerUpdateForm.emergencyContact?.relationship || ''} onChange={e => updateOwnerUpdateEmergency('relationship', e.target.value)} />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <ConfettiButton type="button" variant="outline" size="default" animation="scale" onClick={resetAll}>
                          Cancel
                        </ConfettiButton>
                        <ConfettiButton type="submit" disabled={submittingOwnerUpdate || !updateOwnerRequiredOk} variant="gradient" size="default" animation="scale">
                          {submittingOwnerUpdate ? 'Submitting...' : 'Update Owner'}
                        </ConfettiButton>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
