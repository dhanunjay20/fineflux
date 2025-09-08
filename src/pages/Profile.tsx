import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Clock,
  IndianRupee,
  Edit,
  Save,
  Camera,
  Lock,
  Bell,
  Shield,
} from 'lucide-react';

export default function Profile() {
  const userProfile = {
    id: 'EMP002',
    name: 'Arjun Patel',
    role: 'Cashier',
    email: 'arjun.patel@petrolbunk.com',
    phone: '+91 98765 43212',
    joinDate: '2022-06-20',
    address: '456 Park Street, Mumbai, Maharashtra 400012',
    emergencyContact: '+91 98765 43213',
    salary: 25000,
    shift: 'Morning (8:00 AM - 4:00 PM)',
    department: 'Operations',
    manager: 'Priya Singh',
    status: 'active',
  };

  const attendanceHistory = [
    { date: '2024-01-08', checkIn: '08:30 AM', checkOut: '04:15 PM', hours: '7.75', status: 'present' },
    { date: '2024-01-07', checkIn: '08:45 AM', checkOut: '04:30 PM', hours: '7.75', status: 'present' },
    { date: '2024-01-06', checkIn: '09:00 AM', checkOut: '04:45 PM', hours: '7.75', status: 'late' },
    { date: '2024-01-05', checkIn: '-', checkOut: '-', hours: '0', status: 'absent' },
    { date: '2024-01-04', checkIn: '08:25 AM', checkOut: '04:10 PM', hours: '7.75', status: 'present' },
  ];

  const salaryHistory = [
    { month: 'December 2023', basic: 25000, allowances: 2500, deductions: 1200, net: 26300 },
    { month: 'November 2023', basic: 25000, allowances: 2500, deductions: 800, net: 26700 },
    { month: 'October 2023', basic: 25000, allowances: 2500, deductions: 1500, net: 26000 },
  ];

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      present: 'bg-success-soft text-success',
      late: 'bg-warning-soft text-warning',
      absent: 'bg-destructive-soft text-destructive',
    };
    return <Badge className={colors[status as keyof typeof colors]}>{status.toUpperCase()}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">View and manage your personal information</p>
        </div>
        <Button className="btn-gradient-primary">
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {getUserInitials(userProfile.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">{userProfile.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary-soft text-primary">{userProfile.role}</Badge>
                  <Badge className="bg-success-soft text-success">{userProfile.status.toUpperCase()}</Badge>
                </div>
                <Button variant="outline" size="sm">
                  <Camera className="mr-2 h-4 w-4" />
                  Change Photo
                </Button>
              </div>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee-id">Employee ID</Label>
                <Input id="employee-id" value={userProfile.id} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={userProfile.department} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={userProfile.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={userProfile.phone} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-date">Join Date</Label>
                <Input id="join-date" value={formatDate(userProfile.joinDate)} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift">Shift Timing</Label>
                <Input id="shift" value={userProfile.shift} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={userProfile.address} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency-contact">Emergency Contact</Label>
              <Input id="emergency-contact" value={userProfile.emergencyContact} />
            </div>

            <div className="flex gap-2">
              <Button className="btn-gradient-success">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
              <Button variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month Attendance</span>
                <span className="font-semibold text-success">94.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Working Days</span>
                <span className="font-semibold text-foreground">22</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Days Present</span>
                <span className="font-semibold text-success">21</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Days Absent</span>
                <span className="font-semibold text-destructive">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Late Arrivals</span>
                <span className="font-semibold text-warning">2</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Current Salary</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Basic Salary</span>
                <span className="font-semibold text-foreground">₹{userProfile.salary.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reporting Manager</span>
                <span className="font-semibold text-foreground">{userProfile.manager}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceHistory.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-foreground">{formatDate(record.date)}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.checkIn} - {record.checkOut}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium text-foreground">{record.hours}h</p>
                    {getStatusBadge(record.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salary History */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Salary History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salaryHistory.map((salary, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{salary.month}</p>
                    <p className="font-semibold text-success">₹{salary.net.toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Basic</p>
                      <p className="font-medium">₹{salary.basic.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Allowances</p>
                      <p className="font-medium text-success">+₹{salary.allowances.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deductions</p>
                      <p className="font-medium text-destructive">-₹{salary.deductions.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Settings */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Password & Security</h4>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Two-Factor Authentication
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Notification Preferences</h4>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="mr-2 h-4 w-4" />
                  Email Notifications
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Phone className="mr-2 h-4 w-4" />
                  SMS Alerts
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}