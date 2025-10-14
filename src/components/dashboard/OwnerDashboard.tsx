import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, Fuel, CreditCard, TrendingUp, DollarSign, AlertTriangle, BarChart3, Eye, RotateCcw,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fineflux-spring.onrender.com';

const safeArray = (v: any) =>
  Array.isArray(v) ? v :
  Array.isArray(v?.content) ? v.content : [];

export function OwnerDashboard() {
  const navigate = useNavigate();
  const orgId = localStorage.getItem("organizationId") || "";

  const [employees, setEmployees] = useState<any[]>([]);
  const [tanks, setTanks] = useState<any[]>([]);
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [loading, setLoading] = useState({ employees: true, tanks: true, borrowers: true });
  const [error, setError] = useState<{ employees: string | null; tanks: string | null; borrowers: string | null }>({ employees: null, tanks: null, borrowers: null });

  const fetchAll = useCallback(() => {
    if (!orgId) {
      setError({
        employees: "No Organization ID",
        tanks: "No Organization ID",
        borrowers: "No Organization ID",
      });
      setLoading({ employees: false, tanks: false, borrowers: false });
      return;
    }
    setLoading({ employees: true, tanks: true, borrowers: true });
    setError({ employees: null, tanks: null, borrowers: null });
    Promise.all([
      axios.get(`${API_BASE}/api/organizations/${orgId}/employees`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/products`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/customers`),
    ])
      .then(([empRes, tankRes, borrowRes]) => {
        setEmployees(safeArray(empRes.data));
        setTanks(safeArray(tankRes.data));
        setBorrowers(safeArray(borrowRes.data));
        setLoading({ employees: false, tanks: false, borrowers: false });
      })
      .catch(err => {
        setError({
          employees: err?.message || 'Error loading employees.',
          tanks: err?.message || 'Error loading inventory.',
          borrowers: err?.message || 'Error loading borrowers.',
        });
        setLoading({ employees: false, tanks: false, borrowers: false });
      });
  }, [orgId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = useMemo(() => ([
    {
      title: 'Total Employees',
      value: loading.employees ? '...' : String(employees.length),
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Active Tanks',
      value: loading.tanks ? '...' : String(tanks.filter((t: any) => t.status).length),
      icon: Fuel,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Total Borrowers',
      value: loading.borrowers ? '...' : String(borrowers.length),
      change: borrowers.length
        ? `₹${borrowers.reduce((sum, b) => sum + (Number(b.amountBorrowed) || 0), 0).toLocaleString()} outstanding`
        : '',
      icon: CreditCard,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      title: 'Monthly Revenue',
      value: '₹0', // Add calculation if backend provides it!
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
  ]), [employees, tanks, borrowers, loading.employees, loading.tanks, loading.borrowers]);

  const tankData = useMemo(() => safeArray(tanks).map((tank: any) => ({
    id: tank.id,
    name: tank.productName,
    capacity: Number(tank.tankCapacity) || 0,
    current: Number(tank.currentLevel) || 0,
    lastRefill: tank.lastUpdated ? new Date(tank.lastUpdated).toLocaleDateString() : '',
    sales: 0 // Replace with real sales per tank if available
  })), [tanks]);

  const recentBorrowers = useMemo(() => safeArray(borrowers).slice(0, 4).map((borrower: any) => ({
    id: borrower.id,
    name: borrower.customerName,
    amount: Number(borrower.amountBorrowed) || 0,
    lastPayment: borrower.borrowDate || '',
    status: borrower.status === 'overdue' ? 'overdue' : 'current',
  })), [borrowers]);

  // ---- Total Stock Value Fix Here ----
  // Replace "ratePerLitre" with your actual price property if different, e.g. "productRate" or "price"
  const financialSummary = useMemo(() => ({
    totalStockValue: safeArray(tanks)
      .reduce(
        (sum: number, tank: any) =>
          sum +
          (Number(tank.currentLevel) || 0) *
          (
            Number(tank.ratePerLitre) ||
            Number(tank.productRate) ||
            Number(tank.price) ||
            0
          ),
        0
      ),
    dailyCollection: safeArray(borrowers)
      .reduce((sum: number, b: any) => sum + (Number(b.amountBorrowed) || 0), 0),
    totalLiabilities: safeArray(borrowers)
      .filter((b: any) => b.status === 'overdue')
      .reduce((sum: number, b: any) => sum + (Number(b.amountBorrowed) || 0), 0),
    netPosition: 0 // Provide real calculation if available.
  }), [tanks, borrowers]);

  const getStockPercentage = (current: number, capacity: number) =>
    capacity ? Math.round((current / capacity) * 100) : 0;

  const getStockStatus = (percentage: number) => {
    if (percentage < 20) return { color: 'text-destructive', bg: 'bg-destructive-soft', label: 'Low' };
    if (percentage < 50) return { color: 'text-warning', bg: 'bg-warning-soft', label: 'Medium' };
    return { color: 'text-success', bg: 'bg-success-soft', label: 'Good' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - mobile-safe stacked layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
            Owner Dashboard
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Complete overview of your petrol bunk operations
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <Button
            onClick={fetchAll}
            variant="outline"
            title="Refresh Data"
            className="w-full sm:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button className="btn-gradient-primary w-full sm:w-auto">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                    <div>
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
        {/* Tank Inventory */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Tank Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading.tanks
              ? <p>Loading tanks...</p>
              : error.tanks
                ? <p className="text-destructive">{error.tanks}</p>
                : tankData.length === 0
                  ? <p>No tanks found.</p>
                  : tankData.map((tank) => {
                      const percentage = getStockPercentage(tank.current, tank.capacity);
                      const status = getStockStatus(percentage);
                      return (
                        <div key={tank.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{tank.name}</p>
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
              {loading.borrowers
                ? <p>Loading borrowers...</p>
                : error.borrowers
                  ? <p className="text-destructive">{error.borrowers}</p>
                  : recentBorrowers.length === 0
                    ? <p>No borrowers found.</p>
                    : recentBorrowers.map((borrower) => (
                        <div key={borrower.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{borrower.name}</p>
                            <p className="text-sm text-muted-foreground">Last payment: {borrower.lastPayment}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-semibold text-foreground">₹{borrower.amount.toLocaleString()}</p>
                            <Badge variant={borrower.status === 'overdue' ? 'destructive' : 'outline'} className="text-xs">
                              {borrower.status === 'overdue'
                                ? (<><AlertTriangle className="mr-1 h-3 w-3" /> Overdue</>)
                                : 'Current'}
                            </Badge>
                          </div>
                        </div>
                      ))}
              {borrowers.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/borrowers')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View All Borrowers
                </Button>
              )}
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
                ₹{financialSummary.totalStockValue.toLocaleString()}
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
