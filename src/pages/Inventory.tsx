import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Fuel, Plus, TrendingUp, AlertTriangle, RefreshCw, BarChart3, Calendar, X, Download, Eye, History, PackageOpen, Trash2, Clock,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const LOW_STOCK_PHONE = "9640206605";

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : `${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
}

function useLatestInventories(orgId, products) {
  const queries = products.map(prod => ({
    queryKey: ["inventory-latest", orgId, prod.id],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/inventories/${prod.id}/latest`;
      try {
        const res = await axios.get(url);
        return { ...res.data, productId: prod.id };
      } catch {
        return null;
      }
    },
    enabled: !!orgId && !!prod.id,
  }));
  const results = useQueries({ queries });
  const inventories = results.map(q => q.data).filter(Boolean);
  const isLoading = results.some(q => q.isLoading);
  const refetch = () => results.forEach(q => q.refetch && q.refetch());
  return { inventories, isLoadingInventories: isLoading, refetchInventories: refetch };
}

export default function Inventory() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const sentAlertRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  // Modal/UI state
  const [stockModal, setStockModal] = useState<null | any>(null);
  const [stockValue, setStockValue] = useState(""); // input value for addition
  const [addModal, setAddModal] = useState(false);
  const [addProductId, setAddProductId] = useState("");
  const [addValue, setAddValue] = useState("");
  const [refillModal, setRefillModal] = useState<null | any>(null);
  const [refillDate, setRefillDate] = useState("");
  const [tankRefillDates, setTankRefillDates] = useState<Record<string, string>>({});
  const [reportModal, setReportModal] = useState(false);
  const [reportProductId, setReportProductId] = useState("");
  const [reportProduct, setReportProduct] = useState<any | null>(null);
  const [lowStockModal, setLowStockModal] = useState(false);
  const [smsState, setSmsState] = useState<{ [id: string]: string }>({});
  const [deleteModal, setDeleteModal] = useState<any | null>(null);

  // Products
  const { data: products = [], isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/products`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Latest inventory
  const { inventories, isLoadingInventories, refetchInventories } = useLatestInventories(orgId, products);

  const tankList = (inventories || []).map((inv: any) => {
    const prod = products.find((p: any) => p.id === inv.productId);
    return {
      ...inv,
      price: prod?.price ?? "-",
      supplier: prod?.supplier ?? "-",
      productName: inv.productName ?? prod?.productName ?? "—"
    }
  });

  const activeTanks = tankList.filter(t => t.status === true || t.status === "true");
  const lowStockTanks = activeTanks.filter(
    tank =>
      tank.tankCapacity &&
      tank.currentLevel &&
      Number(tank.tankCapacity) > 0 &&
      (100 * (Number(tank.currentLevel) / Number(tank.tankCapacity))) < 20
  );
  useEffect(() => {
    lowStockTanks.forEach(async (tank) => {
      const key = String(tank.productId || tank.productName);
      if (!sentAlertRef.current.has(key)) {
        try {
          setSmsState(s => ({ ...s, [key]: "Sending..." }));
          await axios.post(`${API_BASE}/api/send-sms`, {
            phone: LOW_STOCK_PHONE,
            message: `Low Stock Alert: ${tank.productName}, Stock: ${tank.currentLevel}`,
          });
          sentAlertRef.current.add(key);
          setSmsState(s => ({ ...s, [key]: "SMS sent!" }));
        } catch {
          setSmsState(s => ({ ...s, [key]: "SMS failed!" }));
        }
      }
    });
    sentAlertRef.current.forEach(key => {
      if (!lowStockTanks.some(t => String(t.productId || t.productName) === key)) {
        sentAlertRef.current.delete(key);
        setSmsState(s => { const ns = { ...s }; delete ns[key]; return ns; });
      }
    });
  }, [lowStockTanks.map(t => t.productId).join(",")]);

  // Only PUT for add/update
  const putStockMutation = useMutation<
    { productId: string; amount: number },
    unknown,
    { productId: string; amount: number }
  >({
    mutationFn: async ({ productId, amount }) => {
      const tank = tankList.find((inv: any) => inv.productId === productId) || {};
      const dto = {
        currentLevel: Number(amount),
        totalCapacity: tank.totalCapacity,
        stockValue: tank.stockValue,
        empId: tank.empId,
        metric: tank.metric,
        status: tank.status ?? true,
        tankCapacity: tank.tankCapacity,
      };
      const url = `${API_BASE}/api/organizations/${orgId}/inventories/${productId}`;
      await axios.put(url, dto);
      return { productId, amount };
    },
    onSuccess: () => {
      refetchAll();
      setAddModal(false); setStockModal(null);
      setAddProductId(""); setAddValue(""); setStockValue("");
    }
  });
  const deleteInventoryMutation = useMutation({
    mutationFn: async (inventoryId) => {
      const url = `${API_BASE}/api/organizations/${orgId}/inventories/${inventoryId}`;
      await axios.delete(url);
    },
    onSuccess: () => { refetchAll(); setDeleteModal(null); }
  });
  const refetchAll = useCallback(() => {
    refetchProducts();
    refetchInventories();
  }, [refetchProducts, refetchInventories]);

  // Stats
  const totalStockValue = activeTanks.reduce(
    (sum, tank) =>
      sum + (Number(tank.currentLevel || 0) * Number(tank.price || 0)),
    0
  );
  const stats = [
    {
      title: "Total Capacity",
      value:
        activeTanks.length > 0
          ? `${(
            activeTanks.reduce(
              (sum, tank) => sum + Number(tank.tankCapacity || 0),
              0
            ) / 1000
          ).toFixed(1)}K`
          : "-",
      change: "Liters",
      icon: Fuel,
      color: "text-primary",
      bgColor: "bg-primary-soft",
    },
    {
      title: "Current Stock",
      value:
        activeTanks.length > 0
          ? `${(
            activeTanks.reduce(
              (sum, tank) => sum + Number(tank.currentLevel || 0),
              0
            ) / 1000
          ).toFixed(1)}K`
          : "-",
      change: "Liters available",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success-soft",
    },
    {
      title: "Product Types",
      value: activeTanks.length ? activeTanks.length : "-",
      change: "",
      icon: BarChart3,
      color: "text-accent",
      bgColor: "bg-accent-soft",
    },
    {
      title: "Stock Value",
      value:
        activeTanks.length > 0
          ? `₹${(totalStockValue / 100000).toFixed(2)}L`
          : "-",
      change: "Current worth",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success-soft",
    },
  ];
  const getStockPercentage = (current, capacity) =>
    capacity ? Math.round((current / capacity) * 100) : 0;
  const getStockStatus = (
    percentage: number
  ): {
    color: string;
    bg: string;
    label: string;
    variant: "destructive" | "secondary" | "outline" | "default";
  } => {
    if (percentage < 20)
      return { color: "text-destructive", bg: "bg-destructive-soft", label: "Critical", variant: "destructive" };
    if (percentage < 40)
      return { color: "text-warning", bg: "bg-warning-soft", label: "Low", variant: "secondary" };
    if (percentage < 70)
      return { color: "text-primary", bg: "bg-primary-soft", label: "Medium", variant: "outline" };
    return { color: "text-success", bg: "bg-success-soft", label: "Good", variant: "outline" };
  };
  const openStockModal = (tank) => { setStockModal(tank); setStockValue(""); };
  const openAddModal = () => { setAddModal(true); setAddProductId(""); setAddValue(""); };
  const openRefillModal = (tank) => { setRefillModal(tank); setRefillDate(tankRefillDates[tank.productId || tank.productName] || ""); };
  const handleAddStock = (e) => {
    e.preventDefault();
    if (!addProductId || !addValue || isNaN(Number(addValue))) return;
    putStockMutation.mutate({ productId: addProductId, amount: Number(addValue) });
  };
  const handleStockUpdate = (e) => {
    e.preventDefault();
    if (!stockModal || !stockValue || isNaN(Number(stockValue))) return;
    putStockMutation.mutate({ productId: stockModal.productId, amount: Number(stockValue) });
  };
  const handleRefillSave = (e) => {
    e.preventDefault();
    setTankRefillDates((dates) => ({
      ...dates,
      [refillModal.productId || refillModal.productName]: refillDate,
    }));
    setRefillModal(null);
    setRefillDate("");
  };
  const handleReportView = () => {
    const tank = activeTanks.find(
      (p) => p.productId === reportProductId || p.productName === reportProductId
    );
    setReportProduct(tank || null);
  };
  const handleReportDownload = () => {
    if (!reportProduct) return;
    const rows = [
      [
        "Product Name", "Tank Capacity", "Current Level", "Price/Liter", "Supplier", "Status",
      ],
      [
        reportProduct.productName,
        reportProduct.tankCapacity,
        reportProduct.currentLevel,
        reportProduct.price,
        reportProduct.supplier,
        reportProduct.status ? "Active" : "Inactive",
      ],
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `StockReport-${reportProduct.productName || reportProduct.productId}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER, Stats, Tank List */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tank Inventory</h1>
          <p className="text-muted-foreground">Monitor fuel levels and manage stock</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="flex items-center gap-1" onClick={() => navigate("/inventory/history")}>
            <History className="h-4 w-4" /> Inventory History
          </Button>
          <Button variant="outline" onClick={refetchAll}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Stock
          </Button>
          <Button className="btn-gradient-primary" onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Purchase
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      {!!stat.change && <p className="text-xs text-muted-foreground">{stat.change}</p>}
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
      {(isLoadingProducts || isLoadingInventories) ? (
        <div className="text-center py-20 opacity-70 flex items-center justify-center">
          <RefreshCw className="animate-spin h-8 w-8 mr-2" />
          <span className="text-lg">Loading tanks ...</span>
        </div>
      ) : activeTanks.length === 0 ? (
        <div className="py-20 flex justify-center items-center flex-col opacity-60">
          <PackageOpen size={56} className="mb-2" />
          <div className="font-semibold text-xl">No tank inventories found</div>
          <div className="text-muted-foreground">Add a product and log purchases to begin tracking your inventory.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tankList.map((tank, idx) => {
            if (!tank || (!tank.status && tank.status !== undefined)) return null;
            const capacity = Number(tank.tankCapacity || 0);
            const currentStock = Number(tank.currentLevel || 0);
            const percentage = getStockPercentage(currentStock, capacity);
            const status = getStockStatus(percentage);
            const refill = tankRefillDates[tank.productId || tank.productName];
            return (
              <Card key={tank.inventoryId || tank.productId || tank.productName || idx} className="card-gradient hover-lift">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-5 w-5" />
                      <CardTitle className="text-lg">{tank.productName || "—"}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant} className={percentage < 20 ? "animate-pulse" : ""}>
                        {percentage < 20 && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {status.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/20"
                        title="Delete Inventory"
                        onClick={() => setDeleteModal(tank)}
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Stock Level</span>
                      <span className="font-medium">{capacity ? percentage : 0}%</span>
                    </div>
                    <Progress value={capacity ? percentage : 0} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{currentStock.toLocaleString()}L</span>
                      <span>{capacity.toLocaleString()}L</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Price/Liter</p>
                      <p className="font-medium text-foreground">{tank.price ? `₹${tank.price}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Supplier</p>
                      <p className="font-medium text-foreground">{tank.supplier || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium text-foreground">{tank.status ? "Active" : "Inactive"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Refill</p>
                      <p className="font-medium text-foreground">{formatDateTime(tank.lastUpdated)}</p>
                    </div>

                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openStockModal(tank)}>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Update Stock
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openRefillModal(tank)}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule Refill
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-center min-h-[88px]">
                    <div className="text-center">
                      <p className="text-[15px] text-muted-foreground uppercase tracking-wide">Stock Value</p>
                      <p className="text-3xl sm:text-4xl font-extrabold text-primary">
                        {
                          Number(tank.price) && Number(tank.currentLevel)
                            ? new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0
                            }).format(Number(tank.currentLevel) * Number(tank.price))
                            : "—"
                        }
                      </p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Card className="card-gradient">
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="btn-gradient-primary h-auto p-4 flex-col gap-2" onClick={openAddModal}>
              <Plus className="h-6 w-6" /> <span>Record Purchase</span>
            </Button>
            <Button className="btn-gradient-accent h-auto p-4 flex-col gap-2" onClick={() => setReportModal(true)}>
              <BarChart3 className="h-6 w-6" /> <span>Stock Report</span>
            </Button>
            <Button className="btn-gradient-success h-auto p-4 flex-col gap-2 relative" onClick={() => setLowStockModal(true)}>
              <AlertTriangle className="h-6 w-6" /> <span>Low Stock Alerts</span>
              {lowStockTanks.length > 0 && (
                <span className="absolute -top-2 -right-2 rounded-full bg-destructive text-white px-2 py-0.5 text-xs font-bold shadow">
                  {lowStockTanks.length}
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Add Purchase Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-lg shadow-lg relative w-full max-w-md">
            <button type="button" className="absolute top-4 right-4" onClick={() => setAddModal(false)}>
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold mb-3">Record Purchase</h3>
            <form className="flex flex-col gap-4" onSubmit={handleAddStock}>
              <select className="p-2 bg-input border rounded"
                value={addProductId}
                onChange={e => setAddProductId(e.target.value)} required>
                <option value="">Select Tank</option>
                {products.map((prod) => (
                  <option key={prod.id} value={prod.id}>{prod.productName}</option>
                ))}
              </select>
              <Input type="number" placeholder="Amount to add" value={addValue}
                onChange={e => setAddValue(e.target.value)} required min="0" />
              <Button type="submit" className="w-full btn-gradient-primary" disabled={putStockMutation.isPending}>Add</Button>
            </form>
          </div>
        </div>
      )}
      {/* Update Stock Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-lg shadow-lg relative w-full max-w-md">
            <button type="button" className="absolute top-4 right-4" onClick={() => setStockModal(null)}>
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold mb-3">
              Update Stock for {stockModal.productName}
            </h3>
            <form className="flex flex-col gap-4" onSubmit={handleStockUpdate}>
              <div>
                <p className="text-sm mb-1 text-muted-foreground">Current Stock</p>
                <div className="text-2xl font-bold mb-1">{Number(stockModal.currentLevel || 0).toLocaleString()} L</div>
              </div>
              <div>
                <label className="text-sm mb-2 text-muted-foreground block">Amount to Add</label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={stockValue}
                  onChange={e => setStockValue(e.target.value)}
                  required
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total After Update</p>
                <div className="font-bold text-lg">
                  {Number(stockModal.currentLevel || 0) + (Number(stockValue) || 0)} L
                </div>
              </div>
              <Button type="submit" className="w-full btn-gradient-primary" disabled={putStockMutation.isPending || Number(stockValue) < 1}>
                {putStockMutation.isPending ? "Updating..." : "Add to Stock"}
              </Button>
            </form>
          </div>
        </div>
      )}
      {/* Schedule Refill Modal */}
      {refillModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-lg shadow-lg relative w-full max-w-md">
            <button type="button" className="absolute top-4 right-4" onClick={() => setRefillModal(null)}>
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold mb-3">Schedule Refill for {refillModal.productName}</h3>
            <form className="flex flex-col gap-4" onSubmit={handleRefillSave}>
              <Input type="date" value={refillDate} onChange={e => setRefillDate(e.target.value)} required />
              <Button type="submit" className="w-full btn-gradient-primary">Save Date</Button>
            </form>
          </div>
        </div>
      )}
      {/* Stock Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-lg shadow-lg relative w-full max-w-lg">
            <button type="button" className="absolute top-4 right-4" onClick={() => { setReportModal(false); setReportProductId(""); setReportProduct(null); }}>
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold mb-3">Product Stock Report</h3>
            <div className="flex gap-4 mb-4">
              <select className="p-2 bg-input border rounded flex-1" value={reportProductId} onChange={e => { setReportProductId(e.target.value); setReportProduct(null); }}>
                <option value="">Select Product</option>
                {activeTanks.map((prod) => (
                  <option key={prod.productId} value={prod.productId}>{prod.productName}</option>
                ))}
              </select>
              <Button onClick={handleReportView} disabled={!reportProductId}>
                <Eye className="h-4 w-4 mr-1" />View Report
              </Button>
            </div>
            {reportProduct && (
              <div>
                <table className="w-full mb-3 border border-muted rounded text-sm">
                  <tbody>
                    <tr><td className="px-2 py-1 font-medium">Product Name</td><td className="px-2 py-1">{reportProduct.productName}</td></tr>
                    <tr><td className="px-2 py-1 font-medium">Tank Capacity</td><td className="px-2 py-1">{reportProduct.tankCapacity ?? "—"}</td></tr>
                    <tr><td className="px-2 py-1 font-medium">Current Level</td><td className="px-2 py-1">{reportProduct.currentLevel ?? "—"}</td></tr>
                    <tr><td className="px-2 py-1 font-medium">Price per Liter</td><td className="px-2 py-1">{reportProduct.price ?? "—"}</td></tr>
                    <tr><td className="px-2 py-1 font-medium">Supplier</td><td className="px-2 py-1">{reportProduct.supplier ?? "—"}</td></tr>
                    <tr><td className="px-2 py-1 font-medium">Metric</td><td className="px-2 py-1">{reportProduct.metric ?? "—"}</td></tr>
                  </tbody>
                </table>
                <div className="flex gap-3 justify-end">
                  <Button onClick={handleReportDownload}>
                    <Download className="h-4 w-4 mr-1" />
                    Download Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Low Stock Alerts Modal */}
      {lowStockModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-lg shadow-lg relative w-full max-w-lg">
            <button type="button" className="absolute top-4 right-4" onClick={() => setLowStockModal(false)}>
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Low Stock Alerts</h3>
            {lowStockTanks.length === 0
              ? <div className="text-muted-foreground">No products are currently low on stock (below 20%).</div>
              : <div>
                <table className="w-full text-sm border mb-3">
                  <thead>
                    <tr className="bg-muted">
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3">Current Level</th>
                      <th className="py-2 px-3">Max Capacity</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">SMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockTanks.map((tank) => (
                      <tr key={tank.productId}>
                        <td className="py-2 px-3">{tank.productName}</td>
                        <td className="py-2 px-3">{tank.currentLevel}</td>
                        <td className="py-2 px-3">{tank.tankCapacity}</td>
                        <td className="py-2 px-3">
                          <Badge variant="destructive">Low</Badge>
                        </td>
                        <td className="py-2 px-3">
                          {smsState[String(tank.productId || tank.productName)] || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      )}
      {/* Delete Inventory Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-lg shadow-lg relative w-full max-w-md">
            <button type="button" className="absolute top-4 right-4" onClick={() => setDeleteModal(null)}>
              <X className="h-5 w-5" />
            </button>
            <div className="mb-3 flex items-center gap-3">
              <Trash2 className="w-8 h-8 text-destructive" />
              <h2 className="font-bold text-xl">Delete Inventory</h2>
            </div>
            <p className="mb-4 text-muted-foreground">
              Are you sure you want to delete inventory for <b>{deleteModal.productName}</b>? This will remove <b>all data</b> for this tank from the system but will not delete the product definition.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteInventoryMutation.mutate(deleteModal.inventoryId)} disabled={deleteInventoryMutation.isPending}>
                {deleteInventoryMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
