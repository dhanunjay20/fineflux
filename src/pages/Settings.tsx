// src/pages/Settings.tsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Database,
  Building,
  Save,
  RefreshCw,
  Edit3,
  X,
  Info,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";

type OrganizationResponse = {
  id?: string;
  organizationId?: string;
  organizationName?: string;
  gstNumber?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  licenseNumber?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
};

type OrgForm = {
  organizationName: string;
  gstNumber: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  licenseNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
};

type Product = {
  id: string;
  productName: string;
  price?: number;
};

type FuelPriceRow = {
  id: string;
  name: string;
  price: string; // keep as string for input control
  saving?: boolean;
  saved?: boolean;
};

export default function Settings() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const empId = localStorage.getItem("empId") || "EMP-DEV-001";

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<OrgForm>({
    organizationName: "",
    gstNumber: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    phoneNumber: "",
    email: "",
    licenseNumber: "",
    ownerFirstName: "",
    ownerLastName: "",
  });

  const [fuelPrices, setFuelPrices] = useState<FuelPriceRow[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch organization by business key
  const {
    data: org,
    isLoading,
    isError,
    refetch,
  } = useQuery<OrganizationResponse>({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      const res = await axios.get(
        `${API_BASE}/api/organizations/by-org-id/${orgId}`
      );
      return res.data;
    },
    enabled: !!orgId,
  });

  // Seed form from server
  useEffect(() => {
    if (!org) return;
    setForm({
      organizationName: org.organizationName ?? "",
      gstNumber: org.gstNumber ?? "",
      address1: org.address1 ?? "",
      address2: org.address2 ?? "",
      city: org.city ?? "",
      state: org.state ?? "",
      country: org.country ?? "",
      postalCode: org.postalCode ?? "",
      phoneNumber: org.phoneNumber ?? "",
      email: org.email ?? "",
      licenseNumber: org.licenseNumber ?? "",
      ownerFirstName: org.ownerFirstName ?? "",
      ownerLastName: org.ownerLastName ?? "",
    });
  }, [org]);

  // Human-readable address (view mode)
  const addressDisplay = useMemo(() => {
    const parts = [
      form.address1,
      form.address2,
      form.city,
      form.state,
      form.country,
      form.postalCode,
    ]
      .map((s) => (s || "").trim())
      .filter((s) => s.length > 0);
    return parts.join(", ");
  }, [form]);

  // Save updates with PUT /api/organizations/{id}
  const updateMutation = useMutation({
    mutationFn: async (payload: OrgForm) => {
      const id = org?.id;
      if (!id) throw new Error("Organization id missing");
      const dto = {
        organizationName: payload.organizationName,
        gstNumber: payload.gstNumber,
        address1: payload.address1,
        address2: payload.address2,
        city: payload.city,
        state: payload.state,
        country: payload.country,
        postalCode: payload.postalCode,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        licenseNumber: payload.licenseNumber,
        ownerFirstName: payload.ownerFirstName,
        ownerLastName: payload.ownerLastName,
      };
      const res = await axios.put(`${API_BASE}/api/organizations/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      setEditMode(false);
      toast({
        title: "Organization updated",
        description: "Company information saved successfully.",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Could not save company information.",
        variant: "destructive",
      });
    },
  });

  // Fetch products for Fuel Types & Pricing
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useQuery<Product[]>({
    queryKey: ["products", orgId],
    queryFn: async () => {
      const res = await axios.get(
        `${API_BASE}/api/organizations/${orgId}/products`
      );
      const arr = Array.isArray(res.data) ? res.data : [];
      return arr;
    },
    enabled: !!orgId,
  });

  // Seed fuelPrices from products
  useEffect(() => {
    if (!products) return;
    setFuelPrices(
      products.map((p) => ({
        id: p.id,
        name: p.productName,
        price: p.price != null ? String(p.price) : "",
        saving: false,
        saved: false,
      }))
    );
  }, [products]);

  // Mutation to update price per product row with toast feedback
  // IMPORTANT: keep hooks at component top-level, not inside event handlers
  const priceMutation = useMutation({
    mutationFn: async ({
      id,
      price,
      empId,
      idx,
      name,
    }: {
      id: string;
      price: number;
      empId: string;
      idx: number;
      name: string;
    }) => {
      // Match Spring controller:
      // PUT /api/organizations/{orgId}/appsettings/products/{productId}/price?price=...&empId=...
      await axios.put(
        `${API_BASE}/api/organizations/${orgId}/appsettings/products/${id}/price`,
        null,
        { params: { price, empId } }
      );
      return { idx, price, name };
    },
    onSuccess: async (_ret, { idx, price, name }) => {
      setFuelPrices((rows) =>
        rows.map((r, i) => (i === idx ? { ...r, saving: false, saved: true } : r))
      );
      // Refresh server list (optional, keeps cache consistent)
      await refetchProducts();
      setTimeout(
        () =>
          setFuelPrices((rows) =>
            rows.map((r, i) => (i === idx ? { ...r, saved: false } : r))
          ),
        1500
      );
      toast({
        title: "Fuel price updated",
        description: `${name} set to ₹${price.toFixed(2)}`,
        variant: "default",
      });
    },
    onError: (_err, { idx, name }) => {
      setFuelPrices((rows) =>
        rows.map((r, i) => (i === idx ? { ...r, saving: false } : r))
      );
      toast({
        title: "Failed to update price",
        description: name
          ? `Could not update ${name}. Please try again.`
          : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const systemSettings = [
    {
      id: "notifications",
      label: "Email Notifications",
      description: "Receive email alerts for important events",
      enabled: true,
    },
    {
      id: "sms",
      label: "SMS Alerts",
      description: "Get SMS notifications for critical alerts",
      enabled: false,
    },
    {
      id: "auto-backup",
      label: "Automatic Backup",
      description: "Automatically backup data daily",
      enabled: true,
    },
    {
      id: "low-stock",
      label: "Low Stock Alerts",
      description: "Alert when fuel stock is below threshold",
      enabled: true,
    },
    {
      id: "dark-mode",
      label: "Dark Mode",
      description: "Use dark theme interface",
      enabled: false,
    },
    {
      id: "audit-log",
      label: "Audit Logging",
      description: "Keep detailed logs of all activities",
      enabled: true,
    },
  ];

  const taxSettings = [
    { name: "GST Rate", value: "18%", editable: true },
    { name: "Service Tax", value: "2%", editable: true },
    { name: "Environmental Cess", value: "1%", editable: false },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header: mobile-safe stacked, no overlap */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
            System Settings
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Configure your petrol pump management system
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              refetch();
              setEditMode(false);
            }}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          {editMode ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  if (org) {
                    setForm({
                      organizationName: org.organizationName ?? "",
                      gstNumber: org.gstNumber ?? "",
                      address1: org.address1 ?? "",
                      address2: org.address2 ?? "",
                      city: org.city ?? "",
                      state: org.state ?? "",
                      country: org.country ?? "",
                      postalCode: org.postalCode ?? "",
                      phoneNumber: org.phoneNumber ?? "",
                      email: org.email ?? "",
                      licenseNumber: org.licenseNumber ?? "",
                      ownerFirstName: org.ownerFirstName ?? "",
                      ownerLastName: org.ownerLastName ?? "",
                    });
                  }
                  setEditMode(false);
                }}
                disabled={updateMutation.isPending}
                className="w-full sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                className="btn-gradient-success w-full sm:w-auto"
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setEditMode(true)}
              disabled={isLoading || isError}
              className="w-full sm:w-auto"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Information */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information {isLoading ? "(Loading...)" : isError ? "(Error)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Top context row (Org ID read-only) */}
            {org?.organizationId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Organization ID: {org.organizationId}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Company Name</Label>
                <Input
                  id="organizationName"
                  value={form.organizationName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, organizationName: e.target.value }))
                  }
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={form.gstNumber}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, gstNumber: e.target.value }))
                  }
                  disabled={!editMode}
                />
              </div>
            </div>

            {/* Address: concatenated in view mode, granular in edit mode */}
            {!editMode ? (
              <div className="space-y-2">
                <Label htmlFor="addressDisplay">Address</Label>
                <Input id="addressDisplay" value={addressDisplay} readOnly disabled />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address1">Address Line 1</Label>
                    <Input
                      id="address1"
                      value={form.address1}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, address1: e.target.value }))
                      }
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address2">Address Line 2</Label>
                    <Input
                      id="address2"
                      value={form.address2}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, address2: e.target.value }))
                      }
                      disabled={!editMode}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, city: e.target.value }))
                      }
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, state: e.target.value }))
                      }
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={form.postalCode}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, postalCode: e.target.value }))
                      }
                      disabled={!editMode}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, country: e.target.value }))
                    }
                    disabled={!editMode}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, phoneNumber: e.target.value }))
                  }
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, email: e.target.value }))
                  }
                  disabled={!editMode}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={form.licenseNumber}
                onChange={(e) =>
                  setForm((s) => ({ ...s, licenseNumber: e.target.value }))
                }
                disabled={!editMode}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerFirstName">Owner First Name</Label>
                <Input
                  id="ownerFirstName"
                  value={form.ownerFirstName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, ownerFirstName: e.target.value }))
                  }
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerLastName">Owner Last Name</Label>
                <Input
                  id="ownerLastName"
                  value={form.ownerLastName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, ownerLastName: e.target.value }))
                  }
                  disabled={!editMode}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Preferences (unchanged visual) */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              System Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemSettings.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{setting.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
                <Switch defaultChecked={setting.enabled} disabled />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Types & Pricing (live, editable) */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Fuel Types & Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingProducts || isProductsError ? (
              <div className="text-sm text-muted-foreground">
                {isLoadingProducts ? "Loading products..." : "Failed to load products"}
              </div>
            ) : fuelPrices.length === 0 ? (
              <div className="text-sm text-muted-foreground">No products found</div>
            ) : (
              fuelPrices.map((fuel, idx) => (
                <div
                  key={fuel.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-foreground">{fuel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Update retail price per liter
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      className="w-24 text-right"
                      type="number"
                      step="0.01"
                      value={fuel.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFuelPrices((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, price: val, saved: false } : r
                          )
                        );
                      }}
                      disabled={fuel.saving}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="ml-2"
                      disabled={
                        fuel.saving ||
                        !empId ||
                        fuel.price.trim() === "" ||
                        isNaN(Number(fuel.price))
                      }
                      onClick={() => {
                        const priceNum = parseFloat(fuel.price);
                        if (isNaN(priceNum)) return;
                        setFuelPrices((rows) =>
                          rows.map((r, i) => (i === idx ? { ...r, saving: true } : r))
                        );
                        priceMutation.mutate({
                          id: fuel.id,
                          price: priceNum,
                          empId,
                          idx,
                          name: fuel.name,
                        });
                      }}
                      title="Save Price"
                    >
                      {fuel.saved ? (
                        <Check className="text-green-600" />
                      ) : fuel.saving ? (
                        <RefreshCw className="animate-spin" />
                      ) : (
                        <Save />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Tax Configuration (demo) */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Tax Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {taxSettings.map((tax, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div>
                  <p className="font-medium text-foreground">{tax.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tax.editable ? "Configurable" : "Government mandated"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {tax.editable ? (
                    <Input className="w-24 text-right" defaultValue={tax.value} />
                  ) : (
                    <span className="font-medium text-foreground">{tax.value}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Notification Settings (demo) */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Email Alerts</h4>
              <div className="space-y-3">
                {["Low Stock Warning", "Daily Sales Report", "Employee Attendance", "System Backup"].map(
                  (alert) => (
                    <div key={alert} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{alert}</span>
                      <Switch defaultChecked disabled />
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">SMS Alerts</h4>
              <div className="space-y-3">
                {["Critical Errors", "Tank Empty", "Security Alerts", "Payment Failures"].map(
                  (alert) => (
                    <div key={alert} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{alert}</span>
                      <Switch disabled />
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Contact Information</h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="alert-email">Alert Email</Label>
                  <Input id="alert-email" type="email" placeholder="alerts@company.com" disabled />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="alert-phone">Alert Phone</Label>
                  <Input id="alert-phone" placeholder="+91 98765 43210" disabled />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Access Control (demo) */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Access Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Password Policy</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Minimum Length: 8 characters</span>
                  <Switch defaultChecked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Require Special Characters</span>
                  <Switch defaultChecked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Password Expiry (90 days)</span>
                  <Switch disabled />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Two-Factor Authentication</span>
                  <Switch disabled />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Session Management</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input id="session-timeout" type="number" defaultValue="30" disabled />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="max-sessions">Max Concurrent Sessions</Label>
                  <Input id="max-sessions" type="number" defaultValue="3" disabled />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Auto-logout on idle</span>
                  <Switch defaultChecked disabled />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
