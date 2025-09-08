import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export default function Borrowers() {
  const borrowers = [
    {
      id: 'BOR001',
      name: 'Rajesh Kumar',
      phone: '+91 98765 43216',
      email: 'rajesh.kumar@gmail.com',
      totalBorrowed: 25000,
      totalRepaid: 18000,
      outstanding: 7000,
      lastBorrowed: '2024-01-05',
      lastRepayment: '2024-01-07',
      status: 'active',
      creditLimit: 30000,
    },
    {
      id: 'BOR002',
      name: 'Priya Sharma',
      phone: '+91 98765 43217',
      email: 'priya.sharma@gmail.com',
      totalBorrowed: 15000,
      totalRepaid: 15000,
      outstanding: 0,
      lastBorrowed: '2023-12-20',
      lastRepayment: '2024-01-03',
      status: 'paid',
      creditLimit: 20000,
    },
    {
      id: 'BOR003',
      name: 'Amit Singh',
      phone: '+91 98765 43218',
      email: 'amit.singh@gmail.com',
      totalBorrowed: 40000,
      totalRepaid: 25000,
      outstanding: 15000,
      lastBorrowed: '2024-01-02',
      lastRepayment: '2024-01-06',
      status: 'overdue',
      creditLimit: 35000,
    },
  ];

  const stats = [
    {
      title: 'Total Borrowers',
      value: borrowers.length.toString(),
      change: 'Active accounts',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Outstanding Amount',
      value: `₹${borrowers.reduce((sum, b) => sum + b.outstanding, 0).toLocaleString()}`,
      change: 'To be collected',
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      title: 'Total Borrowed',
      value: `₹${borrowers.reduce((sum, b) => sum + b.totalBorrowed, 0).toLocaleString()}`,
      change: 'All time',
      icon: IndianRupee,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Collection Rate',
      value: '73%',
      change: 'Recovery rate',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
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
    const colors = {
      active: 'bg-primary-soft text-primary',
      paid: 'bg-success-soft text-success',
      overdue: 'bg-destructive-soft text-destructive',
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
          <h1 className="text-3xl font-bold text-foreground">Borrower Management</h1>
          <p className="text-muted-foreground">Track loans and manage customer credit</p>
        </div>
        <Button className="btn-gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Borrower
        </Button>
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
        {/* Quick Loan Entry */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Quick Loan Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="borrower">Select Borrower</Label>
              <select className="w-full p-2 border border-border rounded-md bg-background">
                <option>Select borrower...</option>
                {borrowers.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Loan Amount</Label>
              <Input id="amount" type="number" placeholder="Enter amount" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input id="purpose" placeholder="Reason for loan" />
            </div>
            <Button className="w-full btn-gradient-warning">
              <TrendingDown className="mr-2 h-4 w-4" />
              Record Loan
            </Button>
          </CardContent>
        </Card>

        {/* Borrower List */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Borrower Accounts</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search borrowers..." className="pl-10 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {borrowers.map((borrower) => (
                <div key={borrower.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getUserInitials(borrower.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{borrower.name}</h3>
                        {getStatusBadge(borrower.status)}
                        {borrower.outstanding > borrower.creditLimit * 0.8 && (
                          <Badge className="bg-warning-soft text-warning">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Near Limit
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">ID: {borrower.id}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {borrower.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {borrower.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right space-y-1">
                      <p className="font-semibold text-foreground">₹{borrower.outstanding.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-xs text-muted-foreground">
                        Limit: ₹{borrower.creditLimit.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'repayment', borrower: 'Rajesh Kumar', amount: 5000, date: '2024-01-07 14:30' },
              { type: 'loan', borrower: 'Amit Singh', amount: 8000, date: '2024-01-06 11:20' },
              { type: 'repayment', borrower: 'Priya Sharma', amount: 3000, date: '2024-01-05 16:45' },
            ].map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    transaction.type === 'repayment' 
                      ? 'bg-success-soft text-success' 
                      : 'bg-warning-soft text-warning'
                  }`}>
                    {transaction.type === 'repayment' ? 
                      <TrendingUp className="h-4 w-4" /> : 
                      <TrendingDown className="h-4 w-4" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {transaction.type === 'repayment' ? 'Repayment from' : 'Loan to'} {transaction.borrower}
                    </p>
                    <p className="text-sm text-muted-foreground">{transaction.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'repayment' ? 'text-success' : 'text-warning'
                  }`}>
                    {transaction.type === 'repayment' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}