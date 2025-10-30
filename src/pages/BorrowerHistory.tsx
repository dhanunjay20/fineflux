import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card, CardHeader, CardTitle, CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Loader2, ChevronLeft, ChevronRight, ArrowLeft, Eye, IndianRupee
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 
  "https://finflux-64307221061.asia-south1.run.app";

export default function BorrowerHistory() {
  const { custId } = useParams<{ custId: string }>();
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const navigate = useNavigate();

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const url = `${API_BASE}/api/organizations/${orgId}/customers/history/all?page=0&size=200`;
        console.log("📡 Fetching borrower history from:", url);
        const res = await axios.get(url, { timeout: 20000 });
        setHistory(res.data.content || []);
      } catch (err: any) {
        console.error("💥 Error fetching borrower history:", err);
        setError("Failed to load borrower history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [orgId]);

  // Filtering (by date)
  const filteredHistory = useMemo(() => {
    let list = [...history];
    if (fromDate)
      list = list.filter(
        (i) =>
          i.transactionDate &&
          new Date(i.transactionDate).toISOString().slice(0, 10) >= fromDate
      );
    if (toDate)
      list = list.filter(
        (i) =>
          i.transactionDate &&
          new Date(i.transactionDate).toISOString().slice(0, 10) <= toDate
      );
    return list;
  }, [history, fromDate, toDate]);

  // Pagination logic
  const totalRecords = filteredHistory.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentPageData = filteredHistory.slice(startIndex, endIndex);

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-muted-foreground">
        <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading borrower history...
      </div>
    );

  if (error)
    return (
      <div className="text-red-500 text-center mt-10">{error}</div>
    );

  return (
    <div className="space-y-6 animate-fade-in px-2 md:px-0">
      {/* ===== HEADER ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Borrower Transaction History</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and filter all borrower transactions
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      {/* ===== FILTER SECTION ===== */}
      <Card className="card-gradient border-0">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing <b>{filteredHistory.length}</b> record{filteredHistory.length !== 1 && "s"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== LIST ===== */}
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction Records</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Show</span>
              <select
                className="border rounded-md h-9 px-2 bg-background"
                value={recordsPerPage}
                onChange={(e) => {
                  setRecordsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[10, 25, 50, 100].map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center text-muted-foreground min-h-[140px] flex items-center justify-center">
              <p>No borrower transactions found</p>
            </div>
          ) : (
            <ul>
              {currentPageData.map((item, i) => (
                <li
                  key={item._id || i}
                  className="group flex justify-between items-center border-b border-border py-4 px-2 sm:px-4 hover:bg-muted/40 transition cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-lg">
                        ₹{Number(item.transactionAmount).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.notes || "No notes"}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{new Date(item.transactionDate).toLocaleString()}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition"
                      onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 flex-wrap gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <b>{startIndex + 1}</b>–
                <b>{Math.min(endIndex, totalRecords)}</b> of{" "}
                <b>{totalRecords}</b> entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <div className="flex gap-1">
                  {getPageNumbers().map((p, idx) =>
                    p === "..." ? (
                      <span key={idx} className="px-2 text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={p}
                        variant={currentPage === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(Number(p))}
                      >
                        {p}
                      </Button>
                    )
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== DIALOG ===== */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Complete details for this borrower transaction.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-3 text-sm mt-4">
              <p><strong>ID:</strong> {selectedItem._id}</p>
              <p><strong>Customer ID:</strong> {selectedItem.custId}</p>
              <p><strong>Organization ID:</strong> {selectedItem.organizationId}</p>
              <p><strong>Transaction Amount:</strong> ₹{Number(selectedItem.transactionAmount).toLocaleString()}</p>
              <p><strong>Cumulative Amount:</strong> ₹{Number(selectedItem.cumulativeAmount).toLocaleString()}</p>
              <p><strong>Date:</strong> {new Date(selectedItem.transactionDate).toLocaleString()}</p>
              <p><strong>Notes:</strong> {selectedItem.notes || "—"}</p>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button variant="secondary" onClick={() => setSelectedItem(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
