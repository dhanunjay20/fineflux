// src/pages/OnboardOrganization.tsx
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080';

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

const IN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha',
  'Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
];

// Org ID: initials from each word + "-" + 4-digit random (0000–9999)
const makeOrgId = (name: string) => {
  const initials = (name || '').trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase();
  const rand = Math.floor(Math.random() * 10000);
  const suffix = String(rand).padStart(4, '0');
  return `${initials}-${suffix}`;
};

const orgLetters = (orgId: string) => (orgId.match(/[A-Za-z]+/g)?.join('') || '').toUpperCase();

export default function OnboardOrganization() {
  const { toast } = useToast();

  // Step control
  const [orgSubmitted, setOrgSubmitted] = useState(false);
  const [showOwnerForm, setShowOwnerForm] = useState(false);

  // Organization form
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

  // Live generated organizationId from org name
  const derivedOrgId = useMemo(() => {
    if (!orgForm.organizationName.trim()) return '';
    return makeOrgId(orgForm.organizationName);
  }, [orgForm.organizationName]);

  const updateOrg =
    <K extends keyof OrganizationCreateRequest>(k: K) =>
    (v: OrganizationCreateRequest[K]) =>
      setOrgForm((p) => ({ ...p, [k]: v }));

  const [submittingOrg, setSubmittingOrg] = useState(false);

  const submitOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    // Required fields validation (client-side)
    const required: Array<[string, string]> = [
      ['Organization ID', derivedOrgId || orgForm.organizationId],
      ['Organization Name', orgForm.organizationName],
      ['Address Line 1', orgForm.address1],
      ['City', orgForm.city],
      ['State', orgForm.state],
      ['Country', orgForm.country],
      ['Postal Code', orgForm.postalCode],
      ['Owner First Name', orgForm.ownerFirstName],
      ['Owner Last Name', orgForm.ownerLastName],
    ];
    for (const [label, value] of required) {
      if (!String(value || '').trim()) {
        toast({ title: 'Validation', description: `${label} is required.`, variant: 'destructive' });
        return;
      }
    }

    try {
      setSubmittingOrg(true);
      const payload: OrganizationCreateRequest = {
        ...orgForm,
        organizationId: derivedOrgId || orgForm.organizationId,
      };
      await axios.post(`${API_BASE}/api/organizations`, payload, { timeout: 15000 });
      toast({ title: 'Organization created', description: 'Onboarding completed successfully.' });
      localStorage.setItem('organizationId', payload.organizationId);
      setOrgSubmitted(true);
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

  // Owner form (opens after org submit)
  const storedOrgId = useMemo(() => localStorage.getItem('organizationId') || '', [orgSubmitted, showOwnerForm]);

  const [ownerForm, setOwnerForm] = useState<EmployeeCreateRequest>({
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
    shiftTiming: { start: '', end: '' },
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
    emergencyContact: { name: '', phone: '', relationship: '' },
  });

  // Compute owner empId as ORG_LETTERS + EMP + 0001
  const computedEmpId = useMemo(() => {
    const org = storedOrgId || orgForm.organizationId || derivedOrgId;
    return org ? `${orgLetters(org)}EMP0001` : '';
  }, [storedOrgId, orgForm.organizationId, derivedOrgId]);

  // Sync owner IDs when owner form is shown
  useEffect(() => {
    if (!showOwnerForm) return;
    setOwnerForm((p) => ({
      ...p,
      organizationId: storedOrgId || p.organizationId,
      empId: computedEmpId || p.empId,
      status: (p.status || 'ACTIVE').toUpperCase(),
      role: p.role || 'Owner',
      department: p.department || 'Management',
      address: { ...(p.address || {}), country: p.address?.country || 'India' },
    }));
  }, [showOwnerForm, storedOrgId, computedEmpId]);

  const updateOwner =
    <K extends keyof EmployeeCreateRequest>(k: K) =>
    (v: EmployeeCreateRequest[K]) =>
      setOwnerForm((p) => ({ ...p, [k]: v }));

  const updateOwnerAddress = (k: keyof NonNullable<EmployeeCreateRequest['address']>, v: string) =>
    setOwnerForm((p) => ({ ...p, address: { ...(p.address || {}), [k]: v } }));

  const updateOwnerShift = (k: keyof NonNullable<EmployeeCreateRequest['shiftTiming']>, v: string) =>
    setOwnerForm((p) => ({ ...p, shiftTiming: { ...(p.shiftTiming || {}), [k]: v } }));

  const updateOwnerEmergency = (k: keyof NonNullable<EmployeeCreateRequest['emergencyContact']>, v: string) =>
    setOwnerForm((p) => ({ ...p, emergencyContact: { ...(p.emergencyContact || {}), [k]: v } }));

  const [submittingOwner, setSubmittingOwner] = useState(false);

  const submitOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EmployeeCreateRequest = {
      ...ownerForm,
      organizationId: storedOrgId || ownerForm.organizationId,
      empId: computedEmpId || ownerForm.empId,
      status: (ownerForm.status || 'ACTIVE').toUpperCase(),
      address: { ...(ownerForm.address || {}), country: ownerForm.address?.country || 'India' },
    };

    const required: Array<[string, string]> = [
      ['Organization ID', payload.organizationId],
      ['Employee ID', payload.empId],
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
      setSubmittingOwner(true);
      await axios.post(
        `${API_BASE}/api/organizations/${encodeURIComponent(payload.organizationId)}/employees`,
        payload,
        { timeout: 15000 },
      );
      toast({ title: 'Owner created', description: `Owner ${payload.firstName} ${payload.lastName} onboarded.` });
      // Clear local storage after owner registration completes
      localStorage.removeItem('organizationId');
      setShowOwnerForm(false);
    } catch (err: any) {
      toast({
        title: 'Create failed',
        description: err?.response?.data?.message || 'Unable to create owner.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingOwner(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Step 1: Organization Onboarding */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Onboard Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitOrganization} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="organizationName">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="organizationName"
                  value={orgForm.organizationName}
                  onChange={(e) => updateOrg('organizationName')(e.target.value)}
                  placeholder="FineFlux Fuel Station"
                  required
                  aria-required="true"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationId">
                  Organization ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="organizationId"
                  value={derivedOrgId || ''}
                  readOnly
                  disabled
                  placeholder="Auto-generated"
                  required
                  aria-required="true"
                  className="bg-muted/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={orgForm.gstNumber || ''}
                  onChange={(e) => updateOrg('gstNumber')(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={orgForm.licenseNumber || ''}
                  onChange={(e) => updateOrg('licenseNumber')(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={orgForm.email || ''}
                  onChange={(e) => updateOrg('email')(e.target.value)}
                  placeholder="info@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Address Line 1"
                  value={orgForm.address1}
                  onChange={(e) => updateOrg('address1')(e.target.value)}
                  required
                  aria-required="true"
                />
                <Input
                  placeholder="Address Line 2"
                  value={orgForm.address2 || ''}
                  onChange={(e) => updateOrg('address2')(e.target.value)}
                />
                <Input
                  placeholder="City"
                  value={orgForm.city}
                  onChange={(e) => updateOrg('city')(e.target.value)}
                  required
                  aria-required="true"
                />
                <select
                  className="w-full rounded-md border border-border bg-background p-2"
                  value={orgForm.state}
                  onChange={(e) => updateOrg('state')(e.target.value)}
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
                  onChange={(e) => updateOrg('postalCode')(e.target.value)}
                  required
                  aria-required="true"
                />
                <Input
                  value={orgForm.country}
                  onChange={(e) => updateOrg('country')(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={orgForm.phoneNumber || ''}
                  onChange={(e) => updateOrg('phoneNumber')(e.target.value)}
                  placeholder="+91 90000 00000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerFirstName">
                  Owner First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ownerFirstName"
                  value={orgForm.ownerFirstName}
                  onChange={(e) => updateOrg('ownerFirstName')(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerLastName">
                  Owner Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ownerLastName"
                  value={orgForm.ownerLastName}
                  onChange={(e) => updateOrg('ownerLastName')(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="submit" className="btn-gradient-primary" disabled={submittingOrg}>
                {submittingOrg ? 'Submitting...' : 'Create Organization'}
              </Button>
            </div>
          </form>

          {orgSubmitted && (
            <div className="mt-6 flex items-center justify-between rounded-md border p-4">
              <div className="text-sm text-muted-foreground">
                Organization created with ID: <span className="font-medium">{localStorage.getItem('organizationId') || derivedOrgId}</span>
              </div>
              <Button onClick={() => setShowOwnerForm(true)}>
                Onboard Owner
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Owner Onboarding (visible after org submit) */}
      {showOwnerForm && (
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle>Onboard Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitOwner} className="space-y-6">
              {/* IDs and status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerOrgId">Organization ID <span className="text-destructive">*</span></Label>
                  <Input id="ownerOrgId" value={storedOrgId} readOnly disabled required aria-required="true" className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empId">Employee ID <span className="text-destructive">*</span></Label>
                  <Input id="empId" value={computedEmpId} readOnly disabled required aria-required="true" className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Input id="status" value={ownerForm.status || 'ACTIVE'} readOnly disabled className="bg-muted/50" />
                </div>
              </div>

              {/* Role / Dept */}
              <div className="grid grid-cols-1 md/grid-cols-2 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">Role <span className="text-destructive">*</span></Label>
                  <Input id="role" value={ownerForm.role} onChange={(e) => updateOwner('role')(e.target.value)} required aria-required="true" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
                  <Input id="department" value={ownerForm.department} onChange={(e) => updateOwner('department')(e.target.value)} required aria-required="true" />
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                  <Input id="firstName" value={ownerForm.firstName} onChange={(e) => updateOwner('firstName')(e.target.value)} required aria-required="true" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                  <Input id="lastName" value={ownerForm.lastName} onChange={(e) => updateOwner('lastName')(e.target.value)} required aria-required="true" />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone</Label>
                  <Input id="phoneNumber" value={ownerForm.phoneNumber || ''} onChange={(e) => updateOwner('phoneNumber')(e.target.value)} placeholder="+91 90000 00000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailId">Email <span className="text-destructive">*</span></Label>
                  <Input id="emailId" type="email" value={ownerForm.emailId} onChange={(e) => updateOwner('emailId')(e.target.value)} required aria-required="true" />
                </div>
              </div>

              {/* Auth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                  <Input id="username" value={ownerForm.username} onChange={(e) => updateOwner('username')(e.target.value)} required aria-required="true" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                  <Input id="password" type="password" value={ownerForm.password} onChange={(e) => updateOwner('password')(e.target.value)} required aria-required="true" />
                </div>
              </div>

              {/* Shift */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Shift Start</Label>
                  <Input id="start" type="time" value={ownerForm.shiftTiming?.start || ''} onChange={(e) => updateOwnerShift('start', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Shift End</Label>
                  <Input id="end" type="time" value={ownerForm.shiftTiming?.end || ''} onChange={(e) => updateOwnerShift('end', e.target.value)} />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label>Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Address Line 1" value={ownerForm.address?.line1 || ''} onChange={(e) => updateOwnerAddress('line1', e.target.value)} />
                  <Input placeholder="Address Line 2" value={ownerForm.address?.line2 || ''} onChange={(e) => updateOwnerAddress('line2', e.target.value)} />
                  <Input placeholder="City" value={ownerForm.address?.city || ''} onChange={(e) => updateOwnerAddress('city', e.target.value)} />
                  <select className="w-full rounded-md border border-border bg-background p-2" value={ownerForm.address?.state || ''} onChange={(e) => updateOwnerAddress('state', e.target.value)}>
                    <option value="">Select State</option>
                    {IN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Input placeholder="Postal Code" value={ownerForm.address?.postalCode || ''} onChange={(e) => updateOwnerAddress('postalCode', e.target.value)} />
                  <Input value={ownerForm.address?.country || 'India'} readOnly disabled />
                </div>
              </div>

              {/* Emergency */}
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="Name" value={ownerForm.emergencyContact?.name || ''} onChange={(e) => updateOwnerEmergency('name', e.target.value)} />
                  <Input placeholder="Phone" value={ownerForm.emergencyContact?.phone || ''} onChange={(e) => updateOwnerEmergency('phone', e.target.value)} />
                  <Input placeholder="Relationship" value={ownerForm.emergencyContact?.relationship || ''} onChange={(e) => updateOwnerEmergency('relationship', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowOwnerForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient-primary" disabled={submittingOwner}>
                  {submittingOwner ? 'Submitting...' : 'Create Owner'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
