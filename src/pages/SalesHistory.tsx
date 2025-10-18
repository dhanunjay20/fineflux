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

type DatePreset = "today" | "week" | "month" | "custom";

// ============ Constants ============
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const RUPEE = "\u20B9";
const RECORDS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ============ Utility Functions ============
const rangeForPreset = (preset: DatePreset): [Dayjs, Dayjs] => {
  const today = dayjs();
  switch (preset) {
    case "today":
      return [today.startOf("day"), today.endOf("day")];
    case "week":
      return [today.startOf("week"), today.endOf("week")];
    case "month":
      return [today.startOf("month"), today.endOf("month")];
    default:
      return [today.startOf("day"), today.endOf("day")];
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

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

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

const exportToPDF = (records: SaleRecord[], from: Dayjs, to: Dayjs, summary: SalesSummary) => {
  const doc = new jsPDF();

  // Modern header with gradient effect (simulated with colors)
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Sales History Report", 105, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Period: ${from.format("DD MMM YYYY")} to ${to.format("DD MMM YYYY")}`,
    105,
    25,
    { align: "center" }
  );

  doc.setFontSize(10);
  doc.text(`Generated: ${dayjs().format("DD MMM YYYY, hh:mm A")}`, 105, 32, {
    align: "center",
  });

  // Summary section with modern cards
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
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
      fontSize: 11,
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  });

  // Detailed records table
  const finalY = (doc as any).lastAutoTable.finalY || 55;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Records", 14, finalY + 15);

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
    startY: finalY + 20,
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
    `sales-history-${from.format("DD-MM-YYYY")}-to-${to.format("DD-MM-YYYY")}.pdf`
  );
};

