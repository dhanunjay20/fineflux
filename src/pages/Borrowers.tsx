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
  X,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

// Type definitions
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
  transactionAmount: number;
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
  transactionAmount: number;
  notes?: string;
};

// Indian States/UTs
const IN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

export default function Borrowers() {
  const { toast } = useToast();

  // Organization and employee identifiers
  const [orgId, setOrgId] = useState('');
  const [empId, setEmpId] = useState('');

  useEffect(() => {
    setOrgId(localStorage.getItem('organizationId') || '');
    setEmpId(localStorage.getItem('empId') || '');
  }, []);

  // Search/filter state
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
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India'
    }
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
    notes: ''
  });
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBorrower, setDeletingBorrower] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (open || historyOpen || transactionOpen || deleteOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, historyOpen, transactionOpen, deleteOpen]);

  // Fetch all borrowers for the organization
  const fetchCustomers = async (): Promise<Customer[]> => {
    if (!orgId) return [];
    const url = `${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/customers`;
    const res = await axios.get(url, { timeout: 20000 });
    const data = res.data;

    // Handle various response formats
    if (Array.isArray(data)) return data;

    const candidates = ['data', 'items', 'content', 'result', 'results', 'records', 'rows'];
    for (const key of candidates) {
      if (Array.isArray((data as any)?.[key])) {
        return (data as any)[key];
      }
    }

    const firstArray = Object.values(data || {}).find((v) => Array.isArray(v)) as Customer[] | undefined;
    return Array.isArray(firstArray) ? firstArray : [];
  };

  const {
    data: customers = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: fetchCustomers,
    enabled: !!orgId,
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  // Filtered customers based on search
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
        c.custId
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return fields.includes(q);
    });
  }, [customers, search]);

  // Group customers by status
  const groupByStatus = useMemo(() => {
    const norm = (s?: string) => (s || '').toUpperCase();
    const groups = {
      OVERDUE: [] as Customer[],
      PENDING: [] as Customer[],
      PARTIAL: [] as Customer[],
      PAID: [] as Customer[],
      OTHER: [] as Customer[]
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

  // Calculate statistics
  const stats = useMemo(() => {
    const total = customers.length;
    const totalBorrowed = customers.reduce((sum, c) => sum + (Number(c.amountBorrowed) || 0), 0);
    const overdueCount = customers.filter((c) => (c.status || '').toUpperCase() === 'OVERDUE').length;
    const pendingCount = customers.filter((c) => (c.status || '').toUpperCase() === 'PENDING').length;
    const partialCount = customers.filter((c) => (c.status || '').toUpperCase() === 'PARTIAL').length;
    const paidCount = customers.filter((c) => (c.status || '').toUpperCase() === 'PAID').length;

    return [
      {
        title: 'Total Borrowers',
        value: total.toString(),
        change: 'Active records',
        icon: Users,
        color: 'text-primary',
        bgColor: 'bg-primary-soft'
      },
      {
        title: 'Total Borrowed',
        value: `₹${totalBorrowed.toLocaleString()}`,
        change: 'Sum of principal',
        icon: IndianRupee,
        color: 'text-accent',
        bgColor: 'bg-accent-soft'
      },
      {
        title: 'Overdue',
        value: overdueCount.toString(),
        change: 'Need attention',
        icon: AlertTriangle,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10'
      },
      {
        title: 'P/P/P',
        value: `${pendingCount}/${partialCount}/${paidCount}`,
        change: 'Pending/Partial/Paid',
        icon: TrendingUp,
        color: 'text-success',
        bgColor: 'bg-success-soft'
      }
    ];
  }, [customers]);

  // Recent borrow events
  const recentEvents = useMemo(() => {
    return customers
      .map((c) => ({
        type: 'loan' as const,
        borrower: c.customerName,
        amount: Number(c.amountBorrowed) || 0,
        date: c.borrowDate || ''
      }))
      .filter((e) => e.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [customers]);

  // Form helper functions
  const updateField = <K extends keyof CustomerCreateRequest>(key: K) => (value: CustomerCreateRequest[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateAddress = (k: keyof NonNullable<CustomerCreateRequest['address']>, v: string) => {
    setForm((prev) => ({
      ...prev,
      address: { ...(prev.address || {}), [k]: v }
    }));
  };

  // Generate customer ID
  const generateCustId = (customerName: string, existingCustomers: Customer[]) => {
    const namePrefix = customerName.trim().toUpperCase().slice(0, 2).padEnd(2, 'X');
    const basePrefix = `${orgId}${namePrefix}`;
    const existingWithPrefix = existingCustomers.filter((c) => c.custId?.startsWith(basePrefix));

    let maxSequence = 0;
    existingWithPrefix.forEach((c) => {
      const custId = c.custId || '';
      const sequencePart = custId.slice(basePrefix.length);
      const sequenceNum = parseInt(sequencePart, 10);
      if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
        maxSequence = sequenceNum;
      }
    });

    const nextSequence = (maxSequence + 1).toString().padStart(4, '0');
    return `${basePrefix}${nextSequence}`;
  };

  // Submit add borrower form
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const generatedCustId = generateCustId(form.customerName, customers);
    const payload: CustomerCreateRequest = {
      ...form,
      custId: generatedCustId,
      organizationId: orgId || form.organizationId || '',
      empId: form.empId || empId || '',
      address: { ...(form.address || {}), country: 'India' }
    };

    // Validation
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
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create customer
      await axios.post(
        `${API_BASE}/api/organizations/${encodeURIComponent(payload.organizationId)}/customers`,
        payload,
        { timeout: 20000 }
      );

      // Create opening balance transaction
      await axios.post(
        `${API_BASE}/api/organizations/${encodeURIComponent(payload.organizationId)}/customers/history`,
        {
          custId: generatedCustId,
          transactionAmount: -Math.abs(payload.amountBorrowed),
          notes: 'Opening balance on customer creation'
        },
        { timeout: 20000 }
      );

      toast({
        title: 'Success',
        description: `Borrower created with ID: ${generatedCustId}`
      });

      // Reset form
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
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'India'
        }
      }));

      await refetch();
      setOpen(false);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to create borrower.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handlers
  const handlePromptDelete = (customer: Customer) => {
    setDeletingBorrower(customer);
    setDeleteOpen(true);
  };

  // Delete handler - Updated to use /by-cust/{custId} endpoint
  const handleDeleteBorrower = async () => {
    if (!deletingBorrower?.custId) return;

    setDeleteLoading(true);
    try {
      // Use the new /by-cust/{custId} endpoint from your backend
      await axios.delete(
        `${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/customers/by-cust/${encodeURIComponent(deletingBorrower.custId)}`
      );

      toast({
        title: 'Success',
        description: `Borrower ${deletingBorrower.customerName} deleted.`
      });

      await refetch();
      setDeleteOpen(false);
      setDeletingBorrower(null);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to delete.',
        variant: 'destructive'
      });
    } finally {
      setDeleteLoading(false);
    }
  };


  // Transaction handlers
  const handleOpenTransaction = (customer: Customer) => {
    setSelectedCustomer(customer);
    setTransactionForm({
      custId: customer.custId || '',
      transactionAmount: 0,
      notes: ''
    });
    setTransactionOpen(true);
  };

  const onTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionForm.custId || transactionForm.transactionAmount === 0) {
      toast({
        title: 'Validation error',
        description: 'Customer ID and non-zero amount required.',
        variant: 'destructive'
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

      toast({
        title: 'Success',
        description: 'Transaction recorded successfully.'
      });

      await refetch();
      setTransactionOpen(false);

      // Refresh history if it's open for this customer
      if (historyOpen && selectedCustomer?.custId === transactionForm.custId) {
        fetchHistory(transactionForm.custId, historyPage);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to record transaction.',
        variant: 'destructive'
      });
    } finally {
      setTransactionSubmitting(false);
    }
  };

  // History handlers
  const fetchHistory = async (custId: string, page: number = 0) => {
    setHistoryLoading(true);
    try {
      const url = `${API_BASE}/api/organizations/${encodeURIComponent(orgId)}/customers/history?custId=${encodeURIComponent(custId)}&page=${page}&size=50`;
      const res = await axios.get(url, { timeout: 20000 });
      setHistoryData(res.data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to load history.',
        variant: 'destructive'
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryPage(0);
    setHistoryOpen(true);
    if (customer.custId) {
      fetchHistory(customer.custId, 0);
    }
  };

  // Render
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Delete Confirmation Modal */}
      {deleteOpen && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (deleteOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setDeleteOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDeleteOpen(false)}
              className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold">Delete Borrower?</h3>
            </div>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{deletingBorrower?.customerName}</span> (
              {deletingBorrower?.custId})? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteBorrower} disabled={deleteLoading}>
                {deleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}


      {open && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (open ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">Add New Borrower</h2>
                <p className="text-sm text-muted-foreground">Fill in the required details</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form with Scrollable Content and Fixed Footer */}
            <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Organization ID */}
                <div className="space-y-2">
                  <Label>Organization ID *</Label>
                  <Input value={orgId} readOnly disabled className="bg-muted/50" required />
                </div>

                {/* Name / Vehicle / Employee */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Customer Name *</Label>
                    <Input
                      value={form.customerName}
                      onChange={(e) => updateField('customerName')(e.target.value)}
                      placeholder="Enter name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle Number *</Label>
                    <Input
                      value={form.customerVehicleNum}
                      onChange={(e) => updateField('customerVehicleNum')((e.target.value || '').toUpperCase())}
                      placeholder="KA01AB1234"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee ID *</Label>
                    <Input value={form.empId || empId} readOnly disabled required />
                  </div>
                </div>

                {/* Amount / Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Amount Borrowed *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amountBorrowed}
                      onChange={(e) => updateField('amountBorrowed')(Number(e.target.value))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Borrow Date *</Label>
                    <Input
                      type="date"
                      value={form.borrowDate}
                      onChange={(e) => updateField('borrowDate')(e.target.value)}
                      max={today}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date *</Label>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => updateField('dueDate')(e.target.value)}
                      min={today}
                      required
                    />
                  </div>
                </div>

                {/* Status / Phone / Email */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) => updateField('status')(value as any)}
                      required
                    >
                      <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-900 border-border hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className='z-[10000]'>
                        <SelectItem value="PENDING" className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                            <span>PENDING</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="PARTIAL" className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <span>PARTIAL</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="OVERDUE" className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            <span>OVERDUE</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      value={form.phoneNumber || ''}
                      onChange={(e) => updateField('phoneNumber')(e.target.value)}
                      placeholder="+91 90000 00000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => updateField('email')(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        State <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={form.address?.state || ''}
                        onValueChange={(value) => updateAddress('state', value)}
                        required
                      >
                        <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-900 border-border hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000] max-h-[300px]">
                          {IN_STATES.map((state) => (
                            <SelectItem key={state} value={state} className="cursor-pointer">
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      placeholder="Postal Code"
                      value={form.address?.postalCode || ''}
                      onChange={(e) => updateAddress('postalCode', e.target.value)}
                      required
                    />
                    <Input value={form.address?.country || 'India'} readOnly disabled />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <textarea
                    className="min-h-[80px] w-full rounded-md border border-border bg-background p-2"
                    value={form.notes || ''}
                    onChange={(e) => updateField('notes')(e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Borrower'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {transactionOpen && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (transactionOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setTransactionOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Record Transaction
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer?.customerName} ({selectedCustomer?.custId})
                </p>
              </div>
              <button
                onClick={() => setTransactionOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form with Scrollable Content and Fixed Footer */}
            <form onSubmit={onTransactionSubmit} className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Customer ID *</Label>
                  <Input value={transactionForm.custId} readOnly disabled className="bg-muted/50" required />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Transaction Type</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={transactionForm.transactionAmount >= 0 ? 'default' : 'outline'}
                        className="h-20 flex-col gap-2"
                        onClick={() =>
                          setTransactionForm((prev) => ({
                            ...prev,
                            transactionAmount: Math.abs(prev.transactionAmount)
                          }))
                        }
                      >
                        <TrendingUp className="h-6 w-6" />
                        Payment Received
                      </Button>
                      <Button
                        type="button"
                        variant={transactionForm.transactionAmount < 0 ? 'default' : 'outline'}
                        className="h-20 flex-col gap-2"
                        onClick={() =>
                          setTransactionForm((prev) => ({
                            ...prev,
                            transactionAmount: -Math.abs(prev.transactionAmount)
                          }))
                        }
                      >
                        <TrendingDown className="h-6 w-6" />
                        Extra Borrowed
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={Math.abs(transactionForm.transactionAmount)}
                        onChange={(e) => {
                          const absValue = Math.abs(Number(e.target.value));
                          setTransactionForm((prev) => ({
                            ...prev,
                            transactionAmount: prev.transactionAmount < 0 ? -absValue : absValue
                          }));
                        }}
                        placeholder="0.00"
                        required
                        className="pl-8"
                      />
                      <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {transactionForm.transactionAmount < 0 ? (
                        <span className="text-warning">
                          Additional borrowing (+₹{Math.abs(transactionForm.transactionAmount).toLocaleString()})
                        </span>
                      ) : (
                        <span className="text-success">
                          Payment (−₹{Math.abs(transactionForm.transactionAmount).toLocaleString()})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <textarea
                    value={transactionForm.notes || ''}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes"
                    className="min-h-[80px] w-full rounded-md border border-border bg-background p-2"
                  />
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTransactionOpen(false)}
                  disabled={transactionSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient-primary" disabled={transactionSubmitting}>
                  {transactionSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Record Transaction'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* History Modal */}
      {historyOpen && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (historyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <HistoryIcon className="h-6 w-6" />
                  Transaction History
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer?.customerName} ({selectedCustomer?.custId})
                </p>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {historyLoading && (
                <div className="text-muted-foreground p-4 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading history...
                </div>
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
                                <div
                                  className={`rounded-lg p-2 ${isPayment ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                                    }`}
                                >
                                  {isPayment ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {isPayment ? 'Payment Received' : 'Additional Borrowed'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(transaction.transactionDate).toLocaleString()}
                                  </p>
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

                      {historyData.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-muted-foreground">
                            Page {historyData.number + 1} of {historyData.totalPages} ({historyData.totalElements}{' '}
                            total)
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
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      No transaction history available.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer - Fixed */}
            <div className="flex justify-end p-6 border-t border-border bg-muted/20 shrink-0">
              <Button variant="outline" onClick={() => setHistoryOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Borrower Management</h1>
          <p className="text-muted-foreground">Track loans and manage customer credit</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching || !orgId}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button className="btn-gradient-primary" onClick={() => setOpen(true)} disabled={!orgId}>
            <Plus className="mr-2 h-4 w-4" />
            Add Borrower
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 mb-3 opacity-50 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading borrowers...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card>
          <CardContent className="p-6">
            <div className="text-destructive">
              Failed to load customers{error instanceof Error ? `: ${error.message}` : ''}.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      )}

      {/* Borrower List */}
      {!isLoading && !isError && (
        <Card className="card-gradient">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Borrower Accounts</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search borrowers..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {groupByStatus.OVERDUE.length > 0 && (
              <Section title="Overdue" icon={<AlertTriangle className="h-4 w-4 text-destructive" />}>
                {groupByStatus.OVERDUE.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId}
                    c={c}
                    onHistory={handleOpenHistory}
                    onTransaction={handleOpenTransaction}
                    onDelete={handlePromptDelete}
                  />
                ))}
              </Section>
            )}

            {groupByStatus.PENDING.length > 0 && (
              <Section title="Pending" icon={<Clock className="h-4 w-4 text-warning" />}>
                {groupByStatus.PENDING.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId}
                    c={c}
                    onHistory={handleOpenHistory}
                    onTransaction={handleOpenTransaction}
                    onDelete={handlePromptDelete}
                  />
                ))}
              </Section>
            )}

            {groupByStatus.PARTIAL.length > 0 && (
              <Section title="Partial" icon={<TrendingUp className="h-4 w-4 text-accent" />}>
                {groupByStatus.PARTIAL.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId}
                    c={c}
                    onHistory={handleOpenHistory}
                    onTransaction={handleOpenTransaction}
                    onDelete={handlePromptDelete}
                  />
                ))}
              </Section>
            )}

            {groupByStatus.PAID.length > 0 && (
              <Section title="Paid" icon={<TrendingUp className="h-4 w-4 text-success" />}>
                {groupByStatus.PAID.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId}
                    c={c}
                    onHistory={handleOpenHistory}
                    onTransaction={handleOpenTransaction}
                    onDelete={handlePromptDelete}
                  />
                ))}
              </Section>
            )}

            {groupByStatus.OTHER.length > 0 && (
              <Section title="Other" icon={<Users className="h-4 w-4 text-muted-foreground" />}>
                {groupByStatus.OTHER.map((c) => (
                  <BorrowerRow
                    key={c.id || c.custId}
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

      {/* Recent Events */}
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
                  <div
                    key={`${tx.borrower}-${tx.date}-${idx}`}
                    className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-warning-soft p-2 text-warning">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Loan to {tx.borrower}</p>
                        <p className="text-sm text-muted-foreground">{new Date(tx.date).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-warning">₹{Number(tx.amount).toLocaleString()}</p>
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

// Section Component
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

// BorrowerRow Component
function BorrowerRow({
  c,
  onHistory,
  onTransaction,
  onDelete
}: {
  c: Customer;
  onHistory: (customer: Customer) => void;
  onTransaction: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}) {
  const getUserInitials = (name?: string) => {
    if (!name) return 'NA';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN');
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg bg-muted/30 p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start sm:items-center gap-3">
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
            {c.custId && <span className="ml-2 text-xs">ID: {c.custId}</span>}
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
        <Button variant="outline" size="sm" title="Transaction History" onClick={() => onHistory(c)} disabled={!c.custId}>
          <HistoryIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" title="Record Transaction" onClick={() => onTransaction(c)} disabled={!c.custId}>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="sm" title="Delete Borrower" onClick={() => onDelete(c)} disabled={!c.custId}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
