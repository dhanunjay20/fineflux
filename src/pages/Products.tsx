import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { useToast } from '@/components/ui/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';
const RUPEE = '\u20B9';

const PRODUCT_OPTIONS = ['Petrol', 'Diesel', '2T', 'Premium Petrol', 'CNG'];
const SUPPLIER_OPTIONS = ['Indian Oil', 'Nayara', 'HPCL', 'BPCL', 'Reliance', 'Shell', 'ONGC', 'MRPL', 'IOCL'];

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
  const { toast } = useToast();

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
      { title: 'Total Capacity', value: `${totalCapacity.toLocaleString('en-IN')} L`, icon: Layers, bg: 'bg-accent-soft', color: 'text-accent' },
      { title: 'Total Stock', value: `${totalCurrent.toLocaleString('en-IN')} L`, icon: Database, bg: 'bg-destructive/10', color: 'text-destructive' }
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
      toast({ title: "Product added successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to add product", variant: "destructive" });
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
      toast({ title: "Product updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
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
      toast({ title: "Product deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
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
    if (!form.productName) {
      toast({ title: "Please select a product name", variant: "destructive" });
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      toast({ title: "Please enter a valid price", variant: "destructive" });
      return;
    }
    if (
      form.tankCapacity !== "" &&
      form.currentLevel !== "" &&
      parseFloat(form.currentLevel) > parseFloat(form.tankCapacity)
    ) {
      toast({ 
        title: "Invalid stock level", 
        description: "Current level cannot exceed tank capacity",
        variant: "destructive" 
      });
      return;
    }
    if (editId) updateMutation.mutate({ ...form, id: editId });
    else createMutation.mutate(form);
  };

  const getProductIcon = (productName: string) => {
    switch(productName) {
      case 'Petrol':
      case 'Premium Petrol':
        return <Fuel className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'Diesel':
        return <Droplets className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'CNG':
        return <Zap className="h-4 w-4 sm:h-5 sm:w-5" />;
      default:
        return <Box className="h-4 w-4 sm:h-5 sm:w-5" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Products</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage products, fuel types, and stocks</p>
        </div>
        <Button className="w-full sm:w-auto btn-gradient-primary" onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Product
        </Button>
      </div>

      {/* Stats Cards - ORIGINAL DESIGN */}
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
                  <div className={`${stat.bg} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Products List - RESPONSIVE */}
      <Card className="card-gradient border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Archive className="h-5 w-5 text-primary" />
            All Products
            <Badge variant="secondary" className="ml-2">{products.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
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
                    className="group p-3 sm:p-5 rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      {/* Icon */}
                      <div className="flex sm:block">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                          {getProductIcon(prod.productName)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
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
                              {prod.tankCapacity?.toLocaleString('en-IN') || '—'} {prod.metric || 'L'}
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
                              {(prod.currentLevel || 0).toLocaleString('en-IN')} / {prod.tankCapacity.toLocaleString('en-IN')} {prod.metric || 'L'}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateTime(prod.lastUpdated)}
                        </div>
                      </div>

                      {/* Price and Actions */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 min-w-[140px] border-t sm:border-t-0 sm:border-l border-border/30 pt-3 sm:pt-0 sm:pl-4">
                        <div className="text-left sm:text-right">
                          <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
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

      {/* Add/Edit Modal - FULLY RESPONSIVE */}
      <div
        className={
          "fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 p-2 sm:p-4 " +
          (modalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
        }
        onClick={closeModal}
      >
        <div
          className={
            "relative bg-background shadow-2xl rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-border/50 transition-all duration-300 " +
            (modalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0')
          }
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            .modal-scroll { 
              scrollbar-width: thin; 
              scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent; 
            } 
            .modal-scroll::-webkit-scrollbar { width: 6px; } 
            .modal-scroll::-webkit-scrollbar-track { background: transparent; } 
            .modal-scroll::-webkit-scrollbar-thumb { 
              background: hsl(var(--muted-foreground) / 0.3); 
              border-radius: 3px; 
            }
            .modal-scroll::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.5);
            }
          `}</style>
          
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {editId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {editId ? 'Update product information' : 'Create a new product entry'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition-all duration-200 hover:rotate-90"
              aria-label="Close"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          <form
            className="modal-scroll flex-1 overflow-y-auto"
            onSubmit={handleFormSubmit}
            autoComplete="off"
          >
            <div className="flex flex-col gap-4 sm:gap-5 p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Product Name *</Label>
                  <Select
                    value={form.productName}
                    onValueChange={(value) => setForm(f => ({ ...f, productName: value }))}
                  >
                    <SelectTrigger className="w-full h-10 sm:h-11 border-border/50 focus:border-primary transition-colors">
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
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
                    className="h-10 sm:h-11 border-border/50 focus:border-primary transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
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
                    className="h-10 sm:h-11 border-border/50 focus:border-primary transition-colors"
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
                    className="h-10 sm:h-11 border-border/50 focus:border-primary transition-colors"
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
                  <SelectTrigger className="w-full h-10 sm:h-11 border-border/50 focus:border-primary transition-colors">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
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
                  className="h-10 sm:h-11 border-border/50 focus:border-primary transition-colors"
                  placeholder="Add product description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Metric</Label>
                  <Select
                    value={form.metric}
                    onValueChange={(value) => setForm(f => ({ ...f, metric: value }))}
                  >
                    <SelectTrigger className="w-full h-10 sm:h-11 border-border/50 focus:border-primary transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
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
                    <SelectTrigger className="w-full h-10 sm:h-11 border-border/50 focus:border-primary transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.lastUpdated && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-muted/50 border border-border/30">
                  <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Created: {formatDateTime(form.lastUpdated)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-muted/20">
              <Button 
                type="button" 
                variant="outline" 
                onClick={closeModal}
                className="flex-1 h-10 sm:h-11 border-border/50 hover:bg-muted order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-10 sm:h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-md hover:shadow-lg order-1 sm:order-2" 
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-border/50 max-w-[90vw] sm:max-w-md">
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
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              className="border-border/50 w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg w-full sm:w-auto"
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
