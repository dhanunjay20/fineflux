import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Fuel,
  CreditCard,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Eye,
} from 'lucide-react';

export function OwnerDashboard() {
  const stats = [
    {
      title: 'Total Employees',
      value: '12',
      change: '+2 this month',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Active Tanks',
      value: '4',
      change: 'All operational',
      icon: Fuel,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Total Borrowers',
      value: '28',
      change: '₹2.4L outstanding',
      icon: CreditCard,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      title: 'Monthly Revenue',
      value: '₹8.2L',
      change: '+12% vs last month',
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
  ];

  const tankData = [
    { id: 1, name: 'Petrol Premium', capacity: 5000, current: 3200, lastRefill: '2024-01-05', sales: 1800 },
    { id: 2, name: 'Petrol Regular', capacity: 8000, current: 6100, lastRefill: '2024-01-03', sales: 1900 },
    { id: 3, name: 'Diesel', capacity: 10000, current: 4200, lastRefill: '2024-01-04', sales: 5800 },
    { id: 4, name: 'CNG', capacity: 3000, current: 2800, lastRefill: '2024-01-06', sales: 200 },
  ];

  const recentBorrowers = [
    { id: 1, name: 'Suresh Transport', amount: 45000, lastPayment: '2024-01-02', status: 'overdue' },
    { id: 2, name: 'City Logistics', amount: 32000, lastPayment: '2024-01-05', status: 'current' },
    { id: 3, name: 'Kumar Travels', amount: 28000, lastPayment: '2024-01-04', status: 'current' },
    { id: 4, name: 'Metro Cab Co.', amount: 15000, lastPayment: '2024-01-06', status: 'current' },
  ];

  const financialSummary = {
    totalStockValue: 1250000,
    dailyCollection: 85000,
    totalLiabilities: 240000,
    netPosition: 1095000,
  };

  const getStockPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getStockStatus = (percentage: number) => {
    if (percentage < 20) return { color: 'text-destructive', bg: 'bg-destructive-soft', label: 'Low' };
    if (percentage < 50) return { color: 'text-warning', bg: 'bg-warning-soft', label: 'Medium' };
    return { color: 'text-success', bg: 'bg-success-soft', label: 'Good' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Owner Dashboard</h1>
          <p className="text-muted-foreground">Complete overview of your petrol bunk operations</p>
        </div>
        <Button className="btn-gradient-primary">
          <BarChart3 className="mr-2 h-4 w-4" />
          View Analytics
        </Button>
      </div>

      {/* Stats Grid */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tank Inventory Overview */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Tank Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tankData.map((tank) => {
              const percentage = getStockPercentage(tank.current, tank.capacity);
              const status = getStockStatus(percentage);
              
              return (
                <div key={tank.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{tank.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tank.current.toLocaleString()}L / {tank.capacity.toLocaleString()}L
                      </p>
                    </div>
                    <Badge variant="outline" className={`${status.color} ${status.bg}`}>
                      {percentage}% • {status.label}
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        percentage < 20 ? 'bg-destructive' : 
                        percentage < 50 ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Last refill: {tank.lastRefill}</span>
                    <span>Sales: {tank.sales}L today</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Borrowers Overview */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Borrowers Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBorrowers.map((borrower) => (
                <div key={borrower.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{borrower.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last payment: {borrower.lastPayment}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-foreground">
                      ₹{borrower.amount.toLocaleString()}
                    </p>
                    <Badge 
                      variant={borrower.status === 'overdue' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {borrower.status === 'overdue' ? (
                        <>
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Overdue
                        </>
                      ) : (
                        'Current'
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                View All Borrowers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Money Management Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Total Stock Value</p>
              <p className="text-2xl font-bold text-primary">
                ₹{(financialSummary.totalStockValue / 100000).toFixed(1)}L
              </p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Daily Collection</p>
              <p className="text-2xl font-bold text-success">
                ₹{(financialSummary.dailyCollection / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Total Liabilities</p>
              <p className="text-2xl font-bold text-warning">
                ₹{(financialSummary.totalLiabilities / 100000).toFixed(1)}L
              </p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Net Position</p>
              <p className="text-2xl font-bold text-accent">
                ₹{(financialSummary.netPosition / 100000).toFixed(1)}L
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}