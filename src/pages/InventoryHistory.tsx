import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ArrowLeft, Droplet,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // Modern Log Row UI
  function LogRow({log}: {log:any}) {
    return (
      <li className={`group flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 px-3 sm:px-4 border-b border-border bg-background hover:bg-muted/40 transition relative`}>
        {/* Product Avatar/Icon */}
        <div className="flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-700/30 h-12 w-12 shrink-0">
          <Droplet className="h-6 w-6 text-blue-500 dark:text-blue-300" />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap gap-x-2 gap-y-1 items-baseline">
            <span className="font-semibold text-base sm:text-lg text-foreground truncate">{log.productName}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: log.status === false ? "#fee2e2" : "#dcfce7",
                color: log.status === false ? "#ef4444" : "#22c55e"
              }}>
              {log.status === false ? "Inactive" : "Active"}
            </span>
            <span className="text-xs text-slate-400 font-mono">{formatDateTime(log.lastUpdated)}</span>
          </div>
          <div className="mt-2 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1.5 text-xs sm:text-sm text-muted-foreground">
            <span><Droplet className="inline h-3.5 w-3.5 mr-1 text-blue-400" />Level: <b className="font-medium text-primary">{nf.format(log.currentLevel ?? 0)} {log.metric || 'L'}</b></span>
            <span>Capacity: <b className="font-medium">{nf.format(log.tankCapacity ?? 0)} {log.metric || 'L'}</b></span>
            <span>Stock Value: <b className="font-medium">₹{nf.format(log.stockValue ?? 0)}</b></span>
            {log.receiptQuantityInLitres > 0 && <span>Receipt Qty: <b className="font-medium">{nf.format(log.receiptQuantityInLitres)} L</b></span>}
            {log.empId && <span>Emp ID: <b className="font-medium">{log.empId}</b></span>}
            {log.mutationby && <span>Updated By: <b className="font-medium">{log.mutationby}</b></span>}
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
            <div className="sm:col-span-2 lg:col-span-2 space-y-2">
              <label className="text-xs sm:text-sm font-medium text-foreground opacity-0 hidden sm:block">Action</label>
              <span className="block text-xs text-muted-foreground">({filteredLogs.length} record{filteredLogs.length !== 1 && 's'} found)</span>
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

