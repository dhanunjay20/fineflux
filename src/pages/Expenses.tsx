import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign,
  Plus,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Receipt,
  Filter,
} from 'lucide-react';

export default function Expenses() {
  const expenses = [
    {
      id: 'EXP001',
      description: 'Generator maintenance and repair',
      amount: 8500,
      category: 'Maintenance',
      date: '2024-01-08',
      time: '14:30',
      requestedBy: 'Priya Singh',
      approvedBy: 'Owner',
      status: 'approved',
      receipt: true,
    },
    {
      id: 'EXP002',
      description: 'Cleaning supplies and materials',
      amount: 2400,
      category: 'Supplies',
      date: '2024-01-08',
      time: '11:20',
      requestedBy: 'Arjun Patel',
      approvedBy: null,
      status: 'pending',
      receipt: false,
    },
    {
      id: 'EXP003',
      description: 'Emergency pump repair',
      amount: 15000,
      category: 'Emergency',
      date: '2024-01-07',
      time: '16:45',
      requestedBy: 'Ravi Kumar',
      approvedBy: 'Manager',
      status: 'approved',
      receipt: true,
    },
    {
      id: 'EXP004',
      description: 'Office stationery purchase',
      amount: 1200,
      category: 'Office',
      date: '2024-01-07',
      time: '10:15',
      requestedBy: 'Maya Singh',
      approvedBy: null,
      status: 'rejected',
      receipt: false,
    },
  ];

  const categories = [
    { name: 'Maintenance', total: 23500, count: 8, color: 'text-warning', bg: 'bg-warning-soft' },
    { name: 'Supplies', total: 12400, count: 15, color: 'text-primary', bg: 'bg-primary-soft' },
    { name: 'Emergency', total: 45000, count: 3, color: 'text-destructive', bg: 'bg-destructive-soft' },
    { name: 'Office', total: 8900, count: 12, color: 'text-success', bg: 'bg-success-soft' },
    { name: 'Utilities', total: 18500, count: 6, color: 'text-accent', bg: 'bg-accent-soft' },
  ];

  const stats = [
    {
      title: 'Total Expenses',
      value: `₹${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`,
      change: 'This month',
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive-soft',
    },
    {
      title: 'Pending Approval',
      value: expenses.filter(e => e.status === 'pending').length.toString(),
      change: 'Awaiting review',
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      title: 'Approved Today',
      value: expenses.filter(e => e.status === 'approved' && e.date === '2024-01-08').length.toString(),
      change: 'Processed',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Average Expense',
      value: `₹${Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length).toLocaleString()}`,
      change: 'Per request',
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
  ];

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-warning-soft text-warning',
      approved: 'bg-success-soft text-success',
      rejected: 'bg-destructive-soft text-destructive',
    };
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
    };
    const Icon = icons[status as keyof typeof icons];
    return (
      <Badge className={colors[status as keyof typeof colors]}>
        <Icon className="mr-1 h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      Maintenance: 'bg-warning-soft text-warning',
      Supplies: 'bg-primary-soft text-primary',
      Emergency: 'bg-destructive-soft text-destructive',
      Office: 'bg-success-soft text-success',
      Utilities: 'bg-accent-soft text-accent',
    };
    return <Badge className={colors[category as keyof typeof colors] || 'bg-muted text-muted-foreground'}>{category}</Badge>;
  };

  const formatDateTime = (date: string, time: string) => {
    return `${new Date(date).toLocaleDateString('en-IN')} ${time}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expense Management</h1>
          <p className="text-muted-foreground">Track and approve business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button className="btn-gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Stats */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Expense Entry */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Expense
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" placeholder="Enter amount" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select className="w-full p-2 border border-border rounded-md bg-background">
                <option>Maintenance</option>
                <option>Supplies</option>
                <option>Emergency</option>
                <option>Office</option>
                <option>Utilities</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Expense description" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt">Receipt</Label>
              <Input id="receipt" type="file" accept="image/*,.pdf" />
            </div>
            <Button className="w-full btn-gradient-warning">
              <Receipt className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`${category.bg} p-2 rounded-lg`}>
                      <DollarSign className={`h-4 w-4 ${category.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{category.name}</p>
                      <p className="text-sm text-muted-foreground">{category.count} expenses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">₹{category.total.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total spent</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-destructive-soft p-3 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{expense.description}</h3>
                      {getCategoryBadge(expense.category)}
                      {getStatusBadge(expense.status)}
                      {expense.receipt && (
                        <Badge className="bg-accent-soft text-accent">
                          <Receipt className="mr-1 h-3 w-3" />
                          Receipt
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">ID: {expense.id}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested by {expense.requestedBy} • {formatDateTime(expense.date, expense.time)}
                    </p>
                    {expense.approvedBy && (
                      <p className="text-xs text-muted-foreground">
                        Approved by {expense.approvedBy}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-destructive">-₹{expense.amount.toLocaleString()}</p>
                  </div>
                  {expense.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-success hover:text-success">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}