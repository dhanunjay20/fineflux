import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Box, Archive, Hash, Barcode, Fuel, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const GUNS_PER_PAGE = 6;

export default function GunInfo() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const empId = localStorage.getItem("empId") || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/products`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const [form, setForm] = useState({
    productName: "",
    guns: "",
    serialNumber: "",
    currentReading: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: guns = [], isLoading } = useQuery({
    queryKey: ["guninfo", orgId],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/guninfo`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Enhanced Stats with icons on right
  const statCards = useMemo(() => {
    const totalProducts = products.length;
    const totalGuns = guns.length;
    const totalReading = guns.reduce((sum: number, g: any) => sum + (g.currentReading || 0), 0);
    const avgReading = totalGuns ? (totalReading / totalGuns) : 0;
    
    return [
      { 
        title: "Total Products", 
        value: totalProducts, 
        change: "Available fuel types",
        icon: Box, 
        bg: "bg-primary-soft", 
        color: "text-primary" 
      },
      { 
        title: "Active Guns", 
        value: totalGuns, 
        change: "Registered dispensers",
        icon: Fuel, 
        bg: "bg-success-soft", 
        color: "text-success" 
      },
      { 
        title: "Total Reading", 
        value: totalReading.toLocaleString(), 
        change: "Cumulative liters",
        icon: Activity, 
        bg: "bg-accent-soft", 
        color: "text-accent" 
      },
      { 
        title: "Avg Reading", 
        value: avgReading.toFixed(2), 
        change: "Per gun average",
        icon: TrendingUp, 
        bg: "bg-warning-soft", 
        color: "text-warning" 
      },
    ];
  }, [products, guns]);

  // Filter guns by search query
  const filteredGuns = useMemo(() => {
    if (!searchQuery.trim()) return guns;
    const q = searchQuery.toLowerCase();
    return guns.filter((gun: any) => 
      gun.guns?.toLowerCase().includes(q) ||
      gun.productName?.toLowerCase().includes(q) ||
      gun.serialNumber?.toLowerCase().includes(q)
    );
  }, [guns, searchQuery]);

  const totalPages = Math.ceil(filteredGuns.length / GUNS_PER_PAGE) || 1;
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (filteredGuns.length === 0 && currentPage !== 1) setCurrentPage(1);
  }, [filteredGuns.length, totalPages, currentPage]);

  const pagedGuns = filteredGuns.slice((currentPage - 1) * GUNS_PER_PAGE, currentPage * GUNS_PER_PAGE);

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const url = `${API_BASE}/api/organizations/${orgId}/guninfo`;
      return (await axios.post(url, {
        organizationId: orgId,
        empId,
        productName: payload.productName,
        guns: payload.guns,
        serialNumber: payload.serialNumber,
        currentReading: Number(payload.currentReading),
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });
      setForm({ productName: "", guns: "", serialNumber: "", currentReading: "" });
      toast({ title: "Success", description: "Gun added successfully!", variant: "default" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add gun info.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof form & { id: string }) => {
      const url = `${API_BASE}/api/organizations/${orgId}/guninfo/${payload.id}`;
      return (await axios.put(url, {
        empId,
        productName: payload.productName,
        guns: payload.guns,
        serialNumber: payload.serialNumber,
        currentReading: Number(payload.currentReading),
        organizationId: orgId,
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });
      setForm({ productName: "", guns: "", serialNumber: "", currentReading: "" });
      setEditId(null);
      toast({ title: "Success", description: "Gun updated successfully!", variant: "default" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update gun info.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `${API_BASE}/api/organizations/${orgId}/guninfo/${id}`;
      await axios.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });
      setCurrentPage((p) => {
        const newTotal = filteredGuns.length - 1;
        const newPages = Math.max(1, Math.ceil(newTotal / GUNS_PER_PAGE));
        return Math.min(p, newPages);
      });
      toast({ title: "Success", description: "Gun deleted successfully!", variant: "default" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete gun info.", variant: "destructive" });
    },
  });

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (gun: any) => {
    setForm({
      productName: gun.productName || "",
      guns: gun.guns,
      serialNumber: gun.serialNumber,
      currentReading: gun.currentReading,
    });
    setEditId(gun.id || gun._id);
  };

  const handleCancelEdit = () => {
    setForm({ productName: "", guns: "", serialNumber: "", currentReading: "" });
    setEditId(null);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!form.productName || !form.guns || !form.serialNumber || form.currentReading === "") {
      toast({ title: "Validation Error", description: "All fields are required!", variant: "destructive" });
      return;
    }
    if (editId) updateMutation.mutate({ ...form, id: editId });
    else createMutation.mutate(form);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gun Information Management</h1>
        <p className="text-muted-foreground">Manage and monitor petrol pump dispensers</p>
      </div>

      {/* Stat Cards - Icons on Right */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
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
                  <div className={`${stat.bg} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section - Takes 1 column */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editId ? (
                  <>
                    <Edit className="h-5 w-5" />
                    Edit Gun Info
                  </>
                ) : (
                  <>
                    <Fuel className="h-5 w-5" />
                    Add New Gun
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="empId" className="text-xs uppercase text-muted-foreground">Employee ID</Label>
                  <Input id="empId" name="empId" value={empId} readOnly disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productName" className="text-xs uppercase text-muted-foreground">Product Name *</Label>
                  <Select
                    value={form.productName}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, productName: value }))}
                    disabled={updateMutation.isPending || createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.productName} value={p.productName}>
                          {p.productName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guns" className="text-xs uppercase text-muted-foreground">Gun Name/Number *</Label>
                  <Input
                    id="guns"
                    name="guns"
                    value={form.guns}
                    onChange={handleFormChange}
                    placeholder="e.g. Gun #1"
                    required
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serialNumber" className="text-xs uppercase text-muted-foreground">Serial Number *</Label>
                  <Input
                    id="serialNumber"
                    name="serialNumber"
                    value={form.serialNumber}
                    onChange={handleFormChange}
                    placeholder="e.g. SN123456"
                    required
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentReading" className="text-xs uppercase text-muted-foreground">Current Reading (Liters) *</Label>
                  <Input
                    id="currentReading"
                    name="currentReading"
                    type="number"
                    value={form.currentReading}
                    onChange={handleFormChange}
                    min={0}
                    placeholder="e.g. 1000"
                    step="0.01"
                    required
                    disabled={updateMutation.isPending || createMutation.isPending}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    className="btn-gradient-primary flex-1"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  >
                    {editId
                      ? updateMutation.isPending
                        ? "Updating..."
                        : "Save Changes"
                      : createMutation.isPending
                        ? "Adding..."
                        : "Add Gun"}
                  </Button>
                  {editId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* List Section - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  All Guns ({filteredGuns.length})
                </CardTitle>
                <div className="w-full sm:w-auto">
                  <Input
                    placeholder="Search guns..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full sm:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mb-3 opacity-50 animate-pulse mx-auto" />
                    <p>Loading guns...</p>
                  </div>
                </div>
              ) : filteredGuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  {searchQuery ? (
                    <>
                      <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">No results found</p>
                      <p className="text-sm">Try a different search term</p>
                    </>
                  ) : (
                    <>
                      <Archive className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">No guns registered</p>
                      <p className="text-sm">Add your first gun using the form</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    {pagedGuns.map((gun: any) => (
                      <div
                        key={gun.id || gun._id}
                        className="group p-5 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/30 transition-all duration-300 border border-border hover:border-primary/50 hover:shadow-lg"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-4">
                            {/* Header */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                                <Fuel className="h-4 w-4 text-primary" />
                                <span className="font-bold text-primary">{gun.guns}</span>
                              </div>
                              <Badge variant="outline" className="font-medium">
                                {gun.productName}
                              </Badge>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-accent-soft rounded-lg">
                                  <Barcode className="h-4 w-4 text-accent" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Serial Number</p>
                                  <p className="font-mono font-semibold truncate text-foreground">{gun.serialNumber}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-success-soft rounded-lg">
                                  <Activity className="h-4 w-4 text-success" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Reading</p>
                                  <p className="font-bold text-lg text-success">
                                    {gun.currentReading.toLocaleString()} <span className="text-sm font-normal">L</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(gun)}
                              className="h-9 w-9 p-0 hover:bg-primary hover:text-primary-foreground transition-colors"
                              title="Edit Gun"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(gun.id || gun._id)}
                              className="h-9 w-9 p-0 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              disabled={deleteMutation.isPending}
                              title="Delete Gun"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {filteredGuns.length > GUNS_PER_PAGE && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        Showing <span className="font-semibold text-foreground">{(currentPage - 1) * GUNS_PER_PAGE + 1}</span> to{" "}
                        <span className="font-semibold text-foreground">{Math.min(currentPage * GUNS_PER_PAGE, filteredGuns.length)}</span> of{" "}
                        <span className="font-semibold text-foreground">{filteredGuns.length}</span> guns
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant={currentPage === pageNum ? "default" : "outline"}
                                onClick={() => setCurrentPage(pageNum)}
                                className="h-9 min-w-[36px]"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
