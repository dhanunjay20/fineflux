import { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, Trash2, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
  const orgId = localStorage.getItem('organizationId') || 'ORG-DEV-001';
  const queryClient = useQueryClient();
  const [productName, setProductName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [chosenPeriod, setChosenPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null); // log to be deleted

  // Fetch products for dropdown
  const { data: products = [] } = useQuery({
    queryKey: ['products', orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Handlers for quick range
  function handleQuickFilter(period: typeof chosenPeriod) {
    setChosenPeriod(period);
    if (period === 'today') {
      const { fromDate, toDate } = getTodayRange();
      setFromDate(fromDate); setToDate(toDate);
    } else if (period === 'week') {
      const { fromDate, toDate } = getWeekRange();
      setFromDate(fromDate); setToDate(toDate);
    } else if (period === 'month') {
      const { fromDate, toDate } = getMonthRange();
      setFromDate(fromDate); setToDate(toDate);
    } else if (period === 'all') {
      setFromDate(''); setToDate('');
    }
  }

  // API: Search logs
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

  // Delete mutation (always uses log.id)
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

  function startDelete(log: any) {
    if (!log.id) return;
    setConfirmDelete(log);
  }
  function cancelDelete() {
    setConfirmDelete(null);
  }
  function confirmDeleteLog() {
    if (!confirmDelete?.id) return;
    deleteMutation.mutate(confirmDelete.id);
  }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };
  const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

  return (
    <div className="space-y-8 animate-fade-in px-2 md:px-0">
      {/* Title and Filters */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory History Logs</h1>
          <p className="text-muted-foreground">Audit and search tank log changes with filters</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={chosenPeriod === 'all' ? "default" : "outline"} onClick={() => handleQuickFilter('all')}>All</Button>
          <Button size="sm" variant={chosenPeriod === 'today' ? "default" : "outline"} onClick={() => handleQuickFilter('today')}>Today</Button>
          <Button size="sm" variant={chosenPeriod === 'week' ? "default" : "outline"} onClick={() => handleQuickFilter('week')}>Last 7 days</Button>
          <Button size="sm" variant={chosenPeriod === 'month' ? "default" : "outline"} onClick={() => handleQuickFilter('month')}>This Month</Button>
          <Button size="sm" variant={chosenPeriod === 'custom' ? "default" : "outline"} onClick={() => setChosenPeriod('custom')}>Custom Range</Button>
        </div>
      </div>

      {/* Search Form */}
      <Card className="card-gradient mb-4">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-xs font-bold mb-1 block text-muted-foreground">Product Name</label>
              <select
                className="block w-full rounded-md bg-input border border-border px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/70 transition-all"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              >
                <option value="" className="text-muted-foreground">— Select Product —</option>
                {products.map((prod: any) => (
                  <option value={prod.productName} key={prod.id || prod.productName}>
                    {prod.productName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setChosenPeriod('custom'); }}
                disabled={chosenPeriod !== 'custom' && chosenPeriod !== 'all'}
              />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); setChosenPeriod('custom'); }}
                disabled={chosenPeriod !== 'custom' && chosenPeriod !== 'all'}
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button
                type="button"
                className="btn-gradient-primary flex gap-2 w-full"
                onClick={() => refetch()}
              >
                <Calendar /> Search Logs
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Log Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground min-h-[80px]">
              <Loader2 className="animate-spin" /> Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-muted-foreground min-h-[80px] flex items-center">
              No log records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-separate border-spacing-0 rounded-lg">
                <thead className="sticky top-0 z-[1] bg-muted">
                  <tr>
                    <th className="py-2 px-3 font-semibold text-center">Date/Time</th>
                    <th className="py-2 px-3 font-semibold text-center">Product</th>
                    <th className="py-2 px-3 font-semibold text-center">Stock Value</th>
                    <th className="py-2 px-3 font-semibold text-center">Current Level</th>
                    <th className="py-2 px-3 font-semibold text-center">Capacity</th>
                    <th className="py-2 px-3 font-semibold text-center">Status</th>
                    <th className="py-2 px-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any, i: number) => (
                    <tr key={log.id || `${log.inventoryId}-${i}`} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="py-2 px-3 text-center break-all whitespace-nowrap">{formatDateTime(log.lastUpdated)}</td>
                      <td className="py-2 px-3 text-center break-all">{log.productName}</td>
                      <td className="py-2 px-3 text-center">{typeof log.stockValue === "number" ? `₹${nf.format(log.stockValue)}` : "—"}</td>
                      <td className="py-2 px-3 text-center">{typeof log.currentLevel === "number" ? nf.format(log.currentLevel) : "—"}</td>
                      <td className="py-2 px-3 text-center">{log.totalCapacity ? nf.format(log.totalCapacity) : log.tankCapacity ? nf.format(log.tankCapacity) : "—"}</td>
                      <td className="py-2 px-3 text-center">
                        {log.status === false
                          ? <span className="inline-block px-2 py-1 bg-destructive/10 text-destructive rounded text-xs font-medium">Inactive</span>
                          : <span className="inline-block px-2 py-1 bg-success/10 text-success rounded text-xs font-medium">Active</span>
                        }
                      </td>
                      <td className="py-2 px-3 text-center">
                        {/* Delete button uses ONLY log.id; opens dialog */}
                        <Button
                          size="sm"
                          variant="outline"
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
          )}
        </CardContent>
      </Card>

      {/* ==== CONFIRM DELETE DIALOG ==== */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-lg shadow-lg relative w-full max-w-md">
            <button
              type="button"
              className="absolute top-4 right-4"
              onClick={cancelDelete}
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold mb-3 text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Inventory Log
            </h3>
            <p className="mb-4">
              Are you sure you want to delete <b>{confirmDelete.productName}</b> log entry<br />
              for <span className="text-muted-foreground">{formatDateTime(confirmDelete.lastUpdated)}</span>?
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteLog}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
