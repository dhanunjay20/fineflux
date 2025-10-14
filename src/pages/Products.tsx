import { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Edit2,
  Trash2,
  Box,
  Archive,
  Layers,
  PackageCheck,
  Database,
  X,
  CalendarDays,
} from 'lucide-react';

// AlertDialog for confirmation
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fineflux-spring.onrender.com';
const RUPEE = '\u20B9';

const PRODUCT_OPTIONS = [
  'Petrol', 'Diesel', '2T', 'Premium Petrol', 'CNG'
];

const SUPPLIER_OPTIONS = [
  'Indian Oil', 'Nayara', 'HPCL', 'BPCL', 'Reliance', 'Shell', 'Essar', 'ONGC', 'MRPL', 'IOCL'
];

const EMPTY_FORM = {
  id: '',
  productName: '',
  price: '',
  tankCapacity: '',
  description: '',
  supplier: '',
  currentLevel: '',
  metric: 'Liters',
  status: 'true',
  lastUpdated: '',
};

function formatDateTime(val?: string) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? val
    : d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function Products() {
  const orgId = localStorage.getItem('organizationId') || 'ORG-DEV-001';
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // State for delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);

  useEffect(() => {
    if (modalOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen]);

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['products', orgId],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/products`;
      const res = await axios.get(url, { timeout: 20000 });
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const activeProducts = useMemo(
    () => products.filter((p: any) => p.status === true || p.status === "true"),
    [products]
  );

  const statCards = useMemo(() => {
    const totalProducts = products.length;
    const totalActive = activeProducts.length;
    const totalCapacity = activeProducts.reduce((a: number, p: any) => a + Number(p.tankCapacity || 0), 0);
    const totalCurrent = activeProducts.reduce((a: number, p: any) => a + Number(p.currentLevel || 0), 0);
    return [
      { title: 'Products', value: totalProducts, icon: Box, bg: 'bg-primary-soft', color: 'text-primary' },
      { title: 'Active', value: totalActive, icon: PackageCheck, bg: 'bg-success-soft', color: 'text-success' },
      { title: 'Total Capacity', value: `${totalCapacity.toLocaleString()} L`, icon: Layers, bg: 'bg-accent-soft', color: 'text-accent' },
      { title: 'Total Stock', value: `${totalCurrent.toLocaleString()} L`, icon: Database, bg: 'bg-destructive/10', color: 'text-destructive' }
    ];
  }, [products]);

  // Always set lastUpdated when creating
  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const dto = {
        organizationId: orgId,
        productName: body.productName,
        price: body.price ? Number(body.price) : undefined,
        tankCapacity: body.tankCapacity ? Number(body.tankCapacity) : undefined,
        description: body.description,
        supplier: body.supplier,
        currentLevel: body.currentLevel ? Number(body.currentLevel) : undefined,
        metric: body.metric,
        status: body.status === "true",
        lastUpdated: new Date().toISOString()
      };
      const url = `${API_BASE}/api/organizations/${orgId}/products`;
      return (await axios.post(url, dto)).data;
    },
    onSuccess: () => {
      refetch();
      closeModal();
    }
  });

  // Always set lastUpdated when updating
  const updateMutation = useMutation({
    mutationFn: async (body: any) => {
      const dto = {
        productName: body.productName,
        price: body.price ? Number(body.price) : undefined,
        tankCapacity: body.tankCapacity ? Number(body.tankCapacity) : undefined,
        description: body.description,
        supplier: body.supplier,
        currentLevel: body.currentLevel ? Number(body.currentLevel) : undefined,
        metric: body.metric,
        status: body.status === "true",
        lastUpdated: new Date().toISOString()
      };
      const url = `${API_BASE}/api/organizations/${orgId}/products/${body.id}`;
      return (await axios.put(url, dto)).data;
    },
    onSuccess: () => {
      refetch();
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `${API_BASE}/api/organizations/${orgId}/products/${id}`;
      return (await axios.delete(url)).data;
    },
    onSuccess: () => {
      refetch();
      setDeleteTarget(null);
      setConfirmOpen(false);
    }
  });

  function closeModal() {
    setModalOpen(false);
    setTimeout(() => {
      setForm({ ...EMPTY_FORM });
      setEditId(null);
    }, 200);
  }

  function openCreateModal() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
    setTimeout(() => {
      selectRef.current?.focus();
    }, 50);
  }

  function openEditModal(prod: any) {
    setEditId(prod.id);
    setForm({
      id: prod.id,
      productName: prod.productName ?? '',
      price: prod.price !== undefined && prod.price !== null ? String(prod.price) : '',
      tankCapacity: prod.tankCapacity !== undefined && prod.tankCapacity !== null ? String(prod.tankCapacity) : '',
      description: prod.description ?? '',
      supplier: prod.supplier ?? '',
      currentLevel: prod.currentLevel !== undefined && prod.currentLevel !== null ? String(prod.currentLevel) : '',
      metric: prod.metric ?? 'Liters',
      status: prod.status ? "true" : "false",
      lastUpdated: prod.lastUpdated || ''
    });
    setModalOpen(true);
    setTimeout(() => {
      selectRef.current?.focus();
    }, 50);
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      form.tankCapacity !== "" &&
      form.currentLevel !== "" &&
      parseFloat(form.currentLevel) > parseFloat(form.tankCapacity)
    ) {
      setForm(f => ({ ...f, currentLevel: f.tankCapacity }));
      return;
    }
    if (editId) updateMutation.mutate({ ...form, id: editId });
    else createMutation.mutate(form);
  };

  const AddEditProductForm = (
    <div
      className={
        "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto " +
        (modalOpen ? '' : 'hidden')
      }
    >
      <div
        className="relative bg-background shadow-2xl rounded-2xl mx-auto w-full max-w-lg max-h-[90vh] my-8 flex flex-col"
        style={{ marginTop: 'auto', marginBottom: 'auto' }}
      >
        <style>{`.modal-scroll { scrollbar-width: none; } .modal-scroll::-webkit-scrollbar { display: none; }`}</style>
        <button
          type="button"
          onClick={closeModal}
          className="absolute top-4 right-4 z-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <form
          className="modal-scroll flex flex-col gap-5 p-8 pt-6 overflow-y-auto"
          onSubmit={handleFormSubmit}
          style={{ minHeight: '60vh', maxHeight: '90vh' }}
          autoComplete="off"
        >
          <h2 className="text-2xl font-bold mb-2 mt-2">{editId ? 'Edit Product' : 'Add New Product'}</h2>
          <div className="space-y-2">
            <Label>Product Name</Label>
            <select
              name="productName"
              value={form.productName}
              required
              onChange={handleFormChange}
              ref={selectRef}
              className="w-full p-2 rounded-md border bg-background"
            >
              <option value="">Select Product</option>
              {PRODUCT_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Price (₹ per Liter)</Label>
            <Input
              name="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.price}
              min="0"
              required
              onChange={handleFormChange}
            />
          </div>
          <div className="space-y-2">
            <Label>Tank Capacity (L)</Label>
            <Input
              name="tankCapacity"
              type="number"
              inputMode="decimal"
              step="1"
              value={form.tankCapacity}
              min="0"
              onChange={handleFormChange}
            />
          </div>
          <div className="space-y-2">
            <Label>Supplier</Label>
            <select
              name="supplier"
              value={form.supplier}
              required
              onChange={handleFormChange}
              className="w-full p-2 rounded-md border bg-background"
            >
              <option value="">Select Supplier</option>
              {SUPPLIER_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              name="description"
              value={form.description}
              onChange={handleFormChange}
            />
          </div>
          <div className="space-y-2">
            <Label>Current Level (L)</Label>
            <Input
              name="currentLevel"
              type="number"
              inputMode="decimal"
              step="1"
              value={form.currentLevel}
              min="0"
              max={form.tankCapacity !== "" ? form.tankCapacity : undefined}
              onChange={handleFormChange}
            />
            {form.tankCapacity !== "" && form.currentLevel !== "" && parseFloat(form.currentLevel) > parseFloat(form.tankCapacity)
              ? <span className="text-xs text-destructive">Current Level cannot exceed Tank Capacity.</span>
              : null}
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="space-y-2 flex-1 min-w-[110px]">
              <Label>Metric</Label>
              <select
                name="metric"
                value={form.metric}
                onChange={handleFormChange}
                className="w-full p-2 rounded-md border"
              >
                <option value="Liters">Liters</option>
                <option value="Gallons">Gallons</option>
                <option value="Kiloliters">Kiloliters</option>
              </select>
            </div>
            <div className="space-y-2 flex-1 min-w-[110px]">
              <Label>Status</Label>
              <select
                name="status"
                value={form.status}
                onChange={handleFormChange}
                className="w-full p-2 rounded-md border"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          {form.lastUpdated && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Product Created At: {formatDateTime(form.lastUpdated)}
            </div>
          )}
          <Button type="submit" className="w-full btn-gradient-primary">
            {editId ? 'Update Product' : 'Add Product'}
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage products, fuel types, and stocks</p>
        </div>
        <Button className="btn-gradient-primary" onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Product
        </Button>
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-3 rounded-lg`}><Icon className={`h-6 w-6 ${stat.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {/* Product list */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            All Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-muted-foreground">No products found</div>
          ) : (
            <div className="space-y-3">
              {products.map((prod: any) =>
                <div key={prod.id || prod._id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">{prod.productName}</span>
                      <Badge className={prod.status ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}>
                        {prod.status ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{prod.metric || "L"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{prod.description}</div>
                    <div className="flex gap-5 mt-1 text-xs">
                      <span>Supplier: <b>{prod.supplier || '—'}</b></span>
                      <span>Tank: {prod.tankCapacity?.toLocaleString() || '—'} {prod.metric || 'L'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                      <CalendarDays className="h-3 w-3" />
                      Product Created At: {formatDateTime(prod.lastUpdated)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 min-w-[150px]">
                    <span className="font-bold text-foreground">{RUPEE}{(prod.price || 0).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">In Stock: {(prod.currentLevel || 0).toLocaleString()} {prod.metric || 'L'}</span>
                    <div className="flex gap-2 mt-1">
                      <Button size="icon" variant="outline" title="Edit" onClick={() => openEditModal(prod)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        title="Delete"
                        onClick={() => {
                          setDeleteTarget({ id: prod.id, name: prod.productName });
                          setConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {AddEditProductForm}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This action cannot be undone.${deleteTarget?.name ? ` “${deleteTarget.name}” will be permanently removed.` : ''}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteTarget(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget?.id) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