// ============ Compact Sale Record Card ============
const SaleRecordCard = ({ record, index }: { record: SaleRecord; index: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {/* Timeline Connector */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-primary/10 ml-6" />

      {/* Timeline Dot */}
      <div className="absolute left-4 top-6 w-4 h-4 bg-primary rounded-full border-4 border-background shadow-lg z-10" />

      <div className="ml-16 mb-4">
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary overflow-hidden group">
          <CardContent className="p-4">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shrink-0">
                  <Fuel className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground truncate">{record.productName}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {dayjs(record.dateTime).format("DD MMM YYYY")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dayjs(record.dateTime).format("hh:mm A")}
                    </span>
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0">
                      <User className="h-3 w-3" />
                      {record.empId}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Total Amount - Compact */}
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground font-medium">Total</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  {formatCurrency(record.salesInRupees)}
                </p>
              </div>
            </div>

            {/* Compact Sale Details - Single Row */}
            <div className="flex items-center gap-3 py-2 mb-3 border-y border-border text-sm">
              <div className="flex items-center gap-1.5">
                <Droplet className="h-4 w-4 text-blue-600" />
                <span className="font-bold">{record.salesInLiters}L</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Fuel className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-muted-foreground">Gun:</span>
                <span className="font-bold">{record.guns}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-muted-foreground">Testing:</span>
                <span className="font-bold">{record.testingTotal}</span>
              </div>
            </div>

            {/* Compact Payment Methods */}
            <div className="flex flex-wrap gap-2">
              {record.cashReceived > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 text-xs">
                  <Wallet className="h-3.5 w-3.5" />
                  <span className="font-bold">{formatCurrency(record.cashReceived)}</span>
                </div>
              )}
              {record.phonePay > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-xs">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="font-bold">{formatCurrency(record.phonePay)}</span>
                </div>
              )}
              {record.creditCard > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="font-bold">{formatCurrency(record.creditCard)}</span>
                </div>
              )}
              {record.shortCollections > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="font-medium">Short:</span>
                  <span className="font-bold">{formatCurrency(record.shortCollections)}</span>
                </div>
              )}
            </div>

            {/* Compact Expand Button */}
            {record.shortCollections > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-full mt-2 h-7 text-xs"
              >
                {expanded ? "Hide" : "Details"}
                <ChevronRight
                  className={`ml-1 h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
                />
              </Button>
            )}

            {/* Expanded Details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-border mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Received Total:</span>
                      <span className="font-bold text-pink-600">
                        {formatCurrency(record.receivedTotal)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

// ============ Date Range Selector ============
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
    { id: "today", label: "Today", icon: Clock },
    { id: "week", label: "This Week", icon: CalendarIcon },
    { id: "month", label: "This Month", icon: CalendarIcon },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {presetButtons.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={preset === id ? "default" : "outline"}
            onClick={() => setPreset(id as DatePreset)}
            className="transition-all duration-200"
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ))}
        <Button
          variant={preset === "custom" ? "default" : "outline"}
          onClick={() => setPreset("custom")}
          className="transition-all duration-200"
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
            <Card className="p-4 bg-muted/30">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-sm font-medium mb-2 block">From Date</Label>
                  <Input
                    type="date"
                    value={from.format("YYYY-MM-DD")}
                    onChange={(e) => onCustomChange("from", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-sm font-medium mb-2 block">To Date</Label>
                  <Input
                    type="date"
                    value={to.format("YYYY-MM-DD")}
                    onChange={(e) => onCustomChange("to", e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button onClick={onApply} className="whitespace-nowrap">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Apply Filter
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============ Pagination Controls ============
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
    <Card className="p-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Records per page selector */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Records per page:</Label>
          <Select
            value={recordsPerPage.toString()}
            onValueChange={(value) => onRecordsPerPageChange(Number(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECORDS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Showing {startRecord}-{endRecord} of {totalRecords}
          </span>
        </div>

        {/* Pagination buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="hidden sm:flex"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
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
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden sm:flex"
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
  const [preset, setPreset] = useState<DatePreset>("today");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => rangeForPreset("today"));
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

  const { data: records = [], isFetching, refetch } = useQuery({
    queryKey: ["sale-history", orgId, fromIso, toIso],
    queryFn: async () => {
      const params = `from=${fromIso}&to=${toIso}`;
      const url = `${API_BASE}/api/organizations/${orgId}/sale-history/by-date?${params}`;
      const res = await axios.get<SaleRecord[]>(url);
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
      { totalSales: 0, cash: 0, upi: 0, card: 0, short: 0, received: 0 }
    );
  }, [records]);

  // Pagination logic
  const totalPages = Math.ceil(records.length / recordsPerPage);
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
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8 -mt-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-black">
              Sales History
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete timeline of all transactions
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/sales")}
              className="shadow-sm hover:shadow-md transition-all"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Sales
            </Button>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              className="shadow-lg hover:shadow-xl transition-all"
            >
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

        {/* Summary Stats Cards - Simple Design */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground font-semibold">Total Sales</p>
              <h3 className="text-2xl font-bold text-primary">{formatCurrency(summary.totalSales)}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground font-semibold">Cash</p>
              <h3 className="text-2xl font-bold text-green-700">{formatCurrency(summary.cash)}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground font-semibold">UPI</p>
              <h3 className="text-2xl font-bold text-indigo-700">{formatCurrency(summary.upi)}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground font-semibold">Card</p>
              <h3 className="text-2xl font-bold text-blue-700">{formatCurrency(summary.card)}</h3>
            </CardContent>
          </Card>
        </div>

        {/* Short/Received Collection card */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground font-semibold">Short Collections</p>
              <h3 className="text-2xl font-bold text-yellow-700">{formatCurrency(summary.short)}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground font-semibold">Received Total</p>
              <h3 className="text-2xl font-bold text-pink-700">{formatCurrency(summary.received)}</h3>
            </CardContent>
          </Card>
        </div>

        {/* Export Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-3 justify-end"
        >
          <Button
            variant="outline"
            onClick={() => exportToCSV(records, from, to)}
            disabled={records.length === 0}
            className="shadow-sm hover:shadow-md transition-all"
          >
            <Sheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportToPDF(records, from, to, summary)}
            disabled={records.length === 0}
            className="shadow-sm hover:shadow-md transition-all"
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </motion.div>

        {/* Timeline Content */}
        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading sales history...</p>
          </div>
        ) : records.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center mb-6">
              <CalendarIcon className="h-16 w-16 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Sales Found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your date range to see more results
            </p>
            <Button onClick={() => setPreset("week")}>View This Week</Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Records */}
            <div className="space-y-2">
              {paginatedRecords.map((record, index) => (
                <SaleRecordCard key={record.id} record={record} index={index} />
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
