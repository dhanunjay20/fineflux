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
  IndianRupee,
  Calendar,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  History as HistoryIcon,
  CreditCard,
  ArrowUpDown,
  Trash2,
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

// API base (safe dev fallback)
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'https://finflux-64307221061.asia-south1.run.app';

// Types
type Customer = {
  id?: string;
  custId?: string;
  customerName: string;
  customerVehicleNum?: string;
  empId?: string;
  amountBorrowed?: number;
  borrowDate?: string;
  dueDate?: string;
  status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

type CustomerCreateRequest = {
  organizationId: string;
  custId?: string;
  customerName: string;
  customerVehicleNum: string;
  empId: string;
  amountBorrowed: number;
  borrowDate: string;
  dueDate: string;
  status: 'PENDING' | 'PARTIAL' | 'OVERDUE';
  phoneNumber?: string;
  email?: string;
  notes?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

type HistoryTransaction = {
  id?: string;
  custId: string;
  transactionAmount: number; // +payment, -borrow
  transactionDate: string;
  cumulativeAmount?: number;
  notes?: string;
};

type HistoryPage = {
  content: HistoryTransaction[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
};

type TransactionRequest = {
  custId: string;
  transactionAmount: number; // +payment, -borrow
  notes?: string;
};

// Indian States/UTs
const IN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function Borrowers() {
  const { toast } = useToast();

  // Org and employee identifiers from storage
  const [orgId, setOrgId] = useState<string>('');
  const [empId, setEmpId] = useState<string>('');
  useEffect(() => {
    const storedOrg = localStorage.getItem('organizationId') || '';
    const storedEmp = localStorage.getItem('empId') || '';
    setOrgId(storedOrg);
    setEmpId(storedEmp);
  }, []);

  // Search/filter
  const [search, setSearch] = useState('');

  // Add borrower modal state
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<CustomerCreateRequest>({
    organizationId: '',
    customerName: '',
    customerVehicleNum: '',
    empId: '',
    amountBorrowed: 0,
    borrowDate: today,
    dueDate: today,
    status: 'PENDING',
    phoneNumber: '',
    email: '',
    notes: '',
    address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
  });
  const [submitting, setSubmitting] = useState(false);

  // History modal state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyData, setHistoryData] = useState<HistoryPage | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Transaction modal state
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transactionForm, setTransactionForm] = useState<TransactionRequest>({
    custId: '',
    transactionAmount: 0,
    notes: '',
  });
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBorrower, setDeletingBorrower] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch all borrowers for the org (resilient unwrapping)
  const fetchCustomers = async (): Promise<Customer[]> => {
    const url = `${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/customers`;
    const res = await axios.get(url, { timeout: 20000 });
    const data = res.data;
    if (Array.isArray(data)) return data as Customer[];
    const candidates = ['data', 'items', 'content', 'result', 'results', 'records', 'rows'];
    for (const key of candidates) {
      if (Array.isArray((data as any)?.[key])) return (data as any)[key] as Customer[];
    }
    const firstArray = Object.values(data || {}).find((v) => Array.isArray(v)) as Customer[] | undefined;
    if (Array.isArray(firstArray)) return firstArray;
    return [];
  };

  const { data: customers = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: fetchCustomers,
    enabled: !!orgId,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // Filtered and grouped views
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const fields = [
        c.customerName,
        c.customerVehicleNum,
        c.phoneNumber,
        c.email,
        c.status,
        c.empId,
        c.custId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return fields.includes(q);
    });
  }, [customers, search]);

  const groupByStatus = useMemo(() => {
    const norm = (s?: string) => (s || '').toUpperCase();
    const groups = {
      OVERDUE: [] as Customer[],
      PENDING: [] as Customer[],
      PARTIAL: [] as Customer[],
      PAID: [] as Customer[],
      OTHER: [] as Customer[],
    };
    for (const c of filtered) {
      const s = norm(c.status);
      if (s === 'OVERDUE') groups.OVERDUE.push(c);
      else if (s === 'PENDING') groups.PENDING.push(c);
      else if (s === 'PARTIAL') groups.PARTIAL.push(c);
      else if (s === 'PAID') groups.PAID.push(c);
      else groups.OTHER.push(c);
    }
    return groups;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const total = customers.length;
    const totalBorrowed = customers.reduce((sum, c) => sum + (Number(c.amountBorrowed) || 0), 0);
    const overdueCount = customers.filter((c) => (c.status || '').toUpperCase() === 'OVERDUE').length;
    const pendingCount = customers.filter((c) => (c.status || '').toUpperCase() === 'PENDING').length;
    const partialCount = customers.filter((c) => (c.status || '').toUpperCase() === 'PARTIAL').length;
    const paidCount = customers.filter((c) => (c.status || '').toUpperCase() === 'PAID').length;
    return [
      { title: 'Total Borrowers', value: total.toString(), change: 'Active records', icon: Users, color: 'text-primary', bgColor: 'bg-primary-soft' },
      { title: 'Total Borrowed', value: `₹${totalBorrowed.toLocaleString()}`, change: 'Sum of principal', icon: IndianRupee, color: 'text-accent', bgColor: 'bg-accent-soft' },
      { title: 'Overdue', value: overdueCount.toString(), change: 'Need attention', icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
      { title: 'Pending/Partial/Paid', value: `${pendingCount}/${partialCount}/${paidCount}`, change: 'By status', icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/10' },
    ];
  }, [customers]);

  // Recent borrow events
  const recentEvents = useMemo(() => {
    const events = customers
      .map((c) => ({
        type: 'loan' as const,
        borrower: c.customerName,
        amount: Number(c.amountBorrowed) || 0,
        date: c.borrowDate || '',
      }))
      .filter((e) => e.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    return events;
  }, [customers]);

  // Form helpers
  const updateField =
    <K extends keyof CustomerCreateRequest>(key: K) =>
    (value: CustomerCreateRequest[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const updateAddress = (k: keyof NonNullable<CustomerCreateRequest['address']>, v: string) => {
    setForm((prev) => ({ ...prev, address: { ...(prev.address || {}), [k]: v } }));
  };

  // Generate custId based on orgId + first 2 letters of name + 4-digit sequence
  const generateCustId = (customerName: string, existingCustomers: Customer[]) => {
    const namePrefix = customerName.trim().toUpperCase().slice(0, 2).padEnd(2, 'X');
    const basePrefix = `${orgId}${namePrefix}`;
    const existingWithPrefix = existingCustomers.filter((c) => c.custId?.startsWith(basePrefix));
    let maxSequence = 0;
    existingWithPrefix.forEach((c) => {
      const custId = c.custId || '';
      const sequencePart = custId.slice(basePrefix.length);
      const sequenceNum = parseInt(sequencePart, 10);
      if (!isNaN(sequenceNum) && sequenceNum > maxSequence) maxSequence = sequenceNum;
    });
    const nextSequence = (maxSequence + 1).toString().padStart(4, '0');
    return `${basePrefix}${nextSequence}`;
  };

  // Submit Add Borrower
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const generatedCustId = generateCustId(form.customerName, customers);
    const payload: CustomerCreateRequest = {
      ...form,
      custId: generatedCustId,
      organizationId: orgId || form.organizationId || '',
      empId: form.empId || empId || '',
      address: { ...(form.address || {}), country: 'India' },
    };
    if (
      !payload.customerName.trim() ||
      !payload.customerVehicleNum.trim() ||
      !payload.empId.trim() ||
      !(payload.amountBorrowed > 0) ||
      !payload.borrowDate ||
      !payload.dueDate
    ) {
      toast({
        title: 'Validation error',
        description: 'All required fields must be filled.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE}/api/organizations/${encodeURIComponent(payload.organizationId)}/customers`,
        payload,
        { timeout: 20000 }
      );
      await axios.post(
        `${API_BASE}/api/organizations/${encodeURIComponent(payload.organizationId)}/customers/history`,
        {
          custId: generatedCustId,
          transactionAmount: -Math.abs(payload.amountBorrowed),
          notes: 'Opening balance on customer creation',
        },
        { timeout: 20000 }
      );
      toast({ title: 'Saved', description: `Borrower created successfully with ID: ${generatedCustId}` });
      setForm((prev) => ({
        ...prev,
        customerName: '',
        customerVehicleNum: '',
        empId: payload.empId,
        amountBorrowed: 0,
        borrowDate: today,
        dueDate: today,
        status: 'PENDING',
        phoneNumber: '',
        email: '',
        notes: '',
        address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' },
      }));
      await refetch();
      setOpen(false);
    } catch (err: any) {
      toast({
        title: 'Submission failed',
        description: err?.response?.data?.message || `Could not create borrower.`,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Borrower
  const handlePromptDelete = (customer: Customer) => {
    setDeletingBorrower(customer);
    setDeleteOpen(true);
  };

  const handleDeleteBorrower = async () => {
    if (!deletingBorrower?.custId) return;
    setDeleteLoading(true);
    try {
      await axios.delete(
        `${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/customers/${encodeURIComponent(deletingBorrower.custId)}`
      );
      toast({ title: 'Deleted', description: `Borrower ${deletingBorrower.customerName} deleted.` });
      await refetch();
      setDeleteOpen(false);
      setDeletingBorrower(null);
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err?.response?.data?.message || 'Could not delete borrower.',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Transaction Modal handlers
  const handleOpenTransaction = (customer: Customer) => {
    setSelectedCustomer(customer);
    setTransactionForm({
      custId: customer.custId || '',
      transactionAmount: 0,
      notes: '',
    });
    setTransactionOpen(true);
  };

  const onTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.custId || transactionForm.transactionAmount === 0) {
      toast({
        title: 'Validation error',
        description: 'Customer ID and non-zero amount required.',
        variant: 'destructive',
      });
      return;
    }
    setTransactionSubmitting(true);
    try {
      await axios.post(
        `${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/customers/history`,
        transactionForm,
        { timeout: 20000 }
      );
      toast({ title: 'Success', description: 'Transaction recorded successfully.' });
      await refetch();
      setTransactionOpen(false);
      if (historyOpen && selectedCustomer?.custId === transactionForm.custId) {
        fetchHistory(transactionForm.custId, historyPage);
      }
    } catch (err: any) {
      toast({
        title: 'Transaction failed',
        description: err?.response?.data?.message || `Could not record transaction.`,
        variant: 'destructive',
      });
    } finally {
      setTransactionSubmitting(false);
    }
  };

  // History Modal handlers
  const fetchHistory = async (custId: string, page: number = 0) => {
    setHistoryLoading(true);
    try {
      const url = `${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/customers/history?custId=${encodeURIComponent(
        custId
      )}&page=${page}&size=50`;
      const res = await axios.get(url, { timeout: 20000 });
      setHistoryData(res.data);
    } catch (err: any) {
      toast({
        title: 'History fetch failed',
        description: err?.response?.data?.message || 'Could not load transaction history.',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryPage(0);
    setHistoryOpen(true);
    if (customer.custId) fetchHistory(customer.custId, 0);
  };

  // Render
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Delete Modal */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeletingBorrower(null); }}>
        <DialogOverlay className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogContent
          className="
            fixed left-1/2 top-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2
            w-[96vw] sm:w-[90vw] md:w-[70vw] lg:w-[50vw] xl:w-[40vw]
            max-w-3xl p-0 sm:rounded-lg shadow-xl
            data-[state=open]:animate-in data-[state=closed]:animate-out
          "
        >
          <div className="max-h-[85vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Delete Borrower?</DialogTitle>
              </DialogHeader>
              <div className="pt-2">
                Are you sure you want to permanently delete borrower <b>{deletingBorrower?.customerName}</b> ({deletingBorrower?.custId})? This cannot be undone. 
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 z-[2] border-t border-border bg-background/95 backdrop-blur px-4 py-3 sm:px-6">
              <div className="flex w-full items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteBorrower} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Borrower Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogOverlay className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogContent
          className="
            fixed left-1/2 top-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2
            w-[96vw] sm:w-[92vw] md:w-[86vw] lg:w-[70vw] xl:w-[60vw]
            max-w-5xl p-0 sm:rounded-lg shadow-xl
            data-[state=open]:animate-in data-[state=closed]:animate-out
          "
        >
          <div className="max-h-[85vh] overflow-y-auto">
            <div className="p-4 sm:p-6 md:p-8">
              <DialogHeader>
                <DialogTitle>Add New Borrower</DialogTitle>
                <DialogDescription>Fill in the required details to create a borrower record.</DialogDescription>
              </DialogHeader>

              <form onSubmit={onSubmit} className="space-y-4">
                {/* Organization ID (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="organizationId">Organization ID <span className="text-destructive">*</span></Label>
                  <Input id="organizationId" value={orgId} readOnly disabled className="bg-muted/50" required />
                </div>

                {/* Name / Vehicle / Employee (empId read-only) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="customerName"
                      value={form.customerName}
                      onChange={(e) => updateField('customerName')(e.target.value)}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerVehicleNum">Vehicle Number <span className="text-destructive">*</span></Label>
                    <Input
                      id="customerVehicleNum"
                      value={form.customerVehicleNum}
                      onChange={(e) => updateField('customerVehicleNum')((e.target.value || '').toUpperCase())}
                      placeholder="e.g., KA01AB1234"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empId">Employee ID <span className="text-destructive">*</span></Label>
                    <Input id="empId" value={form.empId || empId} readOnly disabled placeholder="Employee ID" required />
                  </div>
                </div>

                {/* Amount / Borrow Date / Due Date */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="amountBorrowed">Amount Borrowed <span className="text-destructive">*</span></Label>
                    <Input
                      id="amountBorrowed"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amountBorrowed}
                      onChange={(e) => updateField('amountBorrowed')(Number(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="borrowDate">Borrow Date <span className="text-destructive">*</span></Label>
                    <Input
                      id="borrowDate"
                      type="date"
                      value={form.borrowDate}
                      onChange={(e) => updateField('borrowDate')(e.target.value)}
                      max={today}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date <span className="text-destructive">*</span></Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => updateField('dueDate')(e.target.value)}
                      min={today}
                      required
                    />
                  </div>
                </div>

                {/* Status / Phone / Email */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                    <select
                      id="status"
                      className="w-full rounded-md border border-border bg-background p-2"
                      value={form.status}
                      onChange={(e) => updateField('status')(e.target.value as CustomerCreateRequest['status'])}
                      required
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="PARTIAL">PARTIAL</option>
                      <option value="OVERDUE">OVERDUE</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={form.phoneNumber || ''}
                      onChange={(e) => updateField('phoneNumber')(e.target.value)}
                      placeholder="+91 90000 00000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => updateField('email')(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                {/* Address with State selector and Country read-only */}
                <div className="space-y-2">
                  <Label>Address <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      placeholder="Address Line 1"
                      value={form.address?.line1 || ''}
                      onChange={(e) => updateAddress('line1', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Address Line 2"
                      value={form.address?.line2 || ''}
                      onChange={(e) => updateAddress('line2', e.target.value)}
                    />
                    <Input
                      placeholder="City"
                      value={form.address?.city || ''}
                      onChange={(e) => updateAddress('city', e.target.value)}
                      required
                    />
                    {/* State dropdown */}
                    <select
                      className="w-full rounded-md border border-border bg-background p-2"
                      value={form.address?.state || ''}
                      onChange={(e) => updateAddress('state', e.target.value)}
                      required
                    >
                      <option value="">Select State</option>
                      {IN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="Postal Code"
                      value={form.address?.postalCode || ''}
                      onChange={(e) => updateAddress('postalCode', e.target.value)}
                      required
                    />
                    {/* Country read-only */}
                    <Input value={form.address?.country || 'India'} readOnly disabled />
                  </div>
                </div>
              </form>
            </div>

            {/* Sticky footer */}
            <DialogFooter className="sticky bottom-0 z-[2] border-t border-border bg-background/95 backdrop-blur px-4 py-3 sm:px-6 md:px-8">
              <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={submitting} onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="btn-gradient-primary"
                    disabled={submitting}
                    onClick={(e) => {
                      const formEl = (e.currentTarget.closest('[role="dialog"]') as HTMLElement)?.querySelector('form') as HTMLFormElement | null;
                      formEl?.requestSubmit();
                    }}
                  >
                    {submitting ? 'Saving...' : 'Save Borrower'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog
        open={historyOpen}
        onOpenChange={(v) => {
          setHistoryOpen(v);
          if (!v) {
            setSelectedCustomer(null);
            setHistoryData(null);
          }
        }}
      >
        <DialogOverlay className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogContent
          className="
            fixed left-1/2 top-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2
            w-[96vw] sm:w-[92vw] md:w-[86vw] lg:w-[80vw] xl:w-[70vw]
            max-w-6xl p-0 sm:rounded-lg shadow-xl
            data-[state=open]:animate-in data-[state=closed]:animate-out
          "
        >
          <div className="max-h-[85vh] overflow-y-auto">
            <div className="p-4 sm:p-6 md:p-8">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5" />
                  Transaction History
                </DialogTitle>
                <DialogDescription>
                  {selectedCustomer
                    ? <>Transaction history for {selectedCustomer.customerName} ({selectedCustomer.custId})</>
                    : 'Loading customer information...'}
                </DialogDescription>
              </DialogHeader>

              {historyLoading && (
                <div className="text-muted-foreground p-4">Loading transaction history...</div>
              )}

              {!historyLoading && historyData && (
                <div className="space-y-4">
                  {historyData.content.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {historyData.content.map((transaction, idx) => {
                          const isPayment = transaction.transactionAmount >= 0;
                          const absAmt = Math.abs(Number(transaction.transactionAmount));
                          return (
                            <div
                              key={transaction.id || `${transaction.custId}-${transaction.transactionDate}-${idx}`}
                              className="flex items-center justify-between rounded-lg bg-muted/30 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`rounded-lg p-2 ${isPayment ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>
                                  {isPayment ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {isPayment ? 'Payment Received' : 'Additional Borrowed'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{new Date(transaction.transactionDate).toLocaleString()}</p>
                                  {transaction.notes && (
                                    <p className="text-sm text-muted-foreground italic">{transaction.notes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-semibold ${isPayment ? 'text-success' : 'text-warning'}`}>
                                  {isPayment ? '−' : '+'}₹{absAmt.toLocaleString()}
                                </p>
                                {typeof transaction.cumulativeAmount === 'number' && (
                                  <p className="text-xs text-muted-foreground">
                                    Balance: ₹{Number(transaction.cumulativeAmount).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {historyData.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-muted-foreground">
                            Page {historyData.number + 1} of {historyData.totalPages} ({historyData.totalElements} total)
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={historyData.first || historyLoading}
                              onClick={() => {
                                if (selectedCustomer?.custId) {
                                  setHistoryPage(historyPage - 1);
                                  fetchHistory(selectedCustomer.custId, historyPage - 1);
                                }
                              }}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={historyData.last || historyLoading}
                              onClick={() => {
                                if (selectedCustomer?.custId) {
                                  setHistoryPage(historyPage + 1);
                                  fetchHistory(selectedCustomer.custId, historyPage + 1);
                                }
                              }}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4">
                      No transaction history available for this customer.
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="sticky bottom-0 z-[2] border-t border-border bg-background/95 backdrop-blur px-4 py-3 sm:px-6 md:px-8">
              <div className="flex w-full items-center justify-end">
                <Button variant="outline" onClick={() => setHistoryOpen(false)}>Close</Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog open={transactionOpen} onOpenChange={setTransactionOpen}>
        <DialogOverlay className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogContent
          className="
            fixed left-1/2 top-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2
            w-[96vw] sm:w-[90vw] md:w-[80vw] lg:w-[60vw] xl:w-[50vw]
            max-w-3xl p-0 sm:rounded-lg shadow-xl
            data-[state=open]:animate-in data-[state=closed]:animate-out
          "
        >
          <div className="max-h-[85vh] overflow-y-auto">
            <div className="p-4 sm:p-6 md:p-8">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Record Transaction
                </DialogTitle>
                <DialogDescription>
                  {selectedCustomer ? (
                    <>Record a payment or additional borrow for {selectedCustomer.customerName} ({selectedCustomer.custId})</>
                  ) : (
                    'Loading customer information...'
                  )}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={onTransactionSubmit} className="space-y-4">
                {/* Customer ID (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="transactionCustId">Customer ID <span className="text-destructive">*</span></Label>
                  <Input id="transactionCustId" value={transactionForm.custId} readOnly disabled className="bg-muted/50" required />
                </div>

                {/* Transaction Type and Amount */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Transaction Type</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={transactionForm.transactionAmount >= 0 ? 'default' : 'outline'}
                        className="h-20 flex-col gap-2"
                        onClick={() => {
                          setTransactionForm((prev) => ({
                            ...prev,
                            transactionAmount: Math.abs(prev.transactionAmount),
                          }));
                        }}
                      >
                        <TrendingUp className="h-6 w-6" />
                        Payment Received
                      </Button>
                      <Button
                        type="button"
                        variant={transactionForm.transactionAmount < 0 ? 'default' : 'outline'}
                        className="h-20 flex-col gap-2"
                        onClick={() => {
                          setTransactionForm((prev) => ({
                            ...prev,
                            transactionAmount: -Math.abs(prev.transactionAmount),
                          }));
                        }}
                      >
                        <TrendingDown className="h-6 w-6" />
                        Extra Borrowed
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transactionAmount">Amount <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        id="transactionAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={Math.abs(transactionForm.transactionAmount)}
                        onChange={(e) => {
                          const absValue = Math.abs(Number(e.target.value));
                          setTransactionForm((prev) => ({
                            ...prev,
                            transactionAmount: prev.transactionAmount < 0 ? -absValue : absValue,
                          }));
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0.00"
                        required
                        aria-required="true"
                        className="pl-8"
                      />
                      <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    {/* UI display rule */}
                    <p className="text-sm text-muted-foreground">
                      {transactionForm.transactionAmount < 0 ? (
                        <span className="text-warning">This will be recorded as additional borrowing (+₹{Math.abs(transactionForm.transactionAmount).toLocaleString()})</span>
                      ) : (
                        <span className="text-success">This will be recorded as a payment (−₹{Math.abs(transactionForm.transactionAmount).toLocaleString()})</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="transactionNotes">Notes</Label>
                  <textarea
                    id="transactionNotes"
                    value={transactionForm.notes || ''}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional transaction notes"
                    className="min-h-[80px] w-full rounded-md border border-border bg-background p-2"
                  />
                </div>
              </form>
            </div>

            {/* Sticky footer */}
            <DialogFooter className="sticky bottom-0 z-[2] border-t border-border bg-background/95 backdrop-blur px-4 py-3 sm:px-6 md:px-8">
              <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  This transaction will update the customer's balance immediately.
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={transactionSubmitting} onClick={() => setTransactionOpen(false)}>
                    Close
                  </Button>
                  <Button
                    type="submit"
                    className="btn-gradient-primary"
                    disabled={transactionSubmitting}
                    onClick={(e) => {
                      const formEl = (e.currentTarget.closest('[role="dialog"]') as HTMLElement)?.querySelector('form') as HTMLFormElement | null;
                      formEl?.requestSubmit();
                    }}
                  >
                    {transactionSubmitting ? 'Recording...' : 'Record Transaction'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Borrower Management</h1>
          <p className="text-muted-foreground">Track loans and manage customer credit</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching || !orgId}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button className="btn-gradient-primary w-full sm:w-auto" onClick={() => setOpen(true)} disabled={!orgId}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Borrower
          </Button>
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-muted-foreground">Loading borrowers...</div>
          </CardContent>
        </Card>
      )}
      {isError && (
        <Card>
          <CardContent className="p-6">
            <div className="text-destructive">
              Failed to load customers{error instanceof Error ? `: ${error.message}` : ''}.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="stat-card hover-lift">
                <CardContent className="p-5 sm:p-6">
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
      )}

      {/* Borrower Accounts (segregated by status) */}
      {!isLoading && !isError && (
        <Card className="card-gradient">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Borrower Accounts</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, vehicle, phone, email..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Overdue */}
            {groupByStatus.OVERDUE.length > 0 && (
              <Section title="Overdue" icon={<AlertTriangle className="h-4 w-4 text-destructive" />}>
                {groupByStatus.OVERDUE.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId || `${c.customerName}-${c.customerVehicleNum || ''}`}
                    c={c}
                    onHistory={handleOpenHistory}
                    onTransaction={handleOpenTransaction}
                    onDelete={handlePromptDelete}
                  />
                ))}
              </Section>
            )}

            {/* Pending */}
            {groupByStatus.PENDING.length > 0 && (
              <Section title="Pending" icon={<Clock className="h-4 w-4 text-warning" />}>
                {groupByStatus.PENDING.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId || `${c.customerName}-${c.customerVehicleNum || ''}`}
                    c={c}
                    onHistory={handleOpenHistory}
                    onTransaction={handleOpenTransaction}
                    onDelete={handlePromptDelete}
                  />
                ))}
              </Section>
            )}

            {/* Partial */}
            {groupByStatus.PARTIAL.length > 0 && (
              <Section title="Partial" icon={<TrendingUp className="h-4 w-4 text-accent" />}>
                {groupByStatus.PARTIAL.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId || `${c.customerName}-${c.customerVehicleNum || ''}`}
                    c={c}
                    onHistory={handleOpenHistory}
                    onTransaction={handleOpenTransaction}
                    onDelete={handlePromptDelete}
                  />
                ))}
              </Section>
            )}

            {/* Paid */}
            {groupByStatus.PAID.length > 0 && (
              <Section title="Paid" icon={<TrendingUp className="h-4 w-4 text-success" />}>
                {groupByStatus.PAID.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId || `${c.customerName}-${c.customerVehicleNum || ''}`}
                    c={c}
                    onHistory={handleOpenHistory}
                    onTransaction={handleOpenTransaction}
                    onDelete={handlePromptDelete}
                  />
                ))}
              </Section>
            )}

            {/* Other */}
            {groupByStatus.OTHER.length > 0 && (
              <Section title="Other" icon={<Users className="h-4 w-4 text-muted-foreground" />}>
                {groupByStatus.OTHER.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId || `${c.customerName}-${c.customerVehicleNum || ''}`}
                    c={c}
                    onHistory={handleOpenHistory}
                    onTransaction={handleOpenTransaction}
                    onDelete={handlePromptDelete}
                  />
                ))}
              </Section>
            )}

            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No borrowers match the current filter.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Borrow Events */}
      {!isLoading && !isError && (
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Borrow Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEvents.length > 0 ? (
                recentEvents.map((tx, idx) => (
                  <div key={`${tx.borrower}-${tx.date}-${idx}`} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-warning-soft p-2 text-warning">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Loan to {tx.borrower}</p>
                        <p className="text-sm text-muted-foreground">{new Date(tx.date).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-warning">₹{Number(tx.amount).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No recent borrow events available.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Reusable section wrapper
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// Borrower row
function BorrowerRow({
  c,
  onHistory,
  onTransaction,
  onDelete,
}: {
  c: Customer;
  onHistory: (customer: Customer) => void;
  onTransaction: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}) {
  const getUserInitials = (name?: string) => (name || 'NA').split(' ').map((n) => n[0]).join('').toUpperCase();
  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN');
  };
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted/30 p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 sm:items-center">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {getUserInitials(c.customerName)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{c.customerName}</h3>
            <Badge className="bg-muted text-foreground">{(c.status || 'N/A').toUpperCase()}</Badge>
            {c.amountBorrowed && Number(c.amountBorrowed) > 0 && (
              <Badge className="bg-accent-soft text-accent">₹{Number(c.amountBorrowed).toLocaleString()}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {c.customerVehicleNum ? `Vehicle: ${c.customerVehicleNum}` : 'Vehicle: —'}
            {c.custId && (
              <span className="ml-2 text-xs text-muted-foreground">ID: {c.custId}</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {c.phoneNumber || '—'}
            </div>
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {c.email || '—'}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>Borrow: {formatDate(c.borrowDate)}</span>
            <span>Due: {formatDate(c.dueDate)}</span>
            {c.empId && <span>Emp: {c.empId}</span>}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          title="Transaction History"
          onClick={() => onHistory(c)}
          className="w-full sm:w-auto"
          disabled={!c.custId}
        >
          <HistoryIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          title="Record Transaction"
          onClick={() => onTransaction(c)}
          className="w-full sm:w-auto"
          disabled={!c.custId}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          title="Delete Borrower"
          onClick={() => onDelete(c)}
          className="w-full sm:w-auto"
          disabled={!c.custId}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
