import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ArrowLeft, Droplet, Loader2, TrendingUp, TrendingDown,
  PackageCheck, Activity, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { API_CONFIG } from '@/lib/api-config';

// Helper: Format LocalDateTime IST as "6/11/2025 06:45 pm"
function formatISTDateTimeSimple(s?: string) {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(s);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  let hour = d.getHours();
  const min = d.getMinutes();
  const ampm = hour >= 12 ? 'pm' : 'am';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  const minPad = min.toString().padStart(2, '0');
  const hourPad = hour.toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hourPad}:${minPad} ${ampm}`;
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

const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export default function InventoryHistory() {
  const navigate = useNavigate();
  const orgId = localStorage.getItem('organizationId') || 'ORG-DEV-001';
  const [productName, setProductName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [chosenPeriod, setChosenPeriod] = useState<'all' | 'latest10' | 'week' | 'month' | 'custom'>('latest10');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Products
  const { data: products = [] } = useQuery({
    queryKey: ['products', orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Main logs
  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ['inventoryLogs', orgId],
    queryFn: async () => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/inventory-logs`;
      const res = await axios.get(url, { timeout: 20000 });
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // ============ LOG PROCESSING ============

  // Group logs by product, sorted descending, for robust previous-level logic
  const logsGrouped = useMemo(() => {
    const logsByProduct: { [key: string]: any[] } = {};
    allLogs.forEach(l => {
      const pname = l.productName || '';
      if (!logsByProduct[pname]) logsByProduct[pname] = [];
      logsByProduct[pname].push(l);
    });
    // sort latest first per product
    Object.keys(logsByProduct).forEach(p =>
      logsByProduct[p].sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime())
    );
    return logsByProduct;
  }, [allLogs]);

  // Final processed logs, optionally filtered
  const filteredLogs = useMemo(() => {
    let logs: any[] = [];
    Object.keys(logsGrouped).forEach(prod => {
      const prodLogs = logsGrouped[prod];
      prodLogs.forEach((log, idx) => {
        const prev = prodLogs[idx + 1];
        const prevLevel = prev?.currentLevel ?? null;
        // Sale detection: currentLevel < prevLevel
        const isSale = prevLevel !== null && Number(log.currentLevel) < Number(prevLevel);
        // Receipt: receiptQuantityInLitres > 0 AND currentLevel > prevLevel (or first record)
        const isReceipt = Number(log.receiptQuantityInLitres) > 0;
        logs.push({
          ...log,
          previousLevel: prevLevel,
          isReceipt,
          isSale,
          isFirstEntry: prevLevel === null,
          mutationby: log.mutationby || log.empId || '—'
        });
      });
    });
    logs.sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime());

    if (chosenPeriod === 'latest10' && !productName && !fromDate && !toDate) logs = logs.slice(0, 10);
    if (productName) logs = logs.filter(l => (l.productName || '').trim() === productName);
    if (fromDate) logs = logs.filter(l => l.lastUpdated && l.lastUpdated.slice(0,10) >= fromDate);
    if (toDate) logs = logs.filter(l => l.lastUpdated && l.lastUpdated.slice(0,10) <= toDate);
    return logs;
  }, [logsGrouped, productName, fromDate, toDate, chosenPeriod]);

  const deletedCount = useMemo(() =>
    filteredLogs.filter(
      log => typeof log.mutationby === 'string' &&
        log.mutationby.toLowerCase().includes('deleted')
    ).length, [filteredLogs]);

  const totalRecords = filteredLogs.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

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

  const summaryStats = useMemo(() => ({
    totalEntries: filteredLogs.length,
    receipts: filteredLogs.filter(log => log.isReceipt && !log.isFirstEntry).length,
    decreases: filteredLogs.filter(log => log.isSale && !log.isFirstEntry).length,
    totalReceiptQty: filteredLogs.reduce((sum, log) => sum + Number(log.receiptQuantityInLitres || 0), 0),
    totalStockValue: filteredLogs.reduce((sum, log) => sum + Number(log.stockValue || 0), 0),
    uniqueProducts: new Set(filteredLogs.map(log => log.productName)).size
  }), [filteredLogs]);

  function LogRow({ log }: { log: any }) {
    const hasReceipt = log.isReceipt;
    const hasDecrease = log.isSale;
    const isFirstEntry = log.isFirstEntry;
    const isDeleted = typeof log?.mutationby === 'string' && log.mutationby.toLowerCase().includes('deleted');
    const fillPercentage = Number(log.tankCapacity) > 0 ? (Number(log.currentLevel) / Number(log.tankCapacity)) * 100 : 0;
    let cardBgClass = "bg-white dark:bg-slate-900";
    let iconBgClass = "bg-blue-50 dark:bg-blue-950/50";
    let iconClass = "text-blue-600 dark:text-blue-400";
    let badgeClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (isDeleted) {
      cardBgClass = "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800";
      iconBgClass = "bg-red-100 dark:bg-red-900/50";
      iconClass = "text-red-600 dark:text-red-400";
      badgeClass = "bg-red-500 text-white";
    }
    else if (isFirstEntry) {
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
          <div className={`flex items-center justify-center rounded-xl ${iconBgClass} h-14 w-14 shrink-0 shadow-sm`}>
            {isDeleted ? (
              <TrendingDown className={`h-7 w-7 ${iconClass}`} />
            ) : isFirstEntry ? (
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
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-lg text-foreground">{log.productName}</h3>
              {isDeleted && (
                <Badge className={`${badgeClass} font-semibold px-2.5 py-0.5`}>
                  Sale Deleted
                </Badge>
              )}
              {!isDeleted && isFirstEntry && (
                <Badge className={`${badgeClass} font-semibold px-2.5 py-0.5`}>
                  <Package className="h-3 w-3 mr-1" />
                  First Entry
                </Badge>
              )}
              {!isDeleted && !isFirstEntry && hasReceipt && (
                <Badge className={`${badgeClass} font-semibold px-2.5 py-0.5`}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Receipt
                </Badge>
              )}
              {!isDeleted && !isFirstEntry && hasDecrease && (
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
                {log.isReceipt
                  ? (log.lastUpdated ?? '—')
                  : formatISTDateTimeSimple(log.lastUpdated)
                }
              </Badge>
            </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Droplet className="h-3 w-3" /> Current Level</p>
                <p className="font-bold text-sm text-foreground">
                  {nf.format(Number(log.currentLevel ?? 0))} {log.metric || 'L'}
                  {hasDecrease && log.previousLevel && (
                    <span className="text-orange-600 dark:text-orange-400 text-xs font-semibold ml-1">
                      (↓ {nf.format(Number((log.previousLevel ?? 0) - (log.currentLevel ?? 0)))})
                    </span>
                  )}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Capacity</p>
                <p className="font-bold text-sm text-foreground">{nf.format(Number(log.tankCapacity ?? 0))} {log.metric || 'L'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Stock Value</p>
                <p className="font-bold text-sm text-foreground">₹{nf.format(Number(log.stockValue ?? 0))}</p>
              </div>
              {hasReceipt && (
                <div className="space-y-0.5">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><PackageCheck className="h-3 w-3" /> Receipt Qty</p>
                  <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{nf.format(Number(log.receiptQuantityInLitres))} L</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Updated By</p>
                <p className="font-semibold text-sm text-foreground">{log.mutationby}</p>
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  }


  // === RENDER ===
  return (
    <div className="space-y-6 animate-fade-in px-2 md:px-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inventory History Logs</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Audit and search tank changes with filters</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/inventory')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={chosenPeriod === 'latest10' ? "default" : "outline"} onClick={() => handleQuickFilter('latest10')}>Latest 10</Button>
        <Button size="sm" variant={chosenPeriod === 'all' ? "default" : "outline"} onClick={() => handleQuickFilter('all')}>All</Button>
        <Button size="sm" variant={chosenPeriod === 'week' ? "default" : "outline"} onClick={() => handleQuickFilter('week')}>Last 7 days</Button>
        <Button size="sm" variant={chosenPeriod === 'month' ? "default" : "outline"} onClick={() => handleQuickFilter('month')}>This Month</Button>
        <Button size="sm" variant={chosenPeriod === 'custom' ? "default" : "outline"} onClick={() => setChosenPeriod('custom')}>Custom</Button>
      </div>

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
          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">Sale Deleted</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{deletedCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Deletion Events</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-full">
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
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
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Sale Entries</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{summaryStats.decreases}</p>
                  <p className="text-xs text-muted-foreground mt-1">Net Sale Stock Reductions</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

      <Card className="card-gradient">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg sm:text-xl">Log Entries</CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-muted-foreground">Show</span>
              <span className="font-medium">{recordsPerPage}</span>
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
                      <Button key={String(page)} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => goToPage(Number(page))} className="h-9 min-w-[36px]">
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
