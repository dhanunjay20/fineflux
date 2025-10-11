import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// Real API base
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const RUPEE = '\u20B9';

const paymentLabels: any = {
  cash: { label: 'CASH', class: 'bg-success-soft text-success', stat: 'Cash Collection', icon: Banknote },
  card: { label: 'CARD', class: 'bg-primary-soft text-primary', stat: 'Card/UPI', icon: CreditCard },
  upi:  { label: 'UPI',  class: 'bg-accent-soft text-accent', stat: 'Card/UPI', icon: CreditCard },
};

export default function Sales() {
  // In real app, get orgId from context/auth/session/localStorage
  const orgId = localStorage.getItem('organizationId') || 'ORG-DEV-001';
  const queryClient = useQueryClient();

  // Form state for quick entry
  const [form, setForm] = useState({
    fuel: '',      // productName
    quantity: '',
    rate: '',
    payment: 'cash',
    employeeId: localStorage.getItem('empId') || '', // required by backend!
  });

  // Fetch sales list
  const { data: sales = [], isLoading, refetch } = useQuery({
    queryKey: ['sales', orgId],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/sales`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Fetch available products for dropdown (using gun/product repo pattern logic)
  const { data: products = [] } = useQuery({
    queryKey: ['products', orgId],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/products`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // -- Stats computed from sales
  const stats = useMemo(() => {
    let total = 0, cash = 0, cardUpi = 0;
    let transactions = sales.length;
    let paymentCount = { cash: 0, card: 0, upi: 0 };
    sales.forEach((sale) => {
      total += sale.salesInRupees || 0;
      const pay = (sale.paymentMethod || 'cash');
      if (pay === 'card' || pay === 'upi') cardUpi += sale.salesInRupees || 0;
      else cash += sale.salesInRupees || 0;
      paymentCount[pay] = (paymentCount[pay] || 0) + 1;
    });
    // Write proper percentages:
    const totalPct = total ? (x: number) => Math.round(x / total * 100) : () => 0;
    return [
      { title: 'Total Sales', value: `${RUPEE}${total.toLocaleString()}`, change: '', icon: DollarSign, color: 'text-success', bgColor: 'bg-success-soft' },
      { title: 'Cash Collection', value: `${RUPEE}${cash.toLocaleString()}`, change: `${totalPct(cash)}% of total`, icon: Banknote, color: 'text-primary', bgColor: 'bg-primary-soft' },
      { title: 'Card/UPI', value: `${RUPEE}${cardUpi.toLocaleString()}`, change: `${totalPct(cardUpi)}% of total`, icon: CreditCard, color: 'text-accent', bgColor: 'bg-accent-soft' },
      { title: 'Transactions', value: transactions.toString(), change: 'Today', icon: TrendingUp, color: 'text-success', bgColor: 'bg-success-soft' },
    ];
  }, [sales]);

  // -- Daily summary by product/payment method
  const summary = useMemo(() => {
    const productMap: any = {};
    const paymentMap: any = {};
    let total = 0;
    sales.forEach((sale) => {
      const prod = sale.productName || 'Other';
      const pay = sale.paymentMethod || 'cash';
      productMap[prod] = (productMap[prod] || 0) + (sale.salesInRupees || 0);
      paymentMap[pay] = (paymentMap[pay] || 0) + (sale.salesInRupees || 0);
      total += sale.salesInRupees || 0;
    });
    const outProducts =
      Object.entries(productMap).map(([k, v]) => ({ name: k, value: v }));
    const outPayments = ['cash', 'card', 'upi'].map(key => ({
      label: paymentLabels[key].label, value: paymentMap[key] || 0, pct: total ? Math.round((paymentMap[key] || 0) / total * 100) : 0
    }));
    return {
      products: outProducts,
      payments: outPayments,
      total,
      cash: paymentMap['cash'] || 0,
      bank: (paymentMap['card'] || 0) + (paymentMap['upi'] || 0)
    };
  }, [sales]);

  // -- Last N sales in reverse order (today's sales)
  const todaySales = useMemo(() => (sales.slice().reverse().slice(0, 10)), [sales]);

  // -- Save (mutation) for entry form
  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const dto = {
        organizationId: orgId,
        employeeId: body.employeeId,
        openingStock: 0, // Not in quick form
        closingStock: 0, // Not in quick form
        testingTotal: 0,
        salesInLiters: Number(body.quantity),
        price: Number(body.rate),
        salesInRupees: Number(body.quantity) * Number(body.rate),
        productName: body.fuel,
        paymentMethod: body.payment,
      };
      const url = `${API_BASE}/api/organizations/${orgId}/sales`;
      return (await axios.post(url, dto)).data;
    },
    onSuccess: () => {
      refetch();
      setForm({ ...form, quantity: '', rate: '' });
    }
  });

  // -- Payment badge component
  const getPaymentBadge = (payment: string) => {
    const colors = paymentLabels[payment] ? paymentLabels[payment].class : 'bg-muted text-muted-foreground';
    return <Badge className={colors}>{(payment || '').toUpperCase()}</Badge>;
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!form.fuel || !form.quantity || !form.rate || !form.payment || !form.employeeId) return;
    createMutation.mutate(form);
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
        {/* Quick Sale Entry */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Sale Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="fuel-type">Fuel Type</Label>
                <select
                  className="w-full p-2 border border-border rounded-md bg-background"
                  name="fuel"
                  value={form.fuel}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select Fuel</option>
                  {products.map((p: any) => (
                    <option key={p.productName} value={p.productName}>{p.productName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (Liters)</Label>
                <Input id="quantity" name="quantity" type="number" min="0" placeholder="Enter quantity" value={form.quantity} onChange={handleFormChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Rate per Liter</Label>
                <Input id="rate" name="rate" type="number" min="0" placeholder="₹110.50" value={form.rate} onChange={handleFormChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment">Payment Method</Label>
                <select className="w-full p-2 border border-border rounded-md bg-background" name="payment" value={form.payment} onChange={handleFormChange} required>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <Button className="w-full btn-gradient-success" type="submit" disabled={createMutation.isPending}>
                <DollarSign className="mr-2 h-4 w-4" />
                {createMutation.isPending ? "Recording..." : "Record Sale"}
              </Button>
            </form>
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
              {isLoading ? (
                <div className="text-muted-foreground">Loading sales...</div>
              ) : todaySales.length === 0 ? (
                <div className="text-muted-foreground">No sales entries today.</div>
              ) : todaySales.map((sale: any, index: number) => (
                <div key={sale.id || index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground min-w-[80px]">
                      {(sale.dateTime ? new Date(sale.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--')}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{sale.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.salesInLiters}L × ₹{sale.price}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">₹{(sale.salesInRupees || 0).toLocaleString()}</p>
                      {getPaymentBadge(sale.paymentMethod)}
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
                {summary.products.map((prod: any) =>
                  <div key={prod.name} className="flex justify-between">
                    <span className="text-muted-foreground">{prod.name}</span>
                    <span className="font-medium">{RUPEE}{prod.value.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Payment Methods</h4>
              <div className="space-y-2">
                {summary.payments.map((pay: any) =>
                  <div key={pay.label} className="flex justify-between">
                    <span className="text-muted-foreground">{pay.label}</span>
                    <span className="font-medium">{RUPEE}{pay.value.toLocaleString()} ({pay.pct}%)</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Collection Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sales</span>
                  <span className="font-medium text-success">{RUPEE}{summary.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash in Hand</span>
                  <span className="font-medium text-primary">{RUPEE}{summary.cash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Deposits</span>
                  <span className="font-medium text-accent">{RUPEE}{summary.bank.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
