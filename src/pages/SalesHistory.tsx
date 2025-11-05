import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import dayjs, { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Clock,
  Droplet,
  User,
  CreditCard,
  Smartphone,
  Wallet,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Loader2,
  Fuel,
  ArrowLeft,
  FileText,
  Sheet,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { API_CONFIG } from '@/lib/api-config';
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


// ============ Types ============
interface SaleRecord {
  id: string;
  dateTime: string;
  productName: string;
  guns: string;
  salesInLiters: number;
  testingTotal: number;
  empId: string;
  salesInRupees: number;
  cashReceived: number;
  phonePay: number;
  creditCard: number;
  shortCollections: number;
  receivedTotal: number;
}

interface SalesSummary {
  totalSales: number;
  cash: number;
  upi: number;
  card: number;
  short: number;
  received: number;
}

interface InventoryItem {
  productId: string;
  productName: string;
  currentLevel: number;
  capacity: number;
  status: string;
}

type DatePreset = "latest" | "today" | "week" | "month" | "custom";

// ============ Constants ============
// Removed - using API_CONFIG
const RUPEE = "\u20B9";
const RECORDS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ============ Utility Functions ============
const rangeForPreset = (preset: DatePreset): [Dayjs, Dayjs] => {
  const today = dayjs();
  switch (preset) {
    case "latest":
      // Return a very wide range for latest 10 records
      return [today.subtract(1, "year"), today.endOf("day")];
    case "today":
      return [today.startOf("day"), today.endOf("day")];
    case "week":
      return [today.startOf("week"), today.endOf("week")];
    case "month":
      return [today.startOf("month"), today.endOf("month")];
    default:
      return [today.subtract(1, "year"), today.endOf("day")];
  }
};

const formatCurrency = (value: number): string => {
  return `${RUPEE}${value.toLocaleString("en-IN")}`;
};

// ============ Export Functions ============
const exportToCSV = (records: SaleRecord[], from: Dayjs, to: Dayjs) => {
  const headers = [
    "Date/Time",
    "Product",
    "Gun",
    "Liters",
    "Testing",
    "Employee",
    "Total Sales",
    "Cash",
    "UPI",
    "Card",
    "Short",
    "Received Total",
  ];

  const rows = records.map((record) => [
    dayjs(record.dateTime).format("DD-MM-YYYY HH:mm"),
    record.productName,
    record.guns,
    record.salesInLiters,
    record.testingTotal,
    record.empId,
    record.salesInRupees,
    record.cashReceived,
    record.phonePay,
    record.creditCard,
    record.shortCollections,
    record.receivedTotal,
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `sales-history-${from.format("DD-MM-YYYY")}-to-${to.format("DD-MM-YYYY")}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportToPDF = (
  records: SaleRecord[],
  from: Dayjs,
  to: Dayjs,
  summary: SalesSummary
) => {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Sales History Report", 105, 15, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Period: ${from.format("DD MMM YYYY")} to ${to.format("DD MMM YYYY")}`,
    105,
    25,
    { align: "center" }
  );

  doc.setFontSize(9);
  doc.text(`Generated: ${dayjs().format("DD MMM YYYY, hh:mm A")}`, 105, 32, {
    align: "center",
  });

  // Summary
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, 50);

  const summaryData = [
    ["Total Sales", formatCurrency(summary.totalSales)],
    ["Cash Received", formatCurrency(summary.cash)],
    ["UPI Payments", formatCurrency(summary.upi)],
    ["Card Payments", formatCurrency(summary.card)],
    ["Short Collections", formatCurrency(summary.short)],
    ["Total Received", formatCurrency(summary.received)],
  ];

  autoTable(doc, {
    startY: 55,
    head: [["Metric", "Amount"]],
    body: summaryData,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  });

  // Records
  const finalY = (doc as any).lastAutoTable?.finalY || 55;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Records", 14, finalY + 12);

  const tableData = records.map((record) => [
    dayjs(record.dateTime).format("DD-MM HH:mm"),
    record.productName,
    record.guns,
    record.salesInLiters,
    record.empId,
    formatCurrency(record.salesInRupees),
    formatCurrency(record.cashReceived),
    formatCurrency(record.phonePay),
    formatCurrency(record.creditCard),
  ]);

  autoTable(doc, {
    startY: finalY + 16,
    head: [
      [
        "Date/Time",
        "Product",
        "Gun",
        "Liters",
        "Employee",
        "Total",
        "Cash",
        "UPI",
        "Card",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { top: 10 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(
    `sales-history-${from.format("DD-MM-YYYY")}-to-${to.format(
      "DD-MM-YYYY"
    )}.pdf`
  );
};

// ============ Compact Mobile-First Sale Record Card ============
const SaleRecordCard = ({ record, index, inventory }: { record: SaleRecord; index: number; inventory: InventoryItem[] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="overflow-hidden border border-border/60 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          {/* Header: Product + Total */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-600 text-white shrink-0">
                  <Fuel className="h-4 w-4" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold truncate">
                  {record.productName}
                </h3>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dayjs(record.dateTime).format("DD MMM YYYY")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {dayjs(record.dateTime).format("hh:mm A")}
                </span>
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs"
                >
                  <User className="h-3 w-3" />
                  {record.empId}
                </Badge>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Total</p>
              <p className="text-xl sm:text-2xl font-extrabold text-primary">
                {formatCurrency(record.salesInRupees)}
              </p>
            </div>
          </div>

          {/* Key metrics row: stacks on mobile */}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-4 sm:border-y sm:py-2">
            <div className="flex items-center gap-1.5">
              <Droplet className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Sale</span>
              <span className="text-sm font-semibold">{record.salesInLiters}L</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fuel className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Gun</span>
              <span className="text-sm font-semibold capitalize">{record.guns}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Testing</span>
              <span className="text-sm font-semibold">{record.testingTotal}</span>
            </div>
          </div>

          {/* Payments: chips wrap cleanly */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {record.cashReceived > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400 text-xs">
                <Wallet className="h-3.5 w-3.5" />
                <span className="font-semibold">{formatCurrency(record.cashReceived)}</span>
              </div>
            )}
            {record.phonePay > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400 text-xs">
                <Smartphone className="h-3.5 w-3.5" />
                <span className="font-semibold">{formatCurrency(record.phonePay)}</span>
              </div>
            )}
            {record.creditCard > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 text-xs">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="font-semibold">{formatCurrency(record.creditCard)}</span>
              </div>
            )}
            {record.shortCollections > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="font-medium">Short:</span>
                <span className="font-semibold">{formatCurrency(record.shortCollections)}</span>
              </div>
            )}
          </div>

          {/* Expand details (only when useful) */}
          {record.shortCollections > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="w-full mt-2 h-8 text-xs"
            >
              {expanded ? "Hide details" : "View details"}
              <ChevronRight
                className={`ml-1 h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""
                  }`}
              />
            </Button>
          )}

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 pt-2 border-t border-border/70">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Received Total</span>
                    <span className="font-semibold text-pink-600 dark:text-pink-400">
                      {formatCurrency(record.receivedTotal)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ============ Date Range Selector (mobile-friendly) ============
const DateRangeSelector = ({
  preset,
  setPreset,
  from,
  to,
  onCustomChange,
  onApply,
}: {
  preset: DatePreset;
  setPreset: (preset: DatePreset) => void;
  from: Dayjs;
  to: Dayjs;
  onCustomChange: (which: "from" | "to", value: string) => void;
  onApply: () => void;
}) => {
  const presetButtons = [
    { id: "latest", label: "Latest 10", icon: Clock },
    { id: "today", label: "Today", icon: Clock },
    { id: "week", label: "This Week", icon: CalendarIcon },
    { id: "month", label: "This Month", icon: CalendarIcon },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presetButtons.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={preset === id ? "default" : "outline"}
            onClick={() => setPreset(id as DatePreset)}
            className="h-9"
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ))}
        <Button
          variant={preset === "custom" ? "default" : "outline"}
          onClick={() => setPreset("custom")}
          className="h-9"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Custom Range
        </Button>
      </div>

      <AnimatePresence>
        {preset === "custom" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-3 sm:p-4 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Label className="text-sm mb-1.5 block">From Date</Label>
                  <Input
                    type="date"
                    value={from.format("YYYY-MM-DD")}
                    onChange={(e) => onCustomChange("from", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-sm mb-1.5 block">To Date</Label>
                  <Input
                    type="date"
                    value={to.format("YYYY-MM-DD")}
                    onChange={(e) => onCustomChange("to", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <Button onClick={onApply} className="w-full sm:w-auto">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Apply Filter
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============ Pagination Controls (responsive) ============
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  recordsPerPage,
  onRecordsPerPageChange,
  totalRecords,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  recordsPerPage: number;
  onRecordsPerPageChange: (value: number) => void;
  totalRecords: number;
}) => {
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Records per page selector */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Per page</Label>
            <Select
              value={recordsPerPage.toString()}
              onValueChange={(value) => onRecordsPerPageChange(Number(value))}
            >
              <SelectTrigger className="w-[90px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='z-[10000]'>
                {RECORDS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground ml-auto md:ml-0">
            Showing {startRecord}-{endRecord} of {totalRecords}
          </span>
        </div>

        {/* Pagination buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="hidden md:flex"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="min-w-[84px]"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {/* Numeric pages (hide on small screens) */}
          <div className="hidden md:flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-10"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="min-w-[84px]"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden md:flex"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// ============ Main Component ============
export default function SalesHistory() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const [preset, setPreset] = useState<DatePreset>("latest");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() =>
    rangeForPreset("latest")
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const navigate = useNavigate();

  const [from, to] = dateRange;

  useEffect(() => {
    if (preset !== "custom") {
      setDateRange(rangeForPreset(preset));
    }
  }, [preset]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [recordsPerPage, from, to]);

  const fromIso = from.startOf("day").format("YYYY-MM-DDTHH:mm:ss");
  const toIso = to.endOf("day").format("YYYY-MM-DDTHH:mm:ss");

  const {
    data: records = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["sale-history", orgId, fromIso, toIso, preset],
    queryFn: async () => {
      const params = `from=${fromIso}&to=${toIso}`;
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/sale-history/by-date?${params}`;
      const res = await axios.get<SaleRecord[]>(url);
      const data = Array.isArray(res.data) ? res.data : [];
      
      // For "latest" preset, return only the latest 10 records
      if (preset === "latest") {
        return data.slice(0, 10);
      }
      
      return data;
    },
    refetchOnWindowFocus: false,
  });

  // Fetch inventory/tank levels
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory", orgId],
    queryFn: async () => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/inventory`;
      const res = await axios.get<InventoryItem[]>(url);
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchOnWindowFocus: false,
  });

  const summary: SalesSummary = useMemo(() => {
    return records.reduce(
      (acc, record) => ({
        totalSales: acc.totalSales + (record.salesInRupees || 0),
        cash: acc.cash + (record.cashReceived || 0),
        upi: acc.upi + (record.phonePay || 0),
        card: acc.card + (record.creditCard || 0),
        short: acc.short + (record.shortCollections || 0),
        received: acc.received + (record.receivedTotal || 0),
      }),
      { totalSales: 0, cash: 0, upi: 0, card: 0, received: 0, short: 0 }
    );
  }, [records]);

  // Pagination logic
  const totalPages = Math.ceil(records.length / recordsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return records.slice(startIndex, endIndex);
  }, [records, currentPage, recordsPerPage]);

  const handleCustomChange = (which: "from" | "to", value: string) => {
    setPreset("custom");
    setDateRange(([oldFrom, oldTo]) => [
      which === "from" ? dayjs(value) : oldFrom,
      which === "to" ? dayjs(value) : oldTo,
    ]);
  };

  const handlePageChange = (page: number) => {
    const next = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Sales History
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Timeline of all transactions
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/sales")}
              className="h-9"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Sales
            </Button>
            <Button onClick={() => refetch()} disabled={isFetching} className="h-9">
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Date Range Selector */}
        <DateRangeSelector
          preset={preset}
          setPreset={setPreset}
          from={from}
          to={to}
          onCustomChange={handleCustomChange}
          onApply={() => refetch()}
        />

        {/* Tank Levels */}
        {inventory.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <Fuel className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-bold">Current Tank Levels</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {inventory.map((item) => {
                  const percentage = item.capacity > 0 ? (item.currentLevel / item.capacity) * 100 : 0;
                  const isLow = percentage < 20;
                  const isMedium = percentage >= 20 && percentage < 50;
                  
                  return (
                    <div
                      key={item.productId}
                      className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{item.productName}</span>
                        <Badge
                          variant={isLow ? "destructive" : isMedium ? "outline" : "default"}
                          className="text-xs"
                        >
                          {percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isLow
                                ? "bg-red-500"
                                : isMedium
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.currentLevel.toLocaleString()}L / {item.capacity.toLocaleString()}L
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">
                    Total Sales
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary.totalSales)}
                  </h3>
                </div>
                <div className="p-3 rounded-lg bg-blue-500">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Cash</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary.cash)}
                  </h3>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">UPI</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary.upi)}
                  </h3>
                </div>
                <div className="p-3 rounded-lg bg-violet-500">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Card</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary.card)}
                  </h3>
                </div>
                <div className="p-3 rounded-lg bg-amber-500">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Short/Received */}
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">
                    Short Collections
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary.short)}
                  </h3>
                </div>
                <div className="p-3 rounded-lg bg-rose-500">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">
                    Received Total
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary.received)}
                  </h3>
                </div>
                <div className="p-3 rounded-lg bg-teal-500">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex flex-wrap items-center gap-2 justify-center sm:justify-end"
        >
          <Button
            variant="outline"
            onClick={() => exportToCSV(records, from, to)}
            disabled={records.length === 0}
            className="h-9"
          >
            <Sheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportToPDF(records, from, to, summary)}
            disabled={records.length === 0}
            className="h-9"
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </motion.div>


        {/* Content */}
        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
            <p className="text-sm sm:text-base text-muted-foreground">
              Loading sales history...
            </p>
          </div>
        ) : records.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-2xl font-bold mb-1">No Sales Found</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Try adjusting your date range to see more results
            </p>
            <Button onClick={() => setPreset("week")} className="h-9">
              View This Week
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* Records */}
            <div className="space-y-2">
              {paginatedRecords.map((record, index) => (
                <SaleRecordCard key={record.id} record={record} index={index} inventory={inventory} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                recordsPerPage={recordsPerPage}
                onRecordsPerPageChange={handleRecordsPerPageChange}
                totalRecords={records.length}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}