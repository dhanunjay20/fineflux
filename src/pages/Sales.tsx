import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Plus, CreditCard, Banknote, Calendar, Clock, FileText, List, IndianRupee } from "lucide-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

dayjs.extend(utc);
dayjs.extend(timezone);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const RUPEE = "\u20B9";
const SALES_PER_PAGE = 5;

// Date range helpers for DSR presets
const rangeForPreset = (preset: "today" | "week" | "month" | "custom") => {
  const today = dayjs().startOf("day");
  switch (preset) {
    case "today":
      return [today, today] as const;
    case "week":
      return [today.startOf("week"), today.endOf("week")] as const;
    case "month":
      return [today.startOf("month"), today.endOf("month")] as const;
    default:
      return [today, today] as const;
  }
};

// Sale entry default state
const initialFormState = {
  fuel: "",
  gun: "",
  openingStock: "",
  closingStock: "",
  saleLiters: "",
  price: "",
  salesInRupees: "",
  payment: "cash",
  cashReceived: "",
  phonePay: "",
  creditCard: "",
  shortCollections: "",
  testingTotal: "",
};

type FormState = typeof initialFormState;

function entryKey(e: FormState) {
  return [
    e.fuel?.trim(),
    e.gun?.trim(),
    String(e.openingStock ?? ""),
    String(e.closingStock ?? ""),
    String(e.testingTotal ?? ""),
    String(e.price ?? ""),
    String(e.cashReceived ?? ""),
    String(e.phonePay ?? ""),
    String(e.creditCard ?? ""),
  ].join("|");
}

export default function Sales() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const empId = localStorage.getItem("empId") || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // DSR modal state
  const [dsrOpen, setDsrOpen] = useState(false);
  const [dsrPreset, setDsrPreset] = useState<"today" | "week" | "month" | "custom">("today");
  const [[from, to], setDateRange] = useState(() => rangeForPreset("today"));
  const [dsrRecords, setDsrRecords] = useState<any[]>([]);
  const [dsrLoading, setDsrLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Single/batch sale state
  const [form, setForm] = useState<FormState>(initialFormState);
  const [saleEntries, setSaleEntries] = useState<FormState[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const submittingRef = useRef(false);
  const isBatchRef = useRef(false);

  // Data queries
  const { data: products = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => (await axios.get(`${API_BASE}/api/organizations/${orgId}/products`)).data || [],
  });
  const { data: guns = [] } = useQuery({
    queryKey: ["guninfo", orgId],
    queryFn: async () => (await axios.get(`${API_BASE}/api/organizations/${orgId}/guninfo`)).data || [],
  });
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () => (await axios.get(`${API_BASE}/api/organizations/${orgId}/sales`)).data || [],
  });
  const { data: collections = [] } = useQuery({
    queryKey: ["collections", orgId],
    queryFn: async () => (await axios.get(`${API_BASE}/api/organizations/${orgId}/collections`)).data || [],
  });

  const filteredGuns = useMemo(
    () => (!form.fuel ? [] : guns.filter((g: any) => g.productName === form.fuel)),
    [form.fuel, guns]
  );

  // Field syncing for guns/products
  useEffect(() => {
    let openingStock = "";
    let price = "";
    if (form.gun) {
      const gunObj = guns.find(
        (g: any) => g.guns === form.gun && (!form.fuel || g.productName === form.fuel)
      );
      if (gunObj && typeof gunObj.currentReading !== "undefined") openingStock = gunObj.currentReading;
    }
    if (form.fuel) {
      const prod = products.find((p: any) => p.productName === form.fuel);
      if (prod && typeof prod.price !== "undefined") price = prod.price;
    }
    setForm((prev) => ({
      ...prev,
      openingStock,
      price,
      closingStock: "",
      saleLiters: "",
      salesInRupees: "",
      cashReceived: "",
      phonePay: "",
      creditCard: "",
      shortCollections: "",
      testingTotal: "",
      gun: filteredGuns.some((g: any) => g.guns === prev.gun) ? prev.gun : "",
    }));
    // eslint-disable-next-line
  }, [form.gun, form.fuel, guns, products]);

  // Calculations:
  // gross = closing - opening
  // net = max(0, gross - testing)
  // amount = net * price (testing excluded)
  useEffect(() => {
    const open = Number(form.openingStock) || 0;
    const close = Number(form.closingStock) || 0;
    const testing = Number(form.testingTotal) || 0;

    const gross = close > open ? (close - open) : 0;
    const net = Math.max(0, gross - Math.max(0, testing));
    const amt = Math.round((Number(form.price || 0) * net) * 100) / 100;

    setForm((f) => ({
      ...f,
      saleLiters: net > 0 ? net.toString() : "",
      salesInRupees: net > 0 ? amt.toFixed(2) : "",
    }));
  }, [form.closingStock, form.openingStock, form.price, form.testingTotal]);

  // Short calculation from net amount only
  useEffect(() => {
    const amt = Number(form.salesInRupees) || 0;
    const cash = Number(form.cashReceived) || 0;
    const upi = Number(form.phonePay) || 0;
    const card = Number(form.creditCard) || 0;
    const delta = amt - (cash + upi + card);
    const short = Math.max(0, Math.round(delta * 100) / 100);
    setForm((f) => ({
      ...f,
      shortCollections: amt > 0 ? short.toFixed(2) : "",
    }));
  }, [form.cashReceived, form.phonePay, form.creditCard, form.salesInRupees]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // API mutation: single sale + collection
  const saleCollectionMutation = useMutation({
    mutationFn: async (input: FormState) => {
      const now = new Date();
      const saleDTO = {
        organizationId: orgId,
        empId,
        productName: input.fuel,
        guns: input.gun,
        openingStock: Number(input.openingStock),
        closingStock: Number(input.closingStock),
        testingTotal: Number(input.testingTotal) || 0,
        price: Number(input.price),
        saleLiters: Number(input.saleLiters) || 0,       // net liters
        salesInRupees: Number(input.salesInRupees) || 0, // net amount
        dateTime: now.toISOString(),
      };
      const collectionDTO = {
        organizationId: orgId,
        empId,
        productName: input.fuel,
        guns: input.gun,
        dateTime: now.toISOString(),
        cashReceived: Number(input.cashReceived) || 0,
        phonePay: Number(input.phonePay) || 0,
        creditCard: Number(input.creditCard) || 0,
        shortCollections: Number(input.shortCollections) || 0,
      };
      await axios.post(`${API_BASE}/api/organizations/${orgId}/sales`, saleDTO);
      await axios.post(`${API_BASE}/api/organizations/${orgId}/collections`, collectionDTO);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", orgId] });
      queryClient.invalidateQueries({ queryKey: ["collections", orgId] });
      if (!isBatchRef.current) {
        setForm(initialFormState);
        toast({ title: "Sale & Collection Recorded", description: "Latest record added.", variant: "default" });
      }
    },
    onError: () => {
      toast({ title: "Failed to record sale or collection", variant: "destructive" });
    },
  });

  // Validation
  function isFormValid(f: FormState) {
    const { fuel, price, gun, openingStock, closingStock, testingTotal, saleLiters, shortCollections } = f;
    if (!fuel || !gun || price === "" || openingStock === "" || closingStock === "") {
      toast({ title: "Please select product, gun and fill closing stock.", variant: "destructive" });
      return false;
    }
    const openNum = Number(openingStock),
      closeNum = Number(closingStock),
      testingNum = Number(testingTotal) || 0;

    if (isNaN(openNum) || isNaN(closeNum) || closeNum <= openNum) {
      toast({ title: "Closing stock must be greater than opening stock.", variant: "destructive" });
      return false;
    }
    const gross = closeNum - openNum;
    if (testingNum < 0 || testingNum > gross) {
      toast({ title: "Testing liters must be between 0 and gross liters.", variant: "destructive" });
      return false;
    }
    const net = gross - testingNum;
    if (net <= 0) {
      toast({ title: "Net sale liters must be positive.", variant: "destructive" });
      return false;
    }
    if (!saleLiters) {
      toast({ title: "Sale liters not computed.", variant: "destructive" });
      return false;
    }
    const short = Number(shortCollections) || 0;
    if (short > 10) {
      toast({
        title: "Short collection too high!",
        description: `Short collection is ₹${short.toFixed(2)}. It must be ₹10 or less.`,
        variant: "destructive",
      });
      return false;
    }
    if (short < 0) {
      toast({ title: "Short collection can't be negative.", variant: "destructive" });
      return false;
    }
    return true;
  }

  // Single submit: only current form, never re-post older records
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!isFormValid(form)) return;
    if (batchMode) {
      toast({ title: "Batch mode is active", description: "Use Show Summary & Submit.", variant: "destructive" });
      return;
    }
    submittingRef.current = true;
    isBatchRef.current = false;
    saleCollectionMutation.mutate(form, {
      onSettled: () => {
        submittingRef.current = false;
      },
    });
  };

  // Batch: add entry
  const handleAddAnotherSale = () => {
    if (!isFormValid(form)) return;
    const key = entryKey(form);
    const existingKeys = new Set(saleEntries.map(entryKey));
    if (existingKeys.has(key)) {
      toast({ title: "Duplicate sale blocked", description: "This entry already exists in the batch.", variant: "destructive" });
      return;
    }
    setSaleEntries((prev) => [...prev, { ...form }]);
    setForm(initialFormState);
    setBatchMode(true);
  };

  // Batch: show summary (include current form if valid and not duplicate)
  const handleShowBatchSummary = () => {
    if (form.fuel && isFormValid(form)) {
      const key = entryKey(form);
      const existingKeys = new Set(saleEntries.map(entryKey));
      if (!existingKeys.has(key)) {
        setSaleEntries((prev) => [...prev, { ...form }]);
      }
      setForm(initialFormState);
      setTimeout(() => setShowSummaryPopup(true), 50);
    } else {
      setShowSummaryPopup(true);
    }
  };

  // Batch: submit unique entries sequentially
  const handleBatchSubmit = async () => {
    if (saleEntries.length === 0) return;
    setIsSubmittingBatch(true);
    isBatchRef.current = true;
    try {
      const map = new Map<string, FormState>();
      for (const e of saleEntries) map.set(entryKey(e), e);
      const unique = Array.from(map.values());
      for (const entry of unique) {
        await saleCollectionMutation.mutateAsync(entry);
      }
      setSaleEntries([]);
      setBatchMode(false);
      setShowSummaryPopup(false);
      toast({ title: "All sales recorded!", variant: "default" });
    } catch (e) {
      toast({ title: "Batch submit failed", variant: "destructive" });
    } finally {
      isBatchRef.current = false;
      setIsSubmittingBatch(false);
    }
  };

  // Batch summary util
  function getBatchSummary(entries: FormState[]) {
    const productWise: Record<string, number> = {};
    let totalCash = 0, totalUPI = 0, totalCard = 0;
    entries.forEach((entry) => {
      productWise[entry.fuel] = (productWise[entry.fuel] || 0) + Number(entry.saleLiters || 0);
      totalCash += Number(entry.cashReceived || 0);
      totalUPI += Number(entry.phonePay || 0);
      totalCard += Number(entry.creditCard || 0);
    });
    return { productWise, totalCash, totalUPI, totalCard };
  }

  // Modal for batch summary/submit
  const renderBatchSummaryDialog = () => {
    const summary = getBatchSummary(saleEntries);
    return (
      <Dialog open={showSummaryPopup} onOpenChange={(open) => setShowSummaryPopup(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sales Batch Summary</DialogTitle>
          </DialogHeader>
          <div className="mb-4 max-h-40 overflow-y-auto">
            <h4 className="font-semibold">Product-wise Sale (Net Liters)</h4>
            <div className="space-y-2 mt-2">
              {Object.entries(summary.productWise).length === 0 && (
                <p className="text-muted-foreground italic">No sales added yet.</p>
              )}
              {Object.entries(summary.productWise).map(([prod, liters]) => (
                <div key={prod} className="flex justify-between px-3 py-1 border-b">
                  <span className="font-bold">{prod}</span>
                  <span className="">{String(liters)} Ltrs</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <h4 className="font-semibold">Total Collection</h4>
            <div className="space-y-1 mt-2">
              <div>Cash: {RUPEE}{summary.totalCash.toLocaleString()}</div>
              <div>UPI: {RUPEE}{summary.totalUPI.toLocaleString()}</div>
              <div>Card: {RUPEE}{summary.totalCard.toLocaleString()}</div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleBatchSubmit} disabled={saleEntries.length === 0 || isSubmittingBatch}>
              {isSubmittingBatch ? "Submitting..." : "Submit Now"}
            </Button>
            <Button variant="secondary" onClick={() => setShowSummaryPopup(false)} disabled={isSubmittingBatch}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // DSR (Daily Sales Report) modal logic
  const openDsrDialog = () => {
    setDsrPreset("today");
    setDateRange(rangeForPreset("today"));
    setDsrRecords([]);
    setDsrOpen(true);
  };

  const fetchDSRRecords = async () => {
    setDsrLoading(true);
    try {
      const tz = "Asia/Kolkata";
      const fromIso = from.tz(tz).startOf("day").utc().toISOString();
      const toIso = to.tz(tz).endOf("day").utc().toISOString();
      const url = `${API_BASE}/api/organizations/${orgId}/sale-history/by-date?from=${fromIso}&to=${toIso}`;
      const res = await axios.get(url);
      const items = Array.isArray(res.data) ? res.data : [];
      setDsrRecords(items);
    } catch {
      setDsrRecords([]);
      toast({ title: "Failed to load DSR records!", variant: "destructive" });
    }
    setDsrLoading(false);
  };

  const downloadDSRcsv = () => {
    if (!dsrRecords.length) return;
    const csv = [
      "Date,Product,Gun,Operator,Testing(Ltrs),Liters,Sale(₹),Cash,UPI,Card,Short,Received",
      ...dsrRecords.map((r: any) =>
        [
          dayjs(r.dateTime).format("DD-MM-YYYY"),
          r.productName,
          r.gins ?? r.guns,
          r.empId,
          r.testingTotal || 0,
          r.salesInLiters,
          r.salesInRupees,
          r.cashReceived,
          r.phonePay,
          r.creditCard,
          r.shortCollections,
          r.receivedTotal,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DSR_${from.format("DD-MM-YYYY")}_to_${to.format("DD-MM-YYYY")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadDSRpdf = () => {
    if (!dsrRecords.length) return;
    const doc = new jsPDF();
    doc.text(`DSR Report (${from.format("DD-MM-YYYY")} to ${to.format("DD-MM-YYYY")})`, 14, 12);
    autoTable(doc, {
      startY: 18,
      head: [
        ["Date", "Product", "Gun", "Operator", "Testing(Ltrs)", "Liters", "Sale(₹)", "Cash", "UPI", "Card", "Short", "Received"],
      ],
      body: dsrRecords.map((r: any) => [
        dayjs(r.dateTime).format("DD-MM-YYYY"),
        r.productName,
        r.guns,
        r.empId,
        r.testingTotal || 0,
        r.salesInLiters,
        r.salesInRupees,
        r.cashReceived,
        r.phonePay,
        r.creditCard,
        r.shortCollections,
        r.receivedTotal,
      ]),
    });
    doc.save(`DSR_${from.format("DD-MM-YYYY")}_to_${to.format("DD-MM-YYYY")}.pdf`);
  };

  useEffect(() => {
    if (dsrOpen) {
      setDateRange(rangeForPreset(dsrPreset));
      setDsrRecords([]);
    }
  }, [dsrPreset, dsrOpen]);

  useEffect(() => {
    if (dsrPreset === "custom") setDsrRecords([]);
  }, [from, to, dsrPreset]);

  const closeDsrDialog = () => {
    setDsrOpen(false);
    setDsrRecords([]);
    setDsrLoading(false);
  };

  // Stats and summaries for dashboard (today-only view)
  const tz = "Asia/Kolkata";
  const start = dayjs().tz(tz).startOf("day");
  const end = dayjs().tz(tz).endOf("day");
  const isWithin = (iso?: string) => {
    if (!iso) return false;
    const d = dayjs(iso);
    return d.isAfter(start) && d.isBefore(end);
  };

  const todaySalesRaw = useMemo(() => sales.filter((s: any) => isWithin(s.dateTime)).slice().reverse(), [sales]);
  const todaysCollections = useMemo(() => collections.filter((c: any) => isWithin(c.dateTime)), [collections]);

  const collectionSummary = useMemo(() => {
    let cash = 0, upi = 0, card = 0, short = 0, received = 0, expected = 0;
    todaysCollections.forEach((col: any) => {
      cash += Number(col.cashReceived) || 0;
      upi += Number(col.phonePay) || 0;
      card += Number(col.creditCard) || 0;
      short += Number(col.shortCollections) || 0;
      received += Number(col.receivedTotal) || 0;
      expected += Number(col.expectedTotal) || 0;
    });
    return { cash, upi, card, short, received, expected };
  }, [todaysCollections]);

  const stats = useMemo(() => {
    let total = 0;
    todaySalesRaw.forEach((sale: any) => { total += sale.salesInRupees || 0; });
    const totalPct = total ? (x: number) => Math.round((x / total) * 100) : () => 0;
    return [
      { title: "Total Sales", value: `${RUPEE}${total.toLocaleString()}`, change: "", icon: DollarSign, color: "text-success", bgColor: "bg-success-soft" },
      { title: "Cash Collection", value: `${RUPEE}${collectionSummary.cash.toLocaleString()}`, change: `${totalPct(collectionSummary.cash)}% of total`, icon: Banknote, color: "text-primary", bgColor: "bg-primary-soft" },
      { title: "UPI Collection", value: `${RUPEE}${collectionSummary.upi.toLocaleString()}`, change: `${totalPct(collectionSummary.upi)}% of total (UPI)`, icon: CreditCard, color: "text-accent", bgColor: "bg-accent-soft" },
      { title: "Card Collection", value: `${RUPEE}${collectionSummary.card.toLocaleString()}`, change: `${totalPct(collectionSummary.card)}% of total (Card)`, icon: CreditCard, color: "text-accent", bgColor: "bg-accent-soft" },
    ];
  }, [todaySalesRaw, collectionSummary]);

  const summary = useMemo(() => {
    const productMap: Record<string, number> = {};
    todaySalesRaw.forEach((sale: any) => {
      const prod = sale.productName || "Other";
      productMap[prod] = (productMap[prod] || 0) + (sale.salesInRupees || 0);
    });
    const outProducts = Object.entries(productMap).map(([k, v]) => ({ name: k, value: v }));
    return { products: outProducts };
  }, [todaySalesRaw]);

  const totalPages = Math.ceil(todaySalesRaw.length / SALES_PER_PAGE);
  const todaySales = useMemo(
    () => todaySalesRaw.slice((currentPage - 1) * SALES_PER_PAGE, currentPage * SALES_PER_PAGE),
    [todaySalesRaw, currentPage]
  );
  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // Render
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Batch summary modal */}
      {renderBatchSummaryDialog()}

      {/* DSR dialog */}
      <Dialog open={dsrOpen} onOpenChange={(open) => { if (!open) closeDsrDialog(); }}>
        <DialogContent className="max-w-lg w-[96vw]">
          <DialogHeader>
            <DialogTitle>Download DSR Report</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            {["today", "week", "month"].map((p) => (
              <Button
                key={p}
                variant={dsrPreset === p ? "default" : "outline"}
                onClick={() => setDsrPreset(p as any)}
                className="capitalize flex-1"
              >
                {p}
              </Button>
            ))}
            <Button
              variant={dsrPreset === "custom" ? "default" : "outline"}
              onClick={() => setDsrPreset("custom")}
              className="flex-1"
            >
              Custom
            </Button>
          </div>
          {dsrPreset === "custom" && (
            <div className="flex gap-2 mb-2">
              <div>
                <Label>From</Label>
                <Input type="date" value={from.format("YYYY-MM-DD")} onChange={(e) => setDateRange(([_, oldTo]) => [dayjs(e.target.value), oldTo])} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={to.format("YYYY-MM-DD")} onChange={(e) => setDateRange(([oldFrom, _]) => [oldFrom, dayjs(e.target.value)])} />
              </div>
              <Button onClick={fetchDSRRecords} disabled={dsrLoading}>Apply</Button>
            </div>
          )}
          <div className="flex flex-col items-center gap-3 mt-2">
            <Button onClick={fetchDSRRecords} disabled={dsrLoading}>
              {dsrLoading ? "Loading..." : "Load Records"}
            </Button>
            {dsrRecords.length > 0 && (
              <div className="flex w-full gap-2">
                <Button className="flex-1" onClick={downloadDSRcsv}>Download CSV</Button>
                <Button className="flex-1" onClick={downloadDSRpdf}>Download PDF</Button>
              </div>
            )}
            {dsrRecords.length === 0 && !dsrLoading && (
              <span className="text-xs text-muted-foreground italic">No records loaded. Set range and click "Load Records" first.</span>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={closeDsrDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header and stats */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales & Collections</h1>
          <p className="text-muted-foreground">Record sales and track daily collections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openDsrDialog}>
            <FileText className="mr-2 h-4 w-4" />
            Generate DSR
          </Button>
          <Button variant="secondary" onClick={() => navigate("/sales-history")}>
            <List className="mr-2 h-4 w-4" />
            View Sales History
          </Button>
        </div>
      </div>

      {/* Main row: form, today's sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <Card className="card-gradient relative flex flex-col" style={{ maxHeight: 550 }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Record Sale & Collection
            </CardTitle>
          </CardHeader>
          <form
            id="sale-form"
            className="flex-1 flex flex-col"
            onSubmit={handleSubmit}
            autoComplete="off"
            style={{ minHeight: 0 }}
          >
            <div className="overflow-y-auto pr-2 flex-1" style={{ maxHeight: 400 }}>
              <div className="space-y-4 p-4 pb-20">
                <div className="space-y-2">
                  <Label htmlFor="empId">Employee ID</Label>
                  <Input id="empId" name="empId" value={empId} readOnly disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel-type">Fuel Type</Label>
                  <select
                    className="w-full p-2 border border-border rounded-md bg-background"
                    name="fuel"
                    value={form.fuel}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select Fuel</option>
                    {products.map((p: any) => (
                      <option key={p.productName} value={p.productName}>{p.productName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gun">Gun</Label>
                  <select
                    className="w-full p-2 border border-border rounded-md bg-background"
                    name="gun"
                    value={form.gun}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select Gun</option>
                    {filteredGuns.map((g: any) => (
                      <option key={g.guns} value={g.guns}>{g.guns} ({g.serialNumber})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testingTotal">Testing (Liters)</Label>
                  <Input
                    id="testingTotal"
                    name="testingTotal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.testingTotal}
                    placeholder="Liters"
                    onChange={handleFormChange}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingStock">Opening Stock</Label>
                  <Input id="openingStock" name="openingStock" type="number" step="0.001" value={form.openingStock} readOnly disabled onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closingStock">Closing Stock</Label>
                  <Input
                    id="closingStock"
                    name="closingStock"
                    type="number"
                    step="0.001"
                    value={form.closingStock}
                    onChange={handleFormChange}
                    min={Number(form.openingStock || 0) + 0.001}
                    required
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saleLiters">Sale (Liters, minus testing)</Label>
                  <Input id="saleLiters" name="saleLiters" type="number" step="0.001" value={form.saleLiters} readOnly disabled onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price per Liter</Label>
                  <Input id="price" name="price" type="number" step="0.01" value={form.price} readOnly disabled onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesInRupees">Total Sale (₹, testing excluded)</Label>
                  <Input id="salesInRupees" name="salesInRupees" type="number" step="0.01" value={form.salesInRupees} readOnly disabled onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Label>Collection Details (must add up exactly)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cashReceived">Cash Received</Label>
                      <Input id="cashReceived" name="cashReceived" type="number" min="0" step="0.01" placeholder="₹" value={form.cashReceived} onChange={handleFormChange} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                    </div>
                    <div>
                      <Label htmlFor="phonePay">UPI Received</Label>
                      <Input id="phonePay" name="phonePay" type="number" min="0" step="0.01" placeholder="₹" value={form.phonePay} onChange={handleFormChange} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                    </div>
                    <div>
                      <Label htmlFor="creditCard">Card Received</Label>
                      <Input id="creditCard" name="creditCard" type="number" min="0" step="0.01" placeholder="₹" value={form.creditCard} onChange={handleFormChange} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                    </div>
                    <div>
                      <Label htmlFor="shortCollections">Short Collections</Label>
                      <Input id="shortCollections" name="shortCollections" type="number" min="0" step="0.01" value={form.shortCollections} readOnly disabled onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky batch/single mode buttons */}
            <div className="sticky bottom-0 left-0 w-full bg-background/90 backdrop-blur rounded-b-lg z-10 px-4 py-3 border-t border-border flex flex-col gap-2">
              {!batchMode && (
                <>
                  <Button
                    className="w-full btn-gradient-success"
                    type="submit"
                    disabled={saleCollectionMutation.isPending || submittingRef.current}
                  >
                    <IndianRupee className="mr-2 h-4 w-4" />
                    {saleCollectionMutation.isPending ? "Recording..." : "Record Sale & Collection"}

                  </Button>
                  <Button
                    className="w-full"
                    type="button"
                    variant="secondary"
                    onClick={handleAddAnotherSale}
                    disabled={saleCollectionMutation.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Sale (Batch Mode)
                  </Button>
                </>
              )}
              {batchMode && (
                <>
                  <Button
                    className="w-full"
                    variant="default"
                    type="button"
                    onClick={handleAddAnotherSale}
                    disabled={isSubmittingBatch}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add This Sale
                  </Button>
                  <Button
                    className="w-full btn-gradient-info"
                    type="button"
                    onClick={handleShowBatchSummary}
                    disabled={(saleEntries.length === 0 && !form.fuel) || isSubmittingBatch}
                  >
                    Show Summary & Submit
                  </Button>
                </>
              )}
            </div>
          </form>
        </Card>

        {/* Today's sales */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-muted-foreground">Loading sales...</div>
              ) : todaySales.length === 0 ? (
                <div className="text-muted-foreground">No sales entries today.</div>
              ) : (
                todaySales.map((sale: any, index: number) => (
                  <div key={sale.id || `${sale.productName}-${sale.guns}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground min-w-[120px]">
                        {sale.dateTime
                          ? dayjs(sale.dateTime).tz("Asia/Kolkata").format("DD/MM/YYYY HH:mm")
                          : "--"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{sale.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {sale.salesInLiters}L × ₹{sale.price}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Gun: {sale.guns} | Emp: {sale.empId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Testing: {sale.testingTotal || 0} Ltrs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">₹{(sale.salesInRupees || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {todaySalesRaw.length > SALES_PER_PAGE && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={handlePrevPage}>Prev</Button>
                <span className="text-xs">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={handleNextPage}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily summary cards */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Collections Totals</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl shadow-md p-4 bg-green-50 border-l-4 border-green-600">
                  <p className="text-sm text-green-900 font-semibold mb-1">Cash</p>
                  <p className="text-2xl font-bold text-green-700">{RUPEE}{collectionSummary.cash.toLocaleString()}</p>
                </div>
                <div className="rounded-xl shadow-md p-4 bg-indigo-50 border-l-4 border-indigo-600">
                  <p className="text-sm text-indigo-900 font-semibold mb-1">UPI</p>
                  <p className="text-2xl font-bold text-indigo-700">{RUPEE}{collectionSummary.upi.toLocaleString()}</p>
                </div>
                <div className="rounded-xl shadow-md p-4 bg-blue-50 border-l-4 border-blue-600">
                  <p className="text-sm text-blue-900 font-semibold mb-1">Card</p>
                  <p className="text-2xl font-bold text-blue-700">{RUPEE}{collectionSummary.card.toLocaleString()}</p>
                </div>
                <div className="rounded-xl shadow-md p-4 bg-yellow-50 border-l-4 border-yellow-500">
                  <p className="text-sm text-yellow-900 font-semibold mb-1">Short Collections</p>
                  <p className="text-2xl font-bold text-yellow-700">{RUPEE}{collectionSummary.short.toLocaleString()}</p>
                </div>
                <div className="rounded-xl shadow-md p-4 bg-purple-50 border-l-4 border-purple-600 col-span-2">
                  <p className="text-sm text-purple-900 font-semibold mb-1">Expected Total</p>
                  <p className="text-2xl font-bold text-purple-700">{RUPEE}{collectionSummary.expected.toLocaleString()}</p>
                </div>
                <div className="rounded-xl shadow-md p-4 bg-pink-50 border-l-4 border-pink-600 col-span-2">
                  <p className="text-sm text-pink-900 font-semibold mb-1">Received Total</p>
                  <p className="text-2xl font-bold text-pink-700">{RUPEE}{collectionSummary.received.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Fuel-wise Sales</h4>
              <div className="grid grid-cols-1 gap-3">
                {summary.products.map((prod, idx) => (
                  <div
                    key={prod.name}
                    className={
                      "rounded-xl shadow-md px-5 py-4 flex items-center justify-between " +
                      (idx % 2 === 0
                        ? "bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-600"
                        : "bg-gradient-to-r from-orange-100 to-orange-50 border-l-4 border-orange-500")
                    }
                  >
                    <span className="text-lg font-bold">{prod.name}</span>
                    <span className="text-lg font-bold">{RUPEE}{prod.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
