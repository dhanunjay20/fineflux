import { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Loader2, Trash2, X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

function getTodayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10)
  };
}

function getWeekRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10)
  };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10)
  };
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const { data: products = [] } = useQuery({
    queryKey: ['products', orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  function handleQuickFilter(period: typeof chosenPeriod) {
    setChosenPeriod(period);
    setCurrentPage(1);
    if (period === 'today') {
      const { fromDate, toDate } = getTodayRange();
      setFromDate(fromDate); 
      setToDate(toDate);
    } else if (period === 'week') {
      const { fromDate, toDate } = getWeekRange();
      setFromDate(fromDate); 
      setToDate(toDate);
    } else if (period === 'month') {
      const { fromDate, toDate } = getMonthRange();
      setFromDate(fromDate); 
      setToDate(toDate);
    } else if (period === 'all') {
      setFromDate(''); 
      setToDate('');
    }
  }

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['inventoryLogs', orgId, productName, fromDate, toDate],
    queryFn: async () => {
      const params: any = {};
      if (productName) params.productName = productName;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      let url = `${API_BASE}/api/organizations/${orgId}/inventory-logs`;
      if (productName && !fromDate && !toDate)
        url = `${API_BASE}/api/organizations/${orgId}/inventory-logs/by-product`;
      const res = await axios.get(url, { params, timeout: 15000 });
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
      refetch();
    }
  });

  // Pagination calculations
  const totalRecords = logs.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentLogs = logs.slice(startIndex, endIndex);

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(Number(value));
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const startDelete = (log: any) => {
    if (!log.id) return;
    setConfirmDelete(log);
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  const confirmDeleteLog = () => {
    if (!confirmDelete?.id) return;
    deleteMutation.mutate(confirmDelete.id);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6 animate-fade-in px-2 md:px-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory History Logs</h1>
          <p className="text-muted-foreground">Audit and search tank log changes with filters</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/inventory')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={chosenPeriod === 'all' ? "default" : "outline"} onClick={() => handleQuickFilter('all')}>All</Button>
        <Button size="sm" variant={chosenPeriod === 'today' ? "default" : "outline"} onClick={() => handleQuickFilter('today')}>Today</Button>
        <Button size="sm" variant={chosenPeriod === 'week' ? "default" : "outline"} onClick={() => handleQuickFilter('week')}>Last 7 days</Button>
        <Button size="sm" variant={chosenPeriod === 'month' ? "default" : "outline"} onClick={() => handleQuickFilter('month')}>This Month</Button>
        <Button size="sm" variant={chosenPeriod === 'custom' ? "default" : "outline"} onClick={() => setChosenPeriod('custom')}>Custom</Button>
      </div>

      {/* Search Form */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Product Name</label>
              <Select 
                value={productName || "ALL_PRODUCTS"} 
                onValueChange={(value) => { 
                  setProductName(value === "ALL_PRODUCTS" ? "" : value); 
                  setCurrentPage(1); 
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent className='z-[10000]'>
                  <SelectItem value="ALL_PRODUCTS">All Products</SelectItem>
                  {products.map((prod: any) => (
                    <SelectItem key={prod.id || prod.productName} value={prod.productName}>
                      {prod.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setChosenPeriod('custom'); setCurrentPage(1); }}
                disabled={chosenPeriod !== 'custom' && chosenPeriod !== 'all'}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); setChosenPeriod('custom'); setCurrentPage(1); }}
                disabled={chosenPeriod !== 'custom' && chosenPeriod !== 'all'}
                className="h-10"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-foreground opacity-0">Action</label>
              <Button
                type="button"
                className="btn-gradient-primary flex items-center gap-2 w-full h-10"
                onClick={() => { refetch(); setCurrentPage(1); }}
              >
                <Calendar className="h-4 w-4" /> Search Logs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Log Entries ({totalRecords} total)</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={String(recordsPerPage)} onValueChange={handleRecordsPerPageChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
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
            <div className="flex items-center gap-3 text-muted-foreground min-h-[200px] justify-center">
              <Loader2 className="animate-spin h-6 w-6" /> 
              <span>Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted-foreground min-h-[200px] flex items-center justify-center">
              <div>
                <p className="text-lg font-medium mb-1">No log records found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-left">Date/Time</th>
                      <th className="py-3 px-4 font-semibold text-left">Product</th>
                      <th className="py-3 px-4 font-semibold text-right">Stock Value</th>
                      <th className="py-3 px-4 font-semibold text-right">Current Level</th>
                      <th className="py-3 px-4 font-semibold text-right">Tank Capacity</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLogs.map((log: any, i: number) => (
                      <tr 
                        key={log.id || `${log.inventoryId}-${i}`} 
                        className={`border-t border-border transition-colors ${
                          i % 2 === 0 ? "bg-background hover:bg-muted/20" : "bg-muted/20 hover:bg-muted/40"
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">{formatDateTime(log.lastUpdated)}</td>
                        <td className="py-3 px-4 font-medium">{log.productName}</td>
                        <td className="py-3 px-4 text-right">{typeof log.stockValue === "number" ? `₹${nf.format(log.stockValue)}` : "—"}</td>
                        <td className="py-3 px-4 text-right">{typeof log.currentLevel === "number" ? `${nf.format(log.currentLevel)} L` : "—"}</td>
                        <td className="py-3 px-4 text-right">{log.tankCapacity ? `${nf.format(log.tankCapacity)} L` : "—"}</td>
                        <td className="py-3 px-4 text-center">
                          {log.status === false ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                              Inactive
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startDelete(log)}
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to <span className="font-medium text-foreground">{Math.min(endIndex, totalRecords)}</span> of <span className="font-medium text-foreground">{totalRecords}</span> entries
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-9"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>

                    <div className="flex gap-1">
                      {getPageNumbers().map((page, idx) => (
                        page === '...' ? (
                          <span key={`ellipsis-${idx}`} className="flex items-center px-2 text-muted-foreground">...</span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(Number(page))}
                            className="h-9 min-w-[36px]"
                          >
                            {page}
                          </Button>
                        )
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-9"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={cancelDelete}
        >
          <div 
            className="bg-background p-8 rounded-2xl shadow-2xl relative w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
              onClick={cancelDelete}
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold">Delete Log Entry</h3>
            </div>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to delete the log entry for <span className="font-semibold text-foreground">{confirmDelete.productName}</span>?
              <br />
              <span className="text-sm font-mono mt-2 block">{formatDateTime(confirmDelete.lastUpdated)}</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelDelete}>
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
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
