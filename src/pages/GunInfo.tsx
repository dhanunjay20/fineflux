import { useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://fineflux-spring.onrender.com";

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

  // Fetch all guns for org
  const { data: guns = [], isLoading } = useQuery({
    queryKey: ["guninfo", orgId],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/guninfo`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Create GunInfo (empId included in payload for audit/future backend support)
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const url = `${API_BASE}/api/organizations/${orgId}/guninfo`;
      return (await axios.post(url, {
        organizationId: orgId,
        empId, // included for completeness, even if not stored by GunInfo entity
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
        empId, // included for completeness, even if not stored by GunInfo entity
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
    setEditId(gun.id);
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
    <div className="max-w-3xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>
            {editId ? "Edit Gun Info" : "Add Petrol Gun Info"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="empId">Employee ID</Label>
              <Input
                id="empId"
                name="empId"
                value={empId}
                readOnly
                disabled
              />
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
                  <option key={p.productName} value={p.productName}>{p.productName}</option>
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
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-left">Gun Name</th>
                  <th className="p-2 text-left">Serial Number</th>
                  <th className="p-2 text-left">Current Reading</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {guns.map((gun: any) => (
                  <tr key={gun.id}>
                    <td className="p-2">{gun.productName}</td>
                    <td className="p-2">{gun.guns}</td>
                    <td className="p-2">{gun.serialNumber}</td>
                    <td className="p-2">{gun.currentReading}</td>
                    <td className="p-2 flex gap-2">
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
                        onClick={() => deleteMutation.mutate(gun.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
