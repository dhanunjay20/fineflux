import { useState, useMemo, useTransition, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarDays, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Download, 
  Droplets, 
  Users,
  FileText,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';
const RUPEE = '₹';

// Indian number format helper
const formatIndianNumber = (num: number): string => {
  return num.toLocaleString('en-IN');
};

export default function Analytics() {
  const orgId = localStorage.getItem('organizationId') || '';
  const [timeRange, setTimeRange] = useState('30d');
  const [isPending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = dayjs();
    switch (timeRange) {
      case '7d':
        return { from: now.subtract(7, 'day'), to: now };
      case '30d':
        return { from: now.subtract(30, 'day'), to: now };
      case '90d':
        return { from: now.subtract(90, 'day'), to: now };
      case '1y':
        return { from: now.subtract(1, 'year'), to: now };
      default:
        return { from: now.subtract(30, 'day'), to: now };
    }
  };

  const { from, to } = getDateRange();
  const fromIso = from.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
  const toIso = to.endOf('day').format('YYYY-MM-DDTHH:mm:ss');

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Sales with real-time updates (FIXED ENDPOINT)
  const { data: salesData = [], isLoading: loadingSales, isFetching: fetchingSales, refetch: refetchSales } = useQuery({
    queryKey: ['sales-analytics', orgId, fromIso, toIso, lastRefresh],
    queryFn: async () => {
      const params = `from=${fromIso}&to=${toIso}`;
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/sales/by-date?${params}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Transform sales data to match expected format
  const salesHistory = useMemo(() => {
    return salesData.map((sale: any) => ({
      ...sale,
      salesInRupees: sale.totalAmount || sale.salesInRupees || 0,
      salesInLiters: sale.quantity || sale.salesInLiters || 0,
      productName: sale.productName || sale.product || 'Unknown',
      dateTime: sale.saleDate || sale.dateTime || sale.createdAt
    }));
  }, [salesData]);

  // Fetch Expenses with real-time updates
  const { data: expenses = [], isLoading: loadingExpenses, refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses-analytics', orgId, lastRefresh],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/expenses`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch Latest Finance Summary with real-time updates
  const { data: financeSummary, isLoading: loadingFinance, refetch: refetchFinance } = useQuery({
    queryKey: ['finance-summary-latest', orgId, lastRefresh],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/finance-summary/latest`);
      return res.data;
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Manual refresh all data
  const handleRefresh = () => {
    refetchSales();
    refetchExpenses();
    refetchFinance();
    setLastRefresh(new Date());
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = salesHistory.reduce((sum, s) => sum + (s.salesInRupees || 0), 0);
    const totalExpenses = expenses
      .filter(e => {
        if (!e.expenseDate) return false;
        const expDate = dayjs(e.expenseDate);
        return expDate.isAfter(from) && expDate.isBefore(to);
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalLiters = salesHistory.reduce((sum, s) => sum + (s.salesInLiters || 0), 0);

    return { totalRevenue, netProfit, totalExpenses, totalLiters };
  }, [salesHistory, expenses, from, to]);

  // Monthly Sales & Profit Data (for line chart)
  const monthlySalesData = useMemo(() => {
    const monthlyMap: Record<string, { sales: number; expenses: number; profit: number }> = {};

    salesHistory.forEach(sale => {
      const month = dayjs(sale.dateTime).format('MMM YY');
      if (!monthlyMap[month]) monthlyMap[month] = { sales: 0, expenses: 0, profit: 0 };
      monthlyMap[month].sales += sale.salesInRupees || 0;
    });

    expenses.forEach(exp => {
      if (!exp.expenseDate) return;
      const expDate = dayjs(exp.expenseDate);
      if (expDate.isAfter(from) && expDate.isBefore(to)) {
        const month = expDate.format('MMM YY');
        if (!monthlyMap[month]) monthlyMap[month] = { sales: 0, expenses: 0, profit: 0 };
        monthlyMap[month].expenses += exp.amount || 0;
      }
    });

    return Object.entries(monthlyMap)
      .map(([name, data]) => ({
        name,
        sales: Math.round(data.sales),
        expenses: Math.round(data.expenses),
        profit: Math.round(data.sales - data.expenses),
      }))
      .sort((a, b) => dayjs(a.name, 'MMM YY').unix() - dayjs(b.name, 'MMM YY').unix())
      .slice(-6);
  }, [salesHistory, expenses, from, to]);

  // Fuel Type Distribution (Pie Chart)
  const fuelTypeData = useMemo(() => {
    const fuelMap: Record<string, number> = {};
    salesHistory.forEach(sale => {
      const product = sale.productName || 'Unknown';
      fuelMap[product] = (fuelMap[product] || 0) + (sale.salesInRupees || 0);
    });

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    return Object.entries(fuelMap).map(([name, value], idx) => ({
      name,
      value: Math.round(value),
      color: colors[idx % colors.length],
    }));
  }, [salesHistory]);

  // Daily Sales (Last 7 days - Bar Chart) - FIXED
  const dailySalesData = useMemo(() => {
    const today = dayjs();
    const last7Days = Array.from({ length: 7 }, (_, i) => today.subtract(6 - i, 'day'));
    
    return last7Days.map(day => {
      const dayStr = day.format('DD MMM');
      const daySales = salesHistory.filter(s => {
        const saleDate = dayjs(s.dateTime);
        return saleDate.isSame(day, 'day');
      });
      
      // Group by product
      const productMap: Record<string, number> = {};
      let totalDaySales = 0;
      
      daySales.forEach(s => {
        const product = (s.productName || 'Unknown').trim();
        const amount = Number(s.salesInRupees) || 0;
        productMap[product] = (productMap[product] || 0) + amount;
        totalDaySales += amount;
      });

      // Create result with normalized product keys
      const result: Record<string, any> = { 
        day: dayStr,
        total: Math.round(totalDaySales)
      };
      
      // Add each product with normalized key
      Object.entries(productMap).forEach(([product, amount]) => {
        const key = product.toLowerCase().replace(/\s+/g, '');
        result[key] = Math.round(amount);
      });

      return result;
    });
  }, [salesHistory]);

  // Get all unique products for bar chart
  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    dailySalesData.forEach(day => {
      Object.keys(day).forEach(key => {
        if (key !== 'day' && key !== 'total') {
          products.add(key);
        }
      });
    });
    return Array.from(products);
  }, [dailySalesData]);

  // Export as CSV
  const exportToCSV = () => {
    const headers = ['Metric', 'Value'];
    const kpiRows = [
      ['Total Revenue', `${RUPEE}${formatIndianNumber(kpis.totalRevenue)}`],
      ['Net Profit', `${RUPEE}${formatIndianNumber(kpis.netProfit)}`],
      ['Total Expenses', `${RUPEE}${formatIndianNumber(kpis.totalExpenses)}`],
      ['Fuel Sold (Liters)', formatIndianNumber(kpis.totalLiters)],
      ['Total Transactions', salesHistory.length.toString()],
    ];

    const csvContent = [
      headers.join(','),
      ...kpiRows.map(row => row.join(',')),
      '',
      'Monthly Sales Data',
      'Month,Sales,Expenses,Profit',
      ...monthlySalesData.map(m => `${m.name},${m.sales},${m.expenses},${m.profit}`),
      '',
      'Fuel Distribution',
      'Product,Revenue',
      ...fuelTypeData.map(f => `${f.name},${f.value}`),
      '',
      `Exported: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
      `Period: ${from.format('YYYY-MM-DD')} to ${to.format('YYYY-MM-DD')}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${orgId}-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as PDF
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report - ${dayjs().format('DD MMM YYYY')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #3b82f6; color: white; }
          .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .kpi-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .kpi-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .section { margin: 30px 0; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <h1>Analytics Report - ${orgId}</h1>
        <p>Generated: ${dayjs().format('DD MMMM YYYY, HH:mm')}</p>
        <p>Period: ${from.format('DD MMM YYYY')} to ${to.format('DD MMM YYYY')}</p>
        
        <div class="section">
          <h2>Key Performance Indicators</h2>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div>Total Revenue</div>
              <div class="kpi-value">${RUPEE}${formatIndianNumber(kpis.totalRevenue)}</div>
            </div>
            <div class="kpi-card">
              <div>Net Profit</div>
              <div class="kpi-value">${RUPEE}${formatIndianNumber(kpis.netProfit)}</div>
            </div>
            <div class="kpi-card">
              <div>Fuel Sold</div>
              <div class="kpi-value">${formatIndianNumber(kpis.totalLiters)} L</div>
            </div>
            <div class="kpi-card">
              <div>Transactions</div>
              <div class="kpi-value">${salesHistory.length}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Monthly Sales Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Sales</th>
                <th>Expenses</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              ${monthlySalesData.map(m => `
                <tr>
                  <td>${m.name}</td>
                  <td>${RUPEE}${formatIndianNumber(m.sales)}</td>
                  <td>${RUPEE}${formatIndianNumber(m.expenses)}</td>
                  <td>${RUPEE}${formatIndianNumber(m.profit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Fuel Type Distribution</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${fuelTypeData.map(f => `
                <tr>
                  <td>${f.name}</td>
                  <td>${RUPEE}${formatIndianNumber(f.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Finance Summary</h2>
          ${financeSummary ? `
            <table>
              <tbody>
                <tr><td><strong>Cash Received</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.cashReceived || 0)}</td></tr>
                <tr><td><strong>UPI/PhonePe</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.phonePay || 0)}</td></tr>
                <tr><td><strong>Credit Card</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.creditCard || 0)}</td></tr>
                <tr><td><strong>Total Expenses</strong></td><td>${RUPEE}${formatIndianNumber(financeSummary.totalExpenses || 0)}</td></tr>
                <tr style="background: #f0f0f0;"><td><strong>Net Total</strong></td><td><strong>${RUPEE}${formatIndianNumber(financeSummary.total || 0)}</strong></td></tr>
              </tbody>
            </table>
          ` : '<p>No finance summary available</p>'}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Handle time range change with transition
  const handleTimeRangeChange = (value: string) => {
    startTransition(() => {
      setTimeRange(value);
    });
  };

  const isLoading = loadingSales || loadingExpenses || loadingFinance;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading real-time analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Comprehensive business insights and performance metrics
            {fetchingSales && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {lastRefresh.toLocaleTimeString('en-IN')} • Auto-refreshes every 30 seconds
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={fetchingSales}
            className="hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${fetchingSales ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Select value={timeRange} onValueChange={handleTimeRangeChange} disabled={isPending || fetchingSales}>
            <SelectTrigger className="w-[180px]">
              <CalendarDays className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Loading overlay when fetching */}
      {(isPending || fetchingSales) && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading real-time data...</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {RUPEE}{formatIndianNumber(kpis.totalRevenue)}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : timeRange === '90d' ? 'Last 3 months' : 'Last year'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {RUPEE}{formatIndianNumber(kpis.netProfit)}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
              Revenue - Expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Fuel Sold</CardTitle>
            <Droplets className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {formatIndianNumber(kpis.totalLiters)} L
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center mt-1">
              Total liters sold
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Transactions</CardTitle>
            <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {formatIndianNumber(salesHistory.length)}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center mt-1">
              Total sales recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Profit Trend</CardTitle>
            <CardDescription>Monthly performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlySalesData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${RUPEE}${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => [`${RUPEE}${formatIndianNumber(value as number)}`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="Sales" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fuel Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Type Distribution</CardTitle>
            <CardDescription>Sales breakdown by fuel type</CardDescription>
          </CardHeader>
          <CardContent>
            {fuelTypeData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No fuel sales data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={fuelTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${RUPEE}${formatIndianNumber(value)}`}
                  >
                    {fuelTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${RUPEE}${formatIndianNumber(value as number)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily Sales by Fuel Type - FIXED */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales (Last 7 Days)</CardTitle>
            <CardDescription>
              Sales from {dayjs().subtract(6, 'day').format('DD MMM')} to {dayjs().format('DD MMM')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailySalesData.length === 0 || dailySalesData.every(d => d.total === 0) ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No daily sales data available for the last 7 days
              </div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis tickFormatter={(value) => `${RUPEE}${(value / 1000).toFixed(0)}K`} />
                    <Tooltip 
                      formatter={(value) => [`${RUPEE}${formatIndianNumber(value as number)}`, '']}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                    />
                    <Legend />
                    {uniqueProducts.length > 0 ? (
                      uniqueProducts.map((key, idx) => (
                        <Bar 
                          key={key} 
                          dataKey={key} 
                          fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5]} 
                          name={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()} 
                        />
                      ))
                    ) : (
                      <Bar dataKey="total" fill="#3b82f6" name="Total Sales" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Summary Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-right p-2 font-medium">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySalesData.map((day, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/50">
                          <td className="p-2">{day.day}</td>
                          <td className="p-2 text-right font-semibold">{RUPEE}{formatIndianNumber(day.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Finance Summary</CardTitle>
            <CardDescription>Current financial overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!financeSummary ? (
              <div className="text-muted-foreground text-center py-8">No finance summary available</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cash Received</span>
                  <span className="text-sm font-bold">{RUPEE}{formatIndianNumber(financeSummary.cashReceived || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">UPI/PhonePe</span>
                  <span className="text-sm font-bold">{RUPEE}{formatIndianNumber(financeSummary.phonePay || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Credit Card</span>
                  <span className="text-sm font-bold">{RUPEE}{formatIndianNumber(financeSummary.creditCard || 0)}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Expenses</span>
                  <span className="text-sm font-bold text-destructive">{RUPEE}{formatIndianNumber(financeSummary.totalExpenses || 0)}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Net Total</span>
                  <span className="text-lg font-bold text-green-600">{RUPEE}{formatIndianNumber(financeSummary.total || 0)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
          <CardDescription>Key observations from your real-time data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpis.netProfit > 0 ? (
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">Positive Profit Margin</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your business is generating {RUPEE}{formatIndianNumber(kpis.netProfit)} in net profit for the selected period.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900 dark:text-orange-100">Review Expenses</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Expenses exceed revenue by {RUPEE}{formatIndianNumber(Math.abs(kpis.netProfit))}. Consider cost optimization.
                  </p>
                </div>
              </div>
            )}

            {fuelTypeData.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Top Selling Fuel</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {fuelTypeData[0].name} is your best-performing product with {RUPEE}{formatIndianNumber(fuelTypeData[0].value)} in sales.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <IndianRupee className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900 dark:text-purple-100">Transaction Volume</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  You processed {formatIndianNumber(salesHistory.length)} transactions totaling {formatIndianNumber(kpis.totalLiters)} liters of fuel.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
