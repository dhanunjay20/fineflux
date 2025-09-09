import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, DollarSign, TrendingUp, TrendingDown, BarChart3, Download } from 'lucide-react';
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

// Mock data
const salesData = [
  { name: 'Jan', sales: 120000, expenses: 80000, profit: 40000 },
  { name: 'Feb', sales: 132000, expenses: 85000, profit: 47000 },
  { name: 'Mar', sales: 145000, expenses: 90000, profit: 55000 },
  { name: 'Apr', sales: 138000, expenses: 88000, profit: 50000 },
  { name: 'May', sales: 155000, expenses: 95000, profit: 60000 },
  { name: 'Jun', sales: 167000, expenses: 98000, profit: 69000 },
];

const fuelTypeData = [
  { name: 'Petrol', value: 45, color: '#3b82f6' },
  { name: 'Diesel', value: 35, color: '#10b981' },
  { name: 'CNG', value: 15, color: '#f59e0b' },
  { name: 'Electric', value: 5, color: '#8b5cf6' },
];

const dailySalesData = [
  { day: 'Mon', petrol: 25000, diesel: 18000 },
  { day: 'Tue', petrol: 28000, diesel: 20000 },
  { day: 'Wed', petrol: 22000, diesel: 17000 },
  { day: 'Thu', petrol: 30000, diesel: 22000 },
  { day: 'Fri', petrol: 35000, diesel: 25000 },
  { day: 'Sat', petrol: 40000, diesel: 28000 },
  { day: 'Sun', petrol: 33000, diesel: 24000 },
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');

  const handleExportData = () => {
    // Mock export functionality
    console.log('Exporting analytics data...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
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
          <Button onClick={handleExportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">₹8,45,000</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">₹3,21,000</div>
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Fuel Sold</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">12,547 L</div>
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +15.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Customer Count</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">2,847</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +6.7% from last month
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
            <CardDescription>Monthly performance over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${(value as number).toLocaleString()}`, '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Sales"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fuel Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Type Distribution</CardTitle>
            <CardDescription>Sales breakdown by fuel type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fuelTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {fuelTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Sales by Fuel Type */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales by Fuel Type</CardTitle>
            <CardDescription>This week's daily sales breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${(value as number).toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="petrol" fill="#3b82f6" name="Petrol" />
                <Bar dataKey="diesel" fill="#10b981" name="Diesel" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Key Performance Indicators</CardTitle>
            <CardDescription>Monthly targets vs achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Revenue Target</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-secondary rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">85%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Profit Margin</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-secondary rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">92%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Customer Satisfaction</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-secondary rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '88%' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">88%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Operational Efficiency</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-secondary rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: '76%' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">76%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Insights</CardTitle>
          <CardDescription>AI-powered business insights and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Peak Hours Optimization</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your busiest hours are 7-9 AM and 5-7 PM. Consider dynamic pricing during these periods.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">Revenue Growth</h4>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Diesel sales increased by 18% this month. Consider increasing diesel inventory.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-100">Cost Management</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Operational costs increased 5% last month. Review supplier contracts for better rates.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}