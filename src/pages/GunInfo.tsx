import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit, Box, Archive, Layers, Database } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const GUNS_PER_PAGE = 5;

export default function GunInfo() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const empId = localStorage.getItem("empId") || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch available product names for dropdown
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

  // Pagination state for guns table
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all guns for org
  const { data: guns = [], isLoading } = useQuery({
    queryKey: ["guninfo", orgId],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/guninfo`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Stats cards
  const statCards = useMemo(() => {
    const totalProducts = products.length;
    const totalGuns = guns.length;
    const distinctProductNames = new Set(guns.map((g: any) => g.productName)).size;
    const avgGunsPerProduct = distinctProductNames ? (totalGuns / distinctProductNames).toFixed(1) : "0.0";
    return [
      { title: "Products", value: totalProducts, icon: Box, bg: "bg-primary/10", color: "text-primary" },
      { title: "Guns", value: totalGuns, icon: Archive, bg: "bg-success/10", color: "text-green-600" },
    ];
  }, [products, guns]);

  // Ensure currentPage stays in range when data changes
  const totalPages = Math.ceil(guns.length / GUNS_PER_PAGE) || 1;
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (guns.length === 0 && currentPage !== 1) setCurrentPage(1);
  }, [guns.length, totalPages, currentPage]);

  // Paginated slice
  const pagedGuns = guns.slice((currentPage - 1) * GUNS_PER_PAGE, currentPage * GUNS_PER_PAGE);

  // Create GunInfo
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const url = `${API_BASE}/api/organizations/${orgId}/guninfo`;
      return (await axios.post(url, {
        organizationId: orgId,
        empId, // included for audit trail if backend supports it
        productName: payload.productName,
        guns: payload.guns,
        serialNumber: payload.serialNumber,
        currentReading: Number(payload.currentReading),
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });
      setForm({ productName: "", guns: "", serialNumber: "", currentReading: "" });
      toast({ title: "Added Gun Info", description: "New gun added successfully.", variant: "default" });
    },
    onError: () => {
      toast({ title: "Failed to add Gun Info", variant: "destructive" });
    },
  });

  // Update GunInfo
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
      toast({ title: "Updated Gun Info", description: "Changes saved.", variant: "default" });
    },
    onError: () => {
      toast({ title: "Failed to update Gun Info", variant: "destructive" });
    },
  });

  // Delete GunInfo
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `${API_BASE}/api/organizations/${orgId}/guninfo/${id}`;
      await axios.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });
      // Adjust pagination if we deleted the last item on the current page
      setCurrentPage((p) => {
        const newTotal = guns.length - 1;
        const newPages = Math.max(1, Math.ceil(newTotal / GUNS_PER_PAGE));
        return Math.min(p, newPages);
      });
      toast({ title: "Deleted Gun Info", variant: "default" });
    },
    onError: () => {
      toast({ title: "Failed to delete Gun Info", variant: "destructive" });
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
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    if (editId) updateMutation.mutate({ ...form, id: editId });
    else createMutation.mutate(form);
  };

  return (
    <div className="max-w-6xl mx-auto px-2 space-y-6">
      {/* Top Stat Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift bg-background">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
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


      <div className="flex flex-col md:flex-row gap-6">
        {/* 40% - Form Section */}
        <div className="w-full md:basis-2/5">
          <Card>
            <CardHeader>
              <CardTitle>{editId ? "Edit Gun Info" : "Add Petrol Gun Info"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="empId">Employee ID</Label>
                  <Input id="empId" name="empId" value={empId} readOnly disabled />
                </div>
                <div>
                  <Label htmlFor="productName">Product Name</Label>
                  <select
                    id="productName"
                    name="productName"
                    value={form.productName}
                    onChange={handleFormChange}
                    required
                    disabled={updateMutation.isPending || createMutation.isPending}
                    className="w-full border p-2 rounded-md bg-background"
                  >
                    <option value="">Select Product</option>
                    {products.map((p: any) => (
                      <option key={p.productName} value={p.productName}>
                        {p.productName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="guns">Gun Name/No</Label>
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
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
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
                <div>
                  <Label htmlFor="currentReading">Current Reading</Label>
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
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="btn-gradient-primary"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  >
                    {editId
                      ? updateMutation.isPending
                        ? "Updating..."
                        : "Save"
                      : createMutation.isPending
                        ? "Saving..."
                        : "Add Gun Info"}
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

        {/* 60% - Guns List Section */}
        <div className="w-full md:basis-3/5">
          <Card>
            <CardHeader>
              <CardTitle>All Petrol Guns</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading guns...</div>
              ) : guns.length === 0 ? (
                <div>No guns found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto w-full">
                    <table className="min-w-full text-sm border text-center">
                      <thead>
                        <tr className="bg-muted">
                          <th className="p-2">Product</th>
                          <th className="p-2">Gun Name</th>
                          <th className="p-2">Serial Number</th>
                          <th className="p-2">Current Reading</th>
                          <th className="p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedGuns.map((gun: any) => (
                          <tr key={gun.id || gun._id}>
                            <td className="p-2">{gun.productName}</td>
                            <td className="p-2">{gun.guns}</td>
                            <td className="p-2">{gun.serialNumber}</td>
                            <td className="p-2">{gun.currentReading}</td>
                            <td className="p-2">
                              <div className="flex justify-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => handleEdit(gun)}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(gun.id || gun._id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  {guns.length > GUNS_PER_PAGE && (
                    <div className="flex justify-center items-center gap-4 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Prev
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page <b>{currentPage}</b> of <b>{totalPages}</b>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
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
