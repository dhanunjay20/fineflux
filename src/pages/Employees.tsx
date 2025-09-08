import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Plus,
  Search,
  Edit,
  Eye,
  Phone,
  Mail,
  Calendar,
  Filter,
} from 'lucide-react';

export default function Employees() {
  const employees = [
    {
      id: 'EMP001',
      name: 'Priya Singh',
      role: 'Manager',
      email: 'priya.singh@petrolbunk.com',
      phone: '+91 98765 43211',
      joinDate: '2021-03-10',
      salary: 35000,
      status: 'active',
      shift: 'Morning',
    },
    {
      id: 'EMP002',
      name: 'Arjun Patel',
      role: 'Cashier',
      email: 'arjun.patel@petrolbunk.com',
      phone: '+91 98765 43212',
      joinDate: '2022-06-20',
      salary: 25000,
      status: 'active',
      shift: 'Morning',
    },
    {
      id: 'EMP003',
      name: 'Sunita Sharma',
      role: 'Attendant',
      email: 'sunita.sharma@petrolbunk.com',
      phone: '+91 98765 43213',
      joinDate: '2022-11-15',
      salary: 22000,
      status: 'active',
      shift: 'Afternoon',
    },
    {
      id: 'EMP004',
      name: 'Ravi Kumar',
      role: 'Mechanic',
      email: 'ravi.kumar@petrolbunk.com',
      phone: '+91 98765 43214',
      joinDate: '2023-02-28',
      salary: 28000,
      status: 'active',
      shift: 'Morning',
    },
    {
      id: 'EMP005',
      name: 'Maya Singh',
      role: 'Cleaner',
      email: 'maya.singh@petrolbunk.com',
      phone: '+91 98765 43215',
      joinDate: '2023-08-10',
      salary: 18000,
      status: 'inactive',
      shift: 'Evening',
    },
  ];

  const stats = [
    {
      title: 'Total Employees',
      value: employees.length.toString(),
      change: '+2 this month',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Active',
      value: employees.filter(e => e.status === 'active').length.toString(),
      change: 'Currently working',
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Average Salary',
      value: `₹${Math.round(employees.reduce((sum, e) => sum + e.salary, 0) / employees.length / 1000)}K`,
      change: 'Per month',
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
  ];

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-success-soft text-success">Active</Badge>
    ) : (
      <Badge className="bg-muted text-muted-foreground">Inactive</Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      Manager: 'bg-primary-soft text-primary',
      Cashier: 'bg-accent-soft text-accent',
      Attendant: 'bg-success-soft text-success',
      Mechanic: 'bg-warning-soft text-warning',
      Cleaner: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[role as keyof typeof colors] || 'bg-muted text-muted-foreground'}>{role}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground">Manage your team members and their information</p>
        </div>
        <Button className="btn-gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
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

      {/* Filters and Search */}
      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getUserInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{employee.name}</h3>
                      {getRoleBadge(employee.role)}
                      {getStatusBadge(employee.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">ID: {employee.id}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {employee.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {employee.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined: {employee.joinDate}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-foreground">₹{employee.salary.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{employee.shift} Shift</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}