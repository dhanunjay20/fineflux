import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Mail,
  Phone,
  MapPin,
  Building,
  Save,
  RefreshCw,
} from 'lucide-react';

export default function Settings() {
  const companyInfo = {
    name: 'Shree Krishna Petrol Pump',
    address: '123 Main Highway, Mumbai, Maharashtra 400001',
    phone: '+91 98765 43210',
    email: 'info@krishnapetrol.com',
    gstNumber: '27ABCDE1234F1Z5',
    licenseNumber: 'HP-MH-2024-001',
  };

  const fuelTypes = [
    { id: 1, name: 'Petrol Premium', price: 110.50, active: true },
    { id: 2, name: 'Petrol Regular', price: 105.20, active: true },
    { id: 3, name: 'Diesel', price: 95.80, active: true },
    { id: 4, name: 'CNG', price: 75.60, active: true },
  ];

  const systemSettings = [
    { id: 'notifications', label: 'Email Notifications', description: 'Receive email alerts for important events', enabled: true },
    { id: 'sms', label: 'SMS Alerts', description: 'Get SMS notifications for critical alerts', enabled: false },
    { id: 'auto-backup', label: 'Automatic Backup', description: 'Automatically backup data daily', enabled: true },
    { id: 'low-stock', label: 'Low Stock Alerts', description: 'Alert when fuel stock is below threshold', enabled: true },
    { id: 'dark-mode', label: 'Dark Mode', description: 'Use dark theme interface', enabled: false },
    { id: 'audit-log', label: 'Audit Logging', description: 'Keep detailed logs of all activities', enabled: true },
  ];

  const taxSettings = [
    { name: 'GST Rate', value: '18%', editable: true },
    { name: 'Service Tax', value: '2%', editable: true },
    { name: 'Environmental Cess', value: '1%', editable: false },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Configure your petrol pump management system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
          <Button className="btn-gradient-success">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Information */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" defaultValue={companyInfo.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst-number">GST Number</Label>
                <Input id="gst-number" defaultValue={companyInfo.gstNumber} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" defaultValue={companyInfo.address} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" defaultValue={companyInfo.phone} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue={companyInfo.email} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="license">License Number</Label>
              <Input id="license" defaultValue={companyInfo.licenseNumber} />
            </div>
          </CardContent>
        </Card>

        {/* System Preferences */}
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
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
                <Switch defaultChecked={setting.enabled} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Types & Pricing */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Fuel Types & Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fuelTypes.map((fuel) => (
              <div key={fuel.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Switch defaultChecked={fuel.active} />
                  <div>
                    <p className="font-medium text-foreground">{fuel.name}</p>
                    <p className="text-sm text-muted-foreground">Active fuel type</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">₹</span>
                  <Input
                    className="w-20 text-right"
                    defaultValue={fuel.price.toString()}
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tax Configuration */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Tax Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {taxSettings.map((tax, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-foreground">{tax.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tax.editable ? 'Configurable' : 'Government mandated'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {tax.editable ? (
                    <Input
                      className="w-20 text-right"
                      defaultValue={tax.value}
                    />
                  ) : (
                    <span className="font-medium text-foreground">{tax.value}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Notification Settings */}
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
                {['Low Stock Warning', 'Daily Sales Report', 'Employee Attendance', 'System Backup'].map((alert) => (
                  <div key={alert} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{alert}</span>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">SMS Alerts</h4>
              <div className="space-y-3">
                {['Critical Errors', 'Tank Empty', 'Security Alerts', 'Payment Failures'].map((alert) => (
                  <div key={alert} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{alert}</span>
                    <Switch />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Contact Information</h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="alert-email">Alert Email</Label>
                  <Input id="alert-email" type="email" placeholder="alerts@company.com" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="alert-phone">Alert Phone</Label>
                  <Input id="alert-phone" placeholder="+91 98765 43210" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
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
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Require Special Characters</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Password Expiry (90 days)</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Two-Factor Authentication</span>
                  <Switch />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Session Management</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input id="session-timeout" type="number" defaultValue="30" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="max-sessions">Max Concurrent Sessions</Label>
                  <Input id="max-sessions" type="number" defaultValue="3" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Auto-logout on idle</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}