import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ArrowLeft, Droplet,
  Loader2, TrendingUp, TrendingDown, PackageCheck, 
  BarChart3, Activity, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { API_CONFIG } from '@/lib/api-config';

// Removed - using API_CONFIG

function getTodayRange() {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  return { fromDate: start.toISOString().slice(0, 10), toDate: end.toISOString().slice(0, 10) };
}
function getWeekRange() {
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  return { fromDate: start.toISOString().slice(0, 10), toDate: end.toISOString().slice(0, 10) };
}
function getMonthRange() {
  const now = new Date();
  const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  return { fromDate: start.toISOString().slice(0, 10), toDate: end.toISOString().slice(0, 10) };
}

export default function InventoryHistory() {
  const navigate = useNavigate();
  const orgId = localStorage.getItem('organizationId') || 'ORG-DEV-001';

  const [productName, setProductName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [chosenPeriod, setChosenPeriod] = useState<'all' | 'latest10' | 'week' | 'month' | 'custom'>('latest10');

  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Fetch all products and all logs ONCE (no server-side filtering)
  const { data: products = [] } = useQuery({
    queryKey: ['products', orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ['inventoryLogs', orgId],
    queryFn: async () => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/inventory-logs`;
      const res = await axios.get(url, { timeout: 20000 });
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // FILTERING IS 100% FRONTEND: FAST + ACCURATE
  const filteredLogs = useMemo(() => {
    let logs = [...allLogs];
    
    // Sort by lastUpdated (newest first)
    logs.sort((a, b) => {
      const dateA = new Date(a.lastUpdated || 0).getTime();
      const dateB = new Date(b.lastUpdated || 0).getTime();
      return dateB - dateA;
    });

    // Add previous level tracking for detecting decreases and first-time entries
    logs = logs.map((log, index, arr) => {
      // Find previous log for the same product
      const prevLog = arr.slice(index + 1).find(l => l.productName === log.productName);
      const isFirstEntry = !prevLog; // No previous log means it's the first entry
      
      return {
        ...log,
        previousLevel: prevLog?.currentLevel,
        hasLevelDecrease: prevLog ? (log.currentLevel < prevLog.currentLevel) : false,
        isFirstEntry: isFirstEntry
      };
    });

    // If latest10 is selected, return only the first 10 records
    if (chosenPeriod === 'latest10' && !productName && !fromDate && !toDate) {
      return logs.slice(0, 10);
    }

    if (productName) logs = logs.filter(l => (l.productName || '').trim() === productName);
    if (fromDate)
      logs = logs.filter(l => l.lastUpdated &&
        new Date(l.lastUpdated).toISOString().slice(0,10) >= fromDate);
    if (toDate)
      logs = logs.filter(l => l.lastUpdated &&
        new Date(l.lastUpdated).toISOString().slice(0,10) <= toDate);
    return logs;
  }, [allLogs, productName, fromDate, toDate, chosenPeriod]);

  // Pagination
  const totalRecords = filteredLogs.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // Filter button and select event handlers
  function handleQuickFilter(period: typeof chosenPeriod) {
    setChosenPeriod(period);
    setCurrentPage(1);
    if (period === 'latest10')   { setFromDate(''); setToDate(''); }
    else if (period === 'week')  { const { fromDate, toDate } = getWeekRange(); setFromDate(fromDate); setToDate(toDate); }
    else if (period === 'month') { const { fromDate, toDate } = getMonthRange(); setFromDate(fromDate); setToDate(toDate); }
    else if (period === 'all')   { setFromDate(''); setToDate(''); }
  }
  function handleProductChange(val: string) { setProductName(val === "ALL_PRODUCTS" ? "" : val); setCurrentPage(1); }
  function handleFromDateChange(e: any) { setFromDate(e.target.value); setChosenPeriod('custom'); setCurrentPage(1); }
  function handleToDateChange(e: any)   { setToDate(e.target.value); setChosenPeriod('custom'); setCurrentPage(1); }
  const goToPage = (p: number) => { if (p >= 1 && p <= totalPages) setCurrentPage(p); };
  const formatDateTime = (s?: string) => !s ? '' : (new Date(s)).toLocaleDateString('en-IN') + ' ' + (new Date(s)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = {
      totalEntries: filteredLogs.length,
      firstEntries: filteredLogs.filter(log => log.isFirstEntry).length,
      receipts: filteredLogs.filter(log => log.receiptQuantityInLitres > 0 && !log.isFirstEntry).length,
      decreases: filteredLogs.filter(log => log.hasLevelDecrease && !log.isFirstEntry).length,
      totalReceiptQty: filteredLogs.reduce((sum, log) => sum + (log.receiptQuantityInLitres || 0), 0),
      totalStockValue: filteredLogs.reduce((sum, log) => sum + (log.stockValue || 0), 0),
      uniqueProducts: new Set(filteredLogs.map(log => log.productName)).size
    };
    return stats;
  }, [filteredLogs]);

  // List pagination page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [], maxVisible = 5;
    if (totalPages <= maxVisible) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else {
      if (currentPage <= 3) { for (let i = 1; i <= 4; i++) pages.push(i); pages.push('...', totalPages); }
      else if (currentPage >= totalPages - 2) { pages.push(1, '...'); for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i); }
      else { pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages); }
    }
    return pages;
  };

  // Modern Log Row UI with color coding
  function LogRow({log}: {log:any}) {
    const hasReceipt = log.receiptQuantityInLitres > 0;
    const hasDecrease = log.hasLevelDecrease;
    const isFirstEntry = log.isFirstEntry;
    
    // Calculate fill percentage for visual indicator
    const fillPercentage = log.tankCapacity > 0 ? (log.currentLevel / log.tankCapacity) * 100 : 0;
    
    // Determine card styling based on log type (priority: first entry > receipt > decrease > normal)
    let cardBgClass = "bg-white dark:bg-slate-900";
    let iconBgClass = "bg-blue-50 dark:bg-blue-950/50";
    let iconClass = "text-blue-600 dark:text-blue-400";
    let badgeClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    
    if (isFirstEntry) {
      cardBgClass = "bg-purple-50/50 dark:bg-purple-950/20";
      iconBgClass = "bg-purple-100 dark:bg-purple-900/50";
      iconClass = "text-purple-600 dark:text-purple-400";
      badgeClass = "bg-purple-500 text-white";
    } else if (hasReceipt) {
      cardBgClass = "bg-emerald-50/50 dark:bg-emerald-950/20";
      iconBgClass = "bg-emerald-100 dark:bg-emerald-900/50";
      iconClass = "text-emerald-600 dark:text-emerald-400";
      badgeClass = "bg-emerald-500 text-white";
    } else if (hasDecrease) {
      cardBgClass = "bg-orange-50/50 dark:bg-orange-950/20";
      iconBgClass = "bg-orange-100 dark:bg-orange-900/50";
      iconClass = "text-orange-600 dark:text-orange-400";
      badgeClass = "bg-orange-500 text-white";
    }

    return (
      <li className={`group ${cardBgClass} rounded-lg shadow-sm hover:shadow-md transition-all duration-200 mb-3 overflow-hidden border border-border`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
          {/* Product Icon */}
          <div className={`flex items-center justify-center rounded-xl ${iconBgClass} h-14 w-14 shrink-0 shadow-sm`}>
            {isFirstEntry ? (
              <Package className={`h-7 w-7 ${iconClass}`} />
            ) : hasReceipt ? (
              <PackageCheck className={`h-7 w-7 ${iconClass}`} />
            ) : hasDecrease ? (
              <TrendingDown className={`h-7 w-7 ${iconClass}`} />
            ) : (
              <Droplet className={`h-7 w-7 ${iconClass}`} />
            )}
          </div>
          
          <div className="flex-1 min-w-0 w-full space-y-3">
            {/* Header Row */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-lg text-foreground">{log.productName}</h3>
              
              {isFirstEntry && (
                <Badge className={`${badgeClass} font-semibold px-2.5 py-0.5`}>
                  <Package className="h-3 w-3 mr-1" />
                  First Entry
                </Badge>
              )}
              
              {!isFirstEntry && hasReceipt && (
                <Badge className={`${badgeClass} font-semibold px-2.5 py-0.5`}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Receipt
                </Badge>
              )}
              
              {!isFirstEntry && hasDecrease && (
                <Badge className={`${badgeClass} font-semibold px-2.5 py-0.5`}>
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Sale
                </Badge>
              )}
              
              <Badge 
                variant="outline" 
                className={log.status === false 
                  ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" 
                  : "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                }
              >
                {log.status === false ? "Inactive" : "Active"}
              </Badge>
              
              <Badge className="ml-auto bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-mono text-xs px-3 py-1 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                {formatDateTime(log.lastUpdated)}
              </Badge>
            </div>

            {/* Tank Level Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tank Level</span>
                <span className="font-medium">{fillPercentage.toFixed(1)}% Full</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    fillPercentage > 75 ? 'bg-green-500' :
                    fillPercentage > 50 ? 'bg-blue-500' :
                    fillPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Droplet className="h-3 w-3" /> Current Level
                </p>
                <p className="font-bold text-sm text-foreground">
                  {nf.format(log.currentLevel ?? 0)} {log.metric || 'L'}
                  {hasDecrease && log.previousLevel && (
                    <span className="text-orange-600 dark:text-orange-400 text-xs font-semibold ml-1">
                      (↓ {nf.format(log.previousLevel - log.currentLevel)})
                    </span>
                  )}
                </p>
              </div>
              
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Capacity</p>
                <p className="font-bold text-sm text-foreground">
                  {nf.format(log.tankCapacity ?? 0)} {log.metric || 'L'}
                </p>
              </div>
              
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Stock Value</p>
                <p className="font-bold text-sm text-foreground">
                  ₹{nf.format(log.stockValue ?? 0)}
                </p>
              </div>
              
              {hasReceipt && (
                <div className="space-y-0.5">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <PackageCheck className="h-3 w-3" /> Receipt Qty
                  </p>
                  <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    {nf.format(log.receiptQuantityInLitres)} L
                  </p>
                </div>
              )}
              
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Updated By</p>
                <p className="font-semibold text-sm text-foreground">
                  {log.mutationby || log.empId || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inventory History Logs</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Audit and search tank changes with filters</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/inventory')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={chosenPeriod === 'latest10' ? "default" : "outline"} onClick={() => handleQuickFilter('latest10')}>Latest 10</Button>
        <Button size="sm" variant={chosenPeriod === 'all' ? "default" : "outline"} onClick={() => handleQuickFilter('all')}>All</Button>
        <Button size="sm" variant={chosenPeriod === 'week' ? "default" : "outline"} onClick={() => handleQuickFilter('week')}>Last 7 days</Button>
        <Button size="sm" variant={chosenPeriod === 'month' ? "default" : "outline"} onClick={() => handleQuickFilter('month')}>This Month</Button>
        <Button size="sm" variant={chosenPeriod === 'custom' ? "default" : "outline"} onClick={() => setChosenPeriod('custom')}>Custom</Button>
      </div>

      {/* Summary Statistics Cards */}
      {filteredLogs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Entries</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{summaryStats.totalEntries}</p>
                  <p className="text-xs text-muted-foreground mt-1">{summaryStats.uniqueProducts} Products</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400">First Entries</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{summaryStats.firstEntries}</p>
                  <p className="text-xs text-muted-foreground mt-1">New Products</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Receipts</p>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{summaryStats.receipts}</p>
                  <p className="text-xs text-muted-foreground mt-1">{nf.format(summaryStats.totalReceiptQty)} L Added</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-full">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Decreases</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{summaryStats.decreases}</p>
                  <p className="text-xs text-muted-foreground mt-1">Stock Reductions</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Form */}
      <Card className="card-gradient border-0">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-foreground">Product</label>
              <Select value={productName || "ALL_PRODUCTS"} onValueChange={handleProductChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All Products" /></SelectTrigger>
                <SelectContent className='z-[10000]'>
                  <SelectItem value="ALL_PRODUCTS">All Products</SelectItem>
                  {products.map((prod: any) => <SelectItem key={prod.id || prod.productName} value={prod.productName}>{prod.productName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-foreground">From</label>
              <Input type="date" value={fromDate} onChange={handleFromDateChange} disabled={chosenPeriod !== 'custom' && chosenPeriod !== 'all' && chosenPeriod !== 'latest10'} className="h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-foreground">To</label>
              <Input type="date" value={toDate} onChange={handleToDateChange} disabled={chosenPeriod !== 'custom' && chosenPeriod !== 'all' && chosenPeriod !== 'latest10'} className="h-10 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log List Modern */}
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg sm:text-xl">Log Entries</CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-muted-foreground">Show</span>
              <Select value={String(recordsPerPage)} onValueChange={(v)=>{setRecordsPerPage(Number(v)); setCurrentPage(1);}}>
                <SelectTrigger className="w-[80px] sm:w-[100px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent className='z-[10000]'>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs sm:text-sm text-muted-foreground">per page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground min-h-[160px] justify-center">
              <Loader2 className="animate-spin h-6 w-6" /><span>Loading logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground min-h-[140px] flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-1">No records found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <ul>
              {currentLogs.map((log: any, i: number) => (
                <LogRow key={log.id || `${log.inventoryId}-${i}`} log={log} />
              ))}
            </ul>
          )}

          {/* Pagination Controls */}
          {(totalPages > 1 && filteredLogs.length > 0) && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 sm:mt-8 gap-4">
              <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to <span className="font-medium text-foreground">{Math.min(endIndex, totalRecords)}</span> of <span className="font-medium text-foreground">{totalRecords}</span> entries
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-9 w-full sm:w-auto">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <div className="flex gap-1 overflow-x-auto max-w-full pb-2 sm:pb-0">
                  {getPageNumbers().map((page, idx) =>
                    page === '...' ? (
                      <span key={`ellipsis-${idx}`} className="flex items-center px-2 text-muted-foreground">...</span>
                    ) : (
                      <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => goToPage(Number(page))} className="h-9 min-w-[36px]">
                        {page}
                      </Button>
                    ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-9 w-full sm:w-auto">
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

