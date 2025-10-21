import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Loader2, Trash2, X, ChevronLeft, ChevronRight, ArrowLeft, Eye, Droplet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

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
  const queryClient = useQueryClient();

  const [productName, setProductName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [chosenPeriod, setChosenPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Fetch all products and all logs ONCE (no server-side filtering)
  const { data: products = [] } = useQuery({
    queryKey: ['products', orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ['inventoryLogs', orgId],
    queryFn: async () => {
      const url = `${API_BASE}/api/organizations/${orgId}/inventory-logs`;
      const res = await axios.get(url, { timeout: 20000 });
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (logId: string) => {
      if (!logId) throw new Error('Invalid log ID');
      await axios.delete(`${API_BASE}/api/organizations/${orgId}/inventory-logs/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
      setConfirmDelete(null);
      setSelectedLog(null);
    }
  });

  // FILTERING IS 100% FRONTEND: FAST + ACCURATE
  const filteredLogs = useMemo(() => {
    let logs = [...allLogs];
    if (productName) logs = logs.filter(l => (l.productName || '').trim() === productName);
    if (fromDate)
      logs = logs.filter(l => l.lastUpdated &&
        new Date(l.lastUpdated).toISOString().slice(0,10) >= fromDate);
    if (toDate)
      logs = logs.filter(l => l.lastUpdated &&
        new Date(l.lastUpdated).toISOString().slice(0,10) <= toDate);
    return logs;
  }, [allLogs, productName, fromDate, toDate]);

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
    if (period === 'today')      { const { fromDate, toDate } = getTodayRange(); setFromDate(fromDate); setToDate(toDate); }
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

  // Modal functions
  const openLogModal = (log: any) => setSelectedLog(log);
  const closeLogModal = () => setSelectedLog(null);
  const startDelete = (log: any) => { if (!log.id) return; setConfirmDelete(log); };
  const cancelDelete = () => setConfirmDelete(null);
  const confirmDeleteLog = () => { if (!confirmDelete?.id) return; deleteMutation.mutate(confirmDelete.id); };

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
  function LogRow({log, onClick, onDelete}: {log:any, onClick?:()=>void, onDelete?:()=>void}) {
    return (
      <li
        className={`group flex items-center gap-3 py-4 px-2 sm:px-4 border-b border-border bg-background hover:bg-muted/40 transition relative cursor-pointer`}
        onClick={onClick}
      >
        {/* Product Avatar/Icon */}
        <div className="flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-700/30 h-12 w-12 shrink-0">
          <Droplet className="h-6 w-6 text-blue-500 dark:text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-x-2 items-baseline">
            <span className="font-semibold text-lg text-foreground truncate">{log.productName}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold ml-2"
              style={{
                background: log.status === false ? "#fee2e2" : "#dcfce7",
                color: log.status === false ? "#ef4444" : "#22c55e"
              }}>
              {log.status === false ? "Inactive" : "Active"}
            </span>
            <span className="mx-2 text-xs text-slate-400 font-mono">{formatDateTime(log.lastUpdated)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground tracking-tight">
            <span><Droplet className="inline h-4 w-4 mr-1 text-blue-400" />Level: <b className="font-medium text-primary">{nf.format(log.currentLevel ?? 0)} L</b></span>
            <span>Cap: <b className="font-medium">{nf.format(log.tankCapacity ?? 0)} L</b></span>
            <span>Value: <b className="font-medium">₹{nf.format(log.stockValue ?? 0)}</b></span>
            {log.remarks && <span className="italic text-slate-500">"{log.remarks}"</span>}
          </div>
        </div>

        {/* Row Actions: Only on hover/tap for clean look */}
        <div className="flex gap-1 items-center ml-2 opacity-0 group-hover:opacity-100 transition" onClick={e=>e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={deleteMutation.isPending} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onClick} className="h-8 w-8 p-0 hover:bg-blue-100"><Eye className="h-4 w-4" /></Button>
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
        <Button size="sm" variant={chosenPeriod === 'all' ? "default" : "outline"} onClick={() => handleQuickFilter('all')}>All</Button>
        <Button size="sm" variant={chosenPeriod === 'today' ? "default" : "outline"} onClick={() => handleQuickFilter('today')}>Today</Button>
        <Button size="sm" variant={chosenPeriod === 'week' ? "default" : "outline"} onClick={() => handleQuickFilter('week')}>Last 7 days</Button>
        <Button size="sm" variant={chosenPeriod === 'month' ? "default" : "outline"} onClick={() => handleQuickFilter('month')}>This Month</Button>
        <Button size="sm" variant={chosenPeriod === 'custom' ? "default" : "outline"} onClick={() => setChosenPeriod('custom')}>Custom</Button>
      </div>

      {/* Search Form */}
      <Card className="card-gradient border-0">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Product</label>
              <Select value={productName || "ALL_PRODUCTS"} onValueChange={handleProductChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All Products" /></SelectTrigger>
                <SelectContent className='z-[10000]'>
                  <SelectItem value="ALL_PRODUCTS">All Products</SelectItem>
                  {products.map((prod: any) => <SelectItem key={prod.id || prod.productName} value={prod.productName}>{prod.productName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">From</label>
              <Input type="date" value={fromDate} onChange={handleFromDateChange} disabled={chosenPeriod !== 'custom' && chosenPeriod !== 'all'} className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">To</label>
              <Input type="date" value={toDate} onChange={handleToDateChange} disabled={chosenPeriod !== 'custom' && chosenPeriod !== 'all'} className="h-10" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-foreground opacity-0">Action</label>
              <span className="block text-xs text-muted-foreground">({filteredLogs.length} record{filteredLogs.length !== 1 && 's'} found)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log List Modern */}
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Log Entries</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={String(recordsPerPage)} onValueChange={(v)=>{setRecordsPerPage(Number(v)); setCurrentPage(1);}}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent className='z-[10000]'>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
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
                <LogRow key={log.id || `${log.inventoryId}-${i}`} log={log} onClick={()=>openLogModal(log)} onDelete={()=>startDelete(log)} />
              ))}
            </ul>
          )}

          {/* Pagination Controls */}
          {(totalPages > 1 && filteredLogs.length > 0) && (
            <div className="flex items-center justify-between mt-8 flex-wrap gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to <span className="font-medium text-foreground">{Math.min(endIndex, totalRecords)}</span> of <span className="font-medium text-foreground">{totalRecords}</span> entries
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-9">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <div className="flex gap-1">
                  {getPageNumbers().map((page, idx) =>
                    page === '...' ? (
                      <span key={`ellipsis-${idx}`} className="flex items-center px-2 text-muted-foreground">...</span>
                    ) : (
                      <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => goToPage(Number(page))} className="h-9 min-w-[36px]">
                        {page}
                      </Button>
                    ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-9">
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LOG DETAIL MODAL */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
          onClick={closeLogModal}
        >
          <div
            className="bg-background p-8 rounded-2xl shadow-2xl relative w-full max-w-lg mx-4 border border-border"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition-all duration-200"
              onClick={closeLogModal}
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-700/30 h-16 w-16 shrink-0">
                <Droplet className="h-8 w-8 text-blue-500 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary mb-1">{selectedLog.productName}</h3>
                <div className="text-sm font-mono text-muted-foreground">{formatDateTime(selectedLog.lastUpdated)}</div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Stock Value</span>
                  <div className="font-semibold text-lg">{typeof selectedLog.stockValue === "number" ? `₹${nf.format(selectedLog.stockValue)}` : "—"}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Current Level</span>
                  <div className="font-semibold text-lg">{typeof selectedLog.currentLevel === "number" ? `${nf.format(selectedLog.currentLevel)} L` : "—"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Tank Capacity</span>
                  <div className="font-semibold text-lg">{selectedLog.tankCapacity ? `${nf.format(selectedLog.tankCapacity)} L` : "—"}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div>
                    {selectedLog.status === false ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-destructive/10 text-destructive">
                        Inactive
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success/10 text-success">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Inventory ID</span>
                <div className="font-mono text-sm bg-muted p-2 rounded">{selectedLog.inventoryId || "—"}</div>
              </div>

              {selectedLog.remarks && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Remarks</span>
                  <div className="text-sm italic bg-muted p-3 rounded">{selectedLog.remarks}</div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end mt-8 gap-3">
              <Button variant="outline" onClick={closeLogModal}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => startDelete(selectedLog)}
                disabled={deleteMutation.isPending}
              >
                Delete Log
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
          onClick={cancelDelete}
        >
          <div
            className="bg-background p-8 rounded-2xl shadow-2xl relative w-full max-w-md mx-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition-all duration-200"
              onClick={cancelDelete}
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Delete Modal Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-full bg-destructive/10">
                <Trash2 className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Delete Log Entry</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>

            {/* Delete Modal Content */}
            <div className="mb-6">
              <p className="text-muted-foreground mb-4">
                Are you sure you want to delete the log entry for{' '}
                <span className="font-semibold text-foreground">{confirmDelete.productName}</span>?
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm font-mono text-muted-foreground mb-2">Log Details:</div>
                <div className="text-sm">
                  <div>Date: {formatDateTime(confirmDelete.lastUpdated)}</div>
                  <div>Level: {typeof confirmDelete.currentLevel === "number" ? `${nf.format(confirmDelete.currentLevel)} L` : "—"}</div>
                  <div>Value: {typeof confirmDelete.stockValue === "number" ? `₹${nf.format(confirmDelete.stockValue)}` : "—"}</div>
                </div>
              </div>
            </div>

            {/* Delete Modal Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelDelete} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteLog}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
