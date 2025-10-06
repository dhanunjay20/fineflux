import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
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
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState('Daily Sales Report');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('PDF');

  // Helper function to generate CSV content
  const generateCSV = (reportType: string) => {
    let csvContent = '';
    
    if (reportType.includes('Daily Sales')) {
      csvContent = 'Date,Fuel Type,Opening,Sales,Closing,Rate,Amount\n';
      csvContent += '08-Jan-2024,Petrol,5000,1234,3766,102.50,126485\n';
      csvContent += '08-Jan-2024,Diesel,8000,2156,5844,89.75,193545\n';
      csvContent += '08-Jan-2024,Premium,2000,456,1544,115.20,52531\n';
      csvContent += '\nTotal Collection:,372561\n';
    } else if (reportType.includes('Monthly')) {
      csvContent = 'Month,Total Sales,Total Expenses,Net Profit,Growth\n';
      csvContent += 'December 2023,₹12,45,680,₹4,23,150,₹8,22,530,+12.5%\n';
    } else if (reportType.includes('Inventory')) {
      csvContent = 'Tank,Fuel Type,Capacity,Current Stock,Status\n';
      csvContent += 'Tank 1,Petrol,10000L,7850L,Good\n';
      csvContent += 'Tank 2,Diesel,15000L,12340L,Good\n';
      csvContent += 'Tank 3,Premium,8000L,2100L,Low\n';
    } else if (reportType.includes('Employee')) {
      csvContent = 'Employee,Role,Attendance,Working Days,Salary\n';
      csvContent += 'Rajesh Kumar,Operator,95%,29,₹25000\n';
      csvContent += 'Priya Sharma,Cashier,98%,30,₹22000\n';
      csvContent += 'Amit Patel,Supervisor,100%,31,₹35000\n';
    } else {
      csvContent = 'Report Type,Date,Value\n';
      csvContent += `${reportType},${new Date().toLocaleDateString()},Sample Data\n`;
    }
    
    return csvContent;
  };

  // Helper function to generate HTML content for PDF-like reports
  const generateHTMLReport = (reportType: string) => {
    const currentDate = new Date().toLocaleDateString('en-IN');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportType}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; background: #fff; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { color: #333; margin: 0; }
    .header p { color: #666; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #333; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:hover { background: #f5f5f5; }
    .total { font-weight: bold; background: #f0f0f0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Petrol Bunk Management System</h1>
    <h2>${reportType}</h2>
    <p>Generated on: ${currentDate}</p>
  </div>
  
  ${reportType.includes('Daily Sales') ? `
    <h3>Daily Sales Report - ${currentDate}</h3>
    <table>
      <tr><th>Fuel Type</th><th>Opening (L)</th><th>Sales (L)</th><th>Closing (L)</th><th>Rate (₹)</th><th>Amount (₹)</th></tr>
      <tr><td>Petrol</td><td>5,000</td><td>1,234</td><td>3,766</td><td>102.50</td><td>1,26,485</td></tr>
      <tr><td>Diesel</td><td>8,000</td><td>2,156</td><td>5,844</td><td>89.75</td><td>1,93,545</td></tr>
      <tr><td>Premium</td><td>2,000</td><td>456</td><td>1,544</td><td>115.20</td><td>52,531</td></tr>
      <tr class="total"><td colspan="5">Total Collection</td><td>₹3,72,561</td></tr>
    </table>
  ` : ''}
  
  ${reportType.includes('Monthly') ? `
    <h3>Monthly Summary - December 2023</h3>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total Sales</td><td>₹12,45,680</td></tr>
      <tr><td>Total Expenses</td><td>₹4,23,150</td></tr>
      <tr><td>Net Profit</td><td>₹8,22,530</td></tr>
      <tr><td>Growth vs Previous Month</td><td>+12.5%</td></tr>
    </table>
  ` : ''}
  
  ${reportType.includes('Inventory') ? `
    <h3>Inventory Report - ${currentDate}</h3>
    <table>
      <tr><th>Tank</th><th>Fuel Type</th><th>Capacity</th><th>Current Stock</th><th>Status</th></tr>
      <tr><td>Tank 1</td><td>Petrol</td><td>10,000 L</td><td>7,850 L</td><td>Good</td></tr>
      <tr><td>Tank 2</td><td>Diesel</td><td>15,000 L</td><td>12,340 L</td><td>Good</td></tr>
      <tr><td>Tank 3</td><td>Premium</td><td>8,000 L</td><td>2,100 L</td><td>Low Stock</td></tr>
    </table>
  ` : ''}
  
  ${reportType.includes('Employee') ? `
    <h3>Employee Report - December 2023</h3>
    <table>
      <tr><th>Employee</th><th>Role</th><th>Attendance</th><th>Working Days</th><th>Salary</th></tr>
      <tr><td>Rajesh Kumar</td><td>Operator</td><td>95%</td><td>29/31</td><td>₹25,000</td></tr>
      <tr><td>Priya Sharma</td><td>Cashier</td><td>98%</td><td>30/31</td><td>₹22,000</td></tr>
      <tr><td>Amit Patel</td><td>Supervisor</td><td>100%</td><td>31/31</td><td>₹35,000</td></tr>
    </table>
  ` : ''}
  
  <div class="footer">
    <p>This is a computer-generated report from Petrol Bunk Management System</p>
    <p>For any queries, please contact the administrator</p>
  </div>
</body>
</html>`;
  };

  // Download handler
  const handleDownload = (reportType: string, format: string) => {
    try {
      let content = '';
      let mimeType = '';
      let extension = '';
      let filename = '';

      const sanitizedReportType = reportType.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'CSV') {
        content = generateCSV(reportType);
        mimeType = 'text/csv';
        extension = 'csv';
      } else if (format === 'Excel') {
        // For Excel, we'll use CSV format with .xls extension (simple approach)
        content = generateCSV(reportType);
        mimeType = 'application/vnd.ms-excel';
        extension = 'xls';
      } else {
        // PDF - we'll generate HTML that can be saved and opened
        content = generateHTMLReport(reportType);
        mimeType = 'text/html';
        extension = 'html';
      }

      filename = `${sanitizedReportType}_${dateStr}.${extension}`;

      // Create blob and download
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Downloaded",
        description: `${reportType} has been downloaded as ${extension.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error downloading the report. Please try again.",
        variant: "destructive",
      });
    }
  };

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
              <select 
                className="w-full p-2 border border-border rounded-md bg-background"
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
              >
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
              <Input 
                id="date-from" 
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input 
                id="date-to" 
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <select 
                className="w-full p-2 border border-border rounded-md bg-background"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <option>PDF</option>
                <option>Excel</option>
                <option>CSV</option>
              </select>
            </div>
            <Button 
              className="w-full btn-gradient-success"
              onClick={() => handleDownload(selectedReportType, selectedFormat)}
            >
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Preview",
                                description: "Preview feature coming soon!",
                              });
                            }}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownload(report.title, 'PDF')}
                          >
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Preview",
                          description: "Preview feature coming soon!",
                        });
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(report.name, report.format)}
                    >
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