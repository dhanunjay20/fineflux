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
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://fineflux-spring.onrender.com";

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

export default function Settings() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";

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

  const queryClient = useQueryClient();

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
    },
  });

  // Demo data (unchanged sections)
  const fuelTypes = [
    { id: 1, name: "Petrol Premium", price: 110.5, active: true },
    { id: 2, name: "Petrol Regular", price: 105.2, active: true },
    { id: 3, name: "Diesel", price: 95.8, active: true },
    { id: 4, name: "CNG", price: 75.6, active: true },
  ];
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">
            Configure your petrol pump management system
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refetch();
              setEditMode(false);
            }}
            disabled={isLoading}
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
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                className="btn-gradient-success"
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditMode(true)} disabled={isLoading || isError}>
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
                <Input
                  id="addressDisplay"
                  value={addressDisplay}
                  readOnly
                  disabled
                />
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
        {/* Fuel Types & Pricing (demo) */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Fuel Types & Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fuelTypes.map((fuel) => (
              <div
                key={fuel.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Switch defaultChecked={fuel.active} disabled />
                  <div>
                    <p className="font-medium text-foreground">{fuel.name}</p>
                    <p className="text-sm text-muted-foreground">Active fuel type</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">₹</span>
                  <Input
                    className="w-24 text-right"
                    defaultValue={fuel.price.toString()}
                    type="number"
                    step="0.01"
                    disabled
                  />
                </div>
              </div>
            ))}
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
