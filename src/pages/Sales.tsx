import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DollarSign,
  Plus,
  CreditCard,
  Banknote,
  TrendingUp,
  Calendar,
  Clock,
  FileText,
} from 'lucide-react';

export default function Sales() {
  const todaySales = [
    { time: '08:30 AM', fuel: 'Petrol Premium', quantity: 25, rate: 110.50, amount: 2762.50, payment: 'cash' },
    { time: '09:15 AM', fuel: 'Diesel', quantity: 40, rate: 95.80, amount: 3832.00, payment: 'card' },
    { time: '09:45 AM', fuel: 'CNG', quantity: 15, rate: 75.60, amount: 1134.00, payment: 'upi' },
    { time: '10:20 AM', fuel: 'Petrol Regular', quantity: 30, rate: 105.20, amount: 3156.00, payment: 'cash' },
    { time: '11:00 AM', fuel: 'Diesel', quantity: 55, rate: 95.80, amount: 5269.00, payment: 'card' },
  ];

  const dailyStats = [
    {
      title: 'Total Sales',
      value: '₹45,280',
      change: '+12% vs yesterday',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Cash Collection',
      value: '₹18,920',
      change: '42% of total',
      icon: Banknote,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Card/UPI',
      value: '₹26,360',
      change: '58% of total',
      icon: CreditCard,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Transactions',
      value: '127',
      change: 'Today',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
  ];

  const getPaymentBadge = (payment: string) => {
    const colors = {
      cash: 'bg-success-soft text-success',
      card: 'bg-primary-soft text-primary',
      upi: 'bg-accent-soft text-accent',
    };
    return <Badge className={colors[payment as keyof typeof colors]}>{payment.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales & Collections</h1>
          <p className="text-muted-foreground">Record sales and track daily collections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Generate DSR
          </Button>
          <Button className="btn-gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Record Sale
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dailyStats.map((stat) => {
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
        {/* Quick Sale Entry */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Sale Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fuel-type">Fuel Type</Label>
              <select className="w-full p-2 border border-border rounded-md bg-background">
                <option>Petrol Premium</option>
                <option>Petrol Regular</option>
                <option>Diesel</option>
                <option>CNG</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (Liters)</Label>
              <Input id="quantity" type="number" placeholder="Enter quantity" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate per Liter</Label>
              <Input id="rate" type="number" placeholder="₹110.50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment">Payment Method</Label>
              <select className="w-full p-2 border border-border rounded-md bg-background">
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
              </select>
            </div>
            <Button className="w-full btn-gradient-success">
              <DollarSign className="mr-2 h-4 w-4" />
              Record Sale
            </Button>
          </CardContent>
        </Card>

        {/* Today's Sales */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySales.map((sale, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground min-w-[80px]">{sale.time}</div>
                    <div>
                      <p className="font-medium text-foreground">{sale.fuel}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.quantity}L × ₹{sale.rate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">₹{sale.amount.toLocaleString()}</p>
                      {getPaymentBadge(sale.payment)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Summary */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Fuel-wise Sales</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Petrol Premium</span>
                  <span className="font-medium">₹12,450</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Petrol Regular</span>
                  <span className="font-medium">₹15,680</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diesel</span>
                  <span className="font-medium">₹16,020</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CNG</span>
                  <span className="font-medium">₹1,130</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Payment Methods</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash</span>
                  <span className="font-medium">₹18,920 (42%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card</span>
                  <span className="font-medium">₹15,200 (34%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UPI</span>
                  <span className="font-medium">₹11,160 (24%)</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Collection Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sales</span>
                  <span className="font-medium text-success">₹45,280</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash in Hand</span>
                  <span className="font-medium text-primary">₹18,920</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Deposits</span>
                  <span className="font-medium text-accent">₹26,360</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}