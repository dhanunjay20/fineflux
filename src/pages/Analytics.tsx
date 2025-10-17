import { useState, useMemo, useTransition } from 'react';
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
  FileSpreadsheet
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

export default function Analytics() {
  const orgId = localStorage.getItem('organizationId') || '';
  const [timeRange, setTimeRange] = useState('30d');
  const [isPending, startTransition] = useTransition();

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

  // Fetch Sales History with caching
  const { data: salesHistory = [], isLoading: loadingSales, isFetching: fetchingSales } = useQuery({
    queryKey: ['sales-history-analytics', orgId, fromIso, toIso],
    queryFn: async () => {
      const params = `from=${fromIso}&to=${toIso}`;
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/sale-history/by-date?${params}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Fetch Expenses with caching
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses-analytics', orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/expenses`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch Latest Finance Summary with caching
  const { data: financeSummary, isLoading: loadingFinance } = useQuery({
    queryKey: ['finance-summary-latest', orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/finance-summary/latest`);
      return res.data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

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

  // Daily Sales (Last 7 days - Bar Chart) - DYNAMIC
  const dailySalesData = useMemo(() => {
    const today = dayjs();
    const last7Days = Array.from({ length: 7 }, (_, i) => today.subtract(6 - i, 'day'));
    
    return last7Days.map(day => {
      const dayStr = day.format('DD MMM');
      const daySales = salesHistory.filter(s => dayjs(s.dateTime).isSame(day, 'day'));
      
      const productMap: Record<string, number> = {};
      daySales.forEach(s => {
        const product = s.productName || 'Unknown';
        productMap[product] = (productMap[product] || 0) + (s.salesInRupees || 0);
      });

      return {
        day: dayStr,
        ...Object.fromEntries(
          Object.entries(productMap).map(([k, v]) => [
            k.toLowerCase().replace(/\s+/g, ''),
            Math.round(v)
          ])
        ),
      };
    });
  }, [salesHistory]);

  // Export as CSV
  const exportToCSV = () => {
    const headers = ['Metric', 'Value'];
    const kpiRows = [
      ['Total Revenue', `${RUPEE}${kpis.totalRevenue.toLocaleString()}`],
      ['Net Profit', `${RUPEE}${kpis.netProfit.toLocaleString()}`],
      ['Total Expenses', `${RUPEE}${kpis.totalExpenses.toLocaleString()}`],
      ['Fuel Sold (Liters)', kpis.totalLiters.toLocaleString()],
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
              <div class="kpi-value">${RUPEE}${kpis.totalRevenue.toLocaleString()}</div>
            </div>
            <div class="kpi-card">
              <div>Net Profit</div>
              <div class="kpi-value">${RUPEE}${kpis.netProfit.toLocaleString()}</div>
            </div>
            <div class="kpi-card">
              <div>Fuel Sold</div>
              <div class="kpi-value">${kpis.totalLiters.toLocaleString()} L</div>
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
                  <td>${RUPEE}${m.sales.toLocaleString()}</td>
                  <td>${RUPEE}${m.expenses.toLocaleString()}</td>
                  <td>${RUPEE}${m.profit.toLocaleString()}</td>
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
                  <td>${RUPEE}${f.value.toLocaleString()}</td>
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
                <tr><td><strong>Cash Received</strong></td><td>${RUPEE}${financeSummary.cashReceived?.toLocaleString()}</td></tr>
                <tr><td><strong>UPI/PhonePe</strong></td><td>${RUPEE}${financeSummary.phonePay?.toLocaleString()}</td></tr>
                <tr><td><strong>Credit Card</strong></td><td>${RUPEE}${financeSummary.creditCard?.toLocaleString()}</td></tr>
                <tr><td><strong>Total Expenses</strong></td><td>${RUPEE}${financeSummary.totalExpenses?.toLocaleString()}</td></tr>
                <tr style="background: #f0f0f0;"><td><strong>Net Total</strong></td><td><strong>${RUPEE}${financeSummary.total?.toLocaleString()}</strong></td></tr>
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
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
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
          
          {/* Export Dropdown */}
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
              <p className="text-muted-foreground">Loading analytics data...</p>
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
              {RUPEE}{kpis.totalRevenue.toLocaleString()}
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
              {RUPEE}{kpis.netProfit.toLocaleString()}
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
              {kpis.totalLiters.toLocaleString()} L
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
              {salesHistory.length.toLocaleString()}
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
                  <YAxis />
                  <Tooltip formatter={(value) => [`${RUPEE}${(value as number).toLocaleString()}`, '']} />
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
                    label={({ name, value }) => `${name}: ${RUPEE}${value.toLocaleString()}`}
                  >
                    {fuelTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${RUPEE}${(value as number).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily Sales by Fuel Type */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales (Last 7 Days)</CardTitle>
            <CardDescription>
              Sales from {dayjs().subtract(6, 'day').format('DD MMM')} to {dayjs().format('DD MMM')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailySalesData.length === 0 || dailySalesData.every(d => Object.keys(d).length === 1) ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No daily sales data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${RUPEE}${(value as number).toLocaleString()}`, '']} />
                  <Legend />
                  {Object.keys(dailySalesData[0] || {})
                    .filter(key => key !== 'day')
                    .map((key, idx) => (
                      <Bar 
                        key={key} 
                        dataKey={key} 
                        fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5]} 
                        name={key.charAt(0).toUpperCase() + key.slice(1)} 
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
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
                  <span className="text-sm font-bold">{RUPEE}{financeSummary.cashReceived?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">UPI/PhonePe</span>
                  <span className="text-sm font-bold">{RUPEE}{financeSummary.phonePay?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Credit Card</span>
                  <span className="text-sm font-bold">{RUPEE}{financeSummary.creditCard?.toLocaleString()}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Expenses</span>
                  <span className="text-sm font-bold text-destructive">{RUPEE}{financeSummary.totalExpenses?.toLocaleString()}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Net Total</span>
                  <span className="text-lg font-bold text-green-600">{RUPEE}{financeSummary.total?.toLocaleString()}</span>
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
          <CardDescription>Key observations from your data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpis.netProfit > 0 ? (
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">Positive Profit Margin</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your business is generating {RUPEE}{kpis.netProfit.toLocaleString()} in net profit for the selected period.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900 dark:text-orange-100">Review Expenses</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Expenses exceed revenue by {RUPEE}{Math.abs(kpis.netProfit).toLocaleString()}. Consider cost optimization.
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
                    {fuelTypeData[0].name} is your best-performing product with {RUPEE}{fuelTypeData[0].value.toLocaleString()} in sales.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <IndianRupee className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900 dark:text-purple-100">Transaction Volume</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  You processed {salesHistory.length} transactions totaling {kpis.totalLiters.toLocaleString()} liters of fuel.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
