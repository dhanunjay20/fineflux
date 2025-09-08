import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Fuel,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Calendar,
} from 'lucide-react';

export default function Inventory() {
  const tanks = [
    {
      id: 1,
      name: 'Petrol Premium',
      type: 'petrol',
      capacity: 5000,
      currentStock: 3200,
      lastRefill: '2024-01-05',
      lastRefillAmount: 4000,
      dailySales: 180,
      pricePerLiter: 110.50,
      supplier: 'Indian Oil',
      lastUpdated: '2024-01-08 14:30',
    },
    {
      id: 2,
      name: 'Petrol Regular',
      type: 'petrol',
      capacity: 8000,
      currentStock: 6100,
      lastRefill: '2024-01-03',
      lastRefillAmount: 7000,
      dailySales: 220,
      pricePerLiter: 105.20,
      supplier: 'Indian Oil',
      lastUpdated: '2024-01-08 14:30',
    },
    {
      id: 3,
      name: 'Diesel',
      type: 'diesel',
      capacity: 10000,
      currentStock: 4200,
      lastRefill: '2024-01-04',
      lastRefillAmount: 8500,
      dailySales: 380,
      pricePerLiter: 95.80,
      supplier: 'Bharat Petroleum',
      lastUpdated: '2024-01-08 14:30',
    },
    {
      id: 4,
      name: 'CNG',
      type: 'cng',
      capacity: 3000,
      currentStock: 2800,
      lastRefill: '2024-01-06',
      lastRefillAmount: 2900,
      dailySales: 45,
      pricePerLiter: 75.60,
      supplier: 'Indraprastha Gas',
      lastUpdated: '2024-01-08 14:30',
    },
  ];

  const stats = [
    {
      title: 'Total Capacity',
      value: `${(tanks.reduce((sum, tank) => sum + tank.capacity, 0) / 1000).toFixed(0)}K`,
      change: 'Liters',
      icon: Fuel,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Current Stock',
      value: `${(tanks.reduce((sum, tank) => sum + tank.currentStock, 0) / 1000).toFixed(1)}K`,
      change: 'Liters available',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Daily Sales',
      value: `${tanks.reduce((sum, tank) => sum + tank.dailySales, 0)}L`,
      change: 'Today',
      icon: BarChart3,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Stock Value',
      value: '₹12.5L',
      change: 'Current worth',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
  ];

  const getStockPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getStockStatus = (percentage: number) => {
    if (percentage < 20) return { color: 'text-destructive', bg: 'bg-destructive-soft', label: 'Critical', variant: 'destructive' as const };
    if (percentage < 40) return { color: 'text-warning', bg: 'bg-warning-soft', label: 'Low', variant: 'secondary' as const };
    if (percentage < 70) return { color: 'text-primary', bg: 'bg-primary-soft', label: 'Medium', variant: 'outline' as const };
    return { color: 'text-success', bg: 'bg-success-soft', label: 'Good', variant: 'outline' as const };
  };

  const getTankTypeIcon = (type: string) => {
    return <Fuel className="h-5 w-5" />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tank Inventory</h1>
          <p className="text-muted-foreground">Monitor fuel levels and manage stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Stock
          </Button>
          <Button className="btn-gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Purchase
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

      {/* Tank Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tanks.map((tank) => {
          const percentage = getStockPercentage(tank.currentStock, tank.capacity);
          const status = getStockStatus(percentage);
          
          return (
            <Card key={tank.id} className="card-gradient hover-lift">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTankTypeIcon(tank.type)}
                    <CardTitle className="text-lg">{tank.name}</CardTitle>
                  </div>
                  <Badge variant={status.variant} className={percentage < 20 ? 'animate-pulse' : ''}>
                    {percentage < 20 && <AlertTriangle className="mr-1 h-3 w-3" />}
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stock Level */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stock Level</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{tank.currentStock.toLocaleString()}L</span>
                    <span>{tank.capacity.toLocaleString()}L</span>
                  </div>
                </div>

                {/* Tank Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Daily Sales</p>
                    <p className="font-medium text-foreground">{tank.dailySales}L</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price/Liter</p>
                    <p className="font-medium text-foreground">₹{tank.pricePerLiter}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Refill</p>
                    <p className="font-medium text-foreground">{formatDate(tank.lastRefill)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Supplier</p>
                    <p className="font-medium text-foreground">{tank.supplier}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Update Stock
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Refill
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Last updated: {tank.lastUpdated}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="btn-gradient-primary h-auto p-4 flex-col gap-2">
              <Plus className="h-6 w-6" />
              <span>Record Purchase</span>
            </Button>
            <Button className="btn-gradient-accent h-auto p-4 flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              <span>Stock Report</span>
            </Button>
            <Button className="btn-gradient-success h-auto p-4 flex-col gap-2">
              <AlertTriangle className="h-6 w-6" />
              <span>Low Stock Alerts</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}