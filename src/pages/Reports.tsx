import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  TrendingUp,
  IndianRupee,
  Users,
  Fuel,
  Filter,
  Eye,
} from 'lucide-react';

export default function Reports() {
  const reportTypes = [
    {
      id: 'daily-sales',
      title: 'Daily Sales Report (DSR)',
      description: 'Complete daily sales breakdown with fuel-wise collections',
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      id: 'monthly-summary',
      title: 'Monthly Summary',
      description: 'Comprehensive monthly performance analysis',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      id: 'inventory-report',
      title: 'Inventory Report',
      description: 'Stock levels, purchases, and consumption analysis',
      icon: Fuel,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      id: 'employee-report',
      title: 'Employee Report',
      description: 'Attendance, salary, and performance metrics',
      icon: Users,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      id: 'borrower-ledger',
      title: 'Borrower Ledger',
      description: 'Outstanding amounts and repayment history',
      icon: IndianRupee,
      color: 'text-destructive',
      bgColor: 'bg-destructive-soft',
    },
    {
      id: 'financial-statement',
      title: 'Financial Statement',
      description: 'Profit & loss, cash flow, and expense analysis',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
  ];

  const recentReports = [
    {
      id: 1,
      name: 'Daily Sales Report - Jan 08, 2024',
      type: 'DSR',
      generatedDate: '2024-01-08 18:30',
      size: '2.4 MB',
      format: 'PDF',
    },
    {
      id: 2,
      name: 'Monthly Summary - December 2023',
      type: 'Monthly',
      generatedDate: '2024-01-01 10:15',
      size: '5.8 MB',
      format: 'PDF',
    },
    {
      id: 3,
      name: 'Inventory Report - Jan 07, 2024',
      type: 'Inventory',
      generatedDate: '2024-01-07 16:45',
      size: '1.2 MB',
      format: 'Excel',
    },
    {
      id: 4,
      name: 'Employee Attendance - Dec 2023',
      type: 'Employee',
      generatedDate: '2023-12-31 14:20',
      size: '890 KB',
      format: 'PDF',
    },
  ];

  const stats = [
    {
      title: 'Reports Generated',
      value: '127',
      change: 'This month',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Average Daily Sales',
      value: '₹48.2K',
      change: '+8.5% vs last month',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Fuel Sold',
      value: '12.5K L',
      change: 'This month',
      icon: Fuel,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Collection Rate',
      value: '96.8%',
      change: 'Payment success',
      icon: IndianRupee,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  const getFormatBadge = (format: string) => {
    const colors = {
      PDF: 'bg-destructive-soft text-destructive',
      Excel: 'bg-success-soft text-success',
      CSV: 'bg-primary-soft text-primary',
    };
    return <Badge className={colors[format as keyof typeof colors] || 'bg-muted text-muted-foreground'}>{format}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and download business reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter Reports
          </Button>
          <Button className="btn-gradient-primary">
            <FileText className="mr-2 h-4 w-4" />
            Custom Report
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
        {/* Report Generator */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <select className="w-full p-2 border border-border rounded-md bg-background">
                <option>Daily Sales Report</option>
                <option>Monthly Summary</option>
                <option>Inventory Report</option>
                <option>Employee Report</option>
                <option>Borrower Ledger</option>
                <option>Financial Statement</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input id="date-from" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input id="date-to" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <select className="w-full p-2 border border-border rounded-md bg-background">
                <option>PDF</option>
                <option>Excel</option>
                <option>CSV</option>
              </select>
            </div>
            <Button className="w-full btn-gradient-success">
              <Download className="mr-2 h-4 w-4" />
              Generate & Download
            </Button>
          </CardContent>
        </Card>

        {/* Report Templates */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle>Quick Report Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <div key={report.id} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className={`${report.bgColor} p-2 rounded-lg`}>
                        <Icon className={`h-5 w-5 ${report.color}`} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-foreground">{report.title}</h4>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm">
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="mr-1 h-3 w-3" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Reports
            </CardTitle>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-soft p-2 rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{report.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Generated on {formatDate(report.generatedDate)} • {report.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getFormatBadge(report.format)}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}