import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Edit2, Trash2, Box, Archive, Layers, PackageCheck, Database, X, CalendarDays,
  Fuel, Droplets, Zap
} from 'lucide-react';
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';
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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);

  useEffect(() => {
    if (modalOpen) document.body.style.overflow = 'hidden';
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
  }, [products, activeProducts]);

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
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const getProductIcon = (productName: string) => {
    switch(productName) {
      case 'Petrol':
      case 'Premium Petrol':
        return <Fuel className="h-5 w-5" />;
      case 'Diesel':
        return <Droplets className="h-5 w-5" />;
      case 'CNG':
        return <Zap className="h-5 w-5" />;
      default:
        return <Box className="h-5 w-5" />;
    }
  };

  const AddEditProductForm = (
    <div
      className={
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 overflow-y-auto " +
        (modalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
      }
      onClick={closeModal}
    >
      <div
        className={
          "relative bg-background shadow-2xl rounded-3xl mx-auto w-full max-w-2xl max-h-[90vh] my-8 flex flex-col border border-border/50 transition-all duration-300 " +
          (modalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0')
        }
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`.modal-scroll { scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent; } .modal-scroll::-webkit-scrollbar { width: 6px; } .modal-scroll::-webkit-scrollbar-track { background: transparent; } .modal-scroll::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.3); border-radius: 3px; }`}</style>
        
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {editId ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {editId ? 'Update product information' : 'Create a new product entry'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition-all duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="modal-scroll flex flex-col gap-5 p-6 overflow-y-auto"
          onSubmit={handleFormSubmit}
          autoComplete="off"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Product Name *</Label>
              <Select
                value={form.productName}
                onValueChange={(value) => setForm(f => ({ ...f, productName: value }))}
              >
                <SelectTrigger className="w-full h-11 border-border/50 focus:border-primary transition-colors">
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      <div className="flex items-center gap-2">
                        {getProductIcon(opt)}
                        {opt}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Price (₹ per Liter) *</Label>
              <Input
                name="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.price}
                min="0"
                required
                onChange={handleFormChange}
                className="h-11 border-border/50 focus:border-primary transition-colors"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tank Capacity (L)</Label>
              <Input
                name="tankCapacity"
                type="number"
                inputMode="decimal"
                step="1"
                value={form.tankCapacity}
                min="0"
                onChange={handleFormChange}
                className="h-11 border-border/50 focus:border-primary transition-colors"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Level (L)</Label>
              <Input
                name="currentLevel"
                type="number"
                inputMode="decimal"
                step="1"
                value={form.currentLevel}
                min="0"
                max={form.tankCapacity !== "" ? form.tankCapacity : undefined}
                onChange={handleFormChange}
                className="h-11 border-border/50 focus:border-primary transition-colors"
                placeholder="0"
              />
              {form.tankCapacity !== "" && form.currentLevel !== "" && parseFloat(form.currentLevel) > parseFloat(form.tankCapacity) && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <span className="h-1 w-1 rounded-full bg-destructive"></span>
                  Current Level cannot exceed Tank Capacity
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Supplier</Label>
            <Select
              value={form.supplier}
              onValueChange={(value) => setForm(f => ({ ...f, supplier: value }))}
            >
              <SelectTrigger className="w-full h-11 border-border/50 focus:border-primary transition-colors">
                <SelectValue placeholder="Select Supplier" />
              </SelectTrigger>
              <SelectContent>
                {SUPPLIER_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <Input
              name="description"
              value={form.description}
              onChange={handleFormChange}
              className="h-11 border-border/50 focus:border-primary transition-colors"
              placeholder="Add product description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Metric</Label>
              <Select
                value={form.metric}
                onValueChange={(value) => setForm(f => ({ ...f, metric: value }))}
              >
                <SelectTrigger className="w-full h-11 border-border/50 focus:border-primary transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Liters">Liters</SelectItem>
                  <SelectItem value="Gallons">Gallons</SelectItem>
                  <SelectItem value="Kiloliters">Kiloliters</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm(f => ({ ...f, status: value }))}
              >
                <SelectTrigger className="w-full h-11 border-border/50 focus:border-primary transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.lastUpdated && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 border border-border/30">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Created: {formatDateTime(form.lastUpdated)}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={closeModal}
              className="flex-1 h-11 border-border/50 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-md hover:shadow-lg" 
              disabled={updateMutation.isPending || createMutation.isPending}
            >
              {editId
                ? (updateMutation.isPending ? "Updating..." : "Update Product")
                : (createMutation.isPending ? "Adding..." : "Add Product")
              }
            </Button>
          </div>
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

      {/* ORIGINAL STAT CARD STRUCTURE - UNCHANGED */}
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

      <Card className="card-gradient border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Archive className="h-5 w-5 text-primary" />
            All Products
            <Badge variant="secondary" className="ml-2">{products.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-muted">
                <Box className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">No products found</p>
                <p className="text-sm text-muted-foreground mt-1">Get started by adding your first product</p>
              </div>
              <Button onClick={openCreateModal} variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((prod: any) => {
                const fillPercentage = prod.tankCapacity > 0 
                  ? ((prod.currentLevel / prod.tankCapacity) * 100).toFixed(0)
                  : '0';
                
                return (
                  <div 
                    key={prod.id || prod._id} 
                    className="group p-5 rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                          {getProductIcon(prod.productName)}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                              {prod.productName}
                            </h3>
                            <Badge 
                              variant={prod.status ? "default" : "secondary"}
                              className={prod.status ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : ""}
                            >
                              {prod.status ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                              {prod.metric || "L"}
                            </span>
                          </div>

                          {prod.description && (
                            <p className="text-sm text-muted-foreground">
                              {prod.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Supplier:</span>
                              <span className="font-medium">{prod.supplier || '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Capacity:</span>
                              <span className="font-medium">
                                {prod.tankCapacity?.toLocaleString() || '—'} {prod.metric || 'L'}
                              </span>
                            </div>
                          </div>

                          {prod.tankCapacity > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Stock Level</span>
                                <span className="font-medium">{fillPercentage}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    Number(fillPercentage) > 70 ? 'bg-green-500' :
                                    Number(fillPercentage) > 40 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${fillPercentage}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {(prod.currentLevel || 0).toLocaleString()} / {prod.tankCapacity.toLocaleString()} {prod.metric || 'L'}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDateTime(prod.lastUpdated)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 min-w-[160px]">
                        <div className="text-right">
                          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            {RUPEE}{(prod.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground">per Liter</div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-9 w-9 hover:bg-primary hover:text-primary-foreground transition-colors" 
                            onClick={() => openEditModal(prod)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 hover:bg-destructive hover:text-destructive-foreground transition-colors"
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {AddEditProductForm}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              Delete Product?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {`This action cannot be undone.${deleteTarget?.name ? ` "${deleteTarget.name}" will be permanently removed from your inventory.` : ''}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              className="border-border/50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg"
              onClick={() => {
                if (deleteTarget?.id) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
