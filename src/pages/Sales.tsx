import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Plus,
  CreditCard,
  Banknote,
  Calendar,
  Clock,
  FileText,
  List,
  IndianRupee,
  Download,
  Loader2,
  Target,
  CheckCircle,
  Droplet,
  Smartphone,
  Wallet,
  AlertCircle,
  Fuel,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

dayjs.extend(utc);
dayjs.extend(timezone);

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://finflux-64307221061.asia-south1.run.app";
const RUPEE = "\u20B9";
const SALES_PER_PAGE = 5;

const rangeForPreset = (
  preset: "today" | "week" | "month" | "custom"
): [dayjs.Dayjs, dayjs.Dayjs] => {
  const today = dayjs().startOf("day");
  switch (preset) {
    case "today":
      return [today, today];
    case "week":
      return [today.startOf("week"), today.endOf("week")];
    case "month":
      return [today.startOf("month"), today.endOf("month")];
    default:
      return [today, today];
  }
};

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

  const [dsrOpen, setDsrOpen] = useState(false);
  const [dsrPreset, setDsrPreset] = useState<"today" | "week" | "month" | "custom">("today");
  const [[from, to], setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() =>
    rangeForPreset("today")
  );
  const [dsrRecords, setDsrRecords] = useState<any[]>([]);
  const [dsrLoading, setDsrLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [saleEntries, setSaleEntries] = useState<FormState[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const submittingRef = useRef(false);
  const isBatchRef = useRef(false);

  const { data: products = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () =>
      (await axios.get(`${API_BASE}/api/organizations/${orgId}/products`)).data || [],
  });

  const { data: guns = [] } = useQuery({
    queryKey: ["guninfo", orgId],
    queryFn: async () =>
      (await axios.get(`${API_BASE}/api/organizations/${orgId}/guninfo`)).data || [],
  });

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () =>
      (await axios.get(`${API_BASE}/api/organizations/${orgId}/sales`)).data || [],
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["collections", orgId],
    queryFn: async () =>
      (await axios.get(`${API_BASE}/api/organizations/${orgId}/collections`)).data || [],
  });

  const filteredGuns = useMemo(
    () => (!form.fuel ? [] : guns.filter((g: any) => g.productName === form.fuel)),
    [form.fuel, guns]
  );

  useEffect(() => {
    let openingStock = "";
    let price = "";
    if (form.gun) {
      const gunObj = guns.find(
        (g: any) => g.guns === form.gun && (!form.fuel || g.productName === form.fuel)
      );
      if (gunObj && typeof gunObj.currentReading !== "undefined")
        openingStock = gunObj.currentReading;
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
  }, [form.gun, form.fuel, guns, products, filteredGuns]);

  useEffect(() => {
    const open = Number(form.openingStock) || 0;
    const close = Number(form.closingStock) || 0;
    const testing = Number(form.testingTotal) || 0;
    const pricePerLiter = Number(form.price) || 0;
    const grossSale = close > open ? close - open : 0;
    const netSale = Math.max(0, grossSale - testing);
    const salesAmount = Math.round(netSale * pricePerLiter * 100) / 100;
    setForm((f) => ({
      ...f,
      saleLiters: netSale > 0 ? netSale.toFixed(3) : "",
      salesInRupees: salesAmount > 0 ? salesAmount.toFixed(2) : "",
    }));
  }, [form.closingStock, form.openingStock, form.price, form.testingTotal]);

  useEffect(() => {
    const salesAmount = Number(form.salesInRupees) || 0;
    const cash = Number(form.cashReceived) || 0;
    const upi = Number(form.phonePay) || 0;
    const card = Number(form.creditCard) || 0;
    const totalReceived = cash + upi + card;
    const short = Math.max(0, Math.round((salesAmount - totalReceived) * 100) / 100);
    setForm((f) => ({
      ...f,
      shortCollections: salesAmount > 0 ? short.toFixed(2) : "",
    }));
  }, [form.cashReceived, form.phonePay, form.creditCard, form.salesInRupees]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

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
        saleLiters: Number(input.saleLiters) || 0,
        salesInRupees: Number(input.salesInRupees) || 0,
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

  function isFormValid(f: FormState) {
    const { fuel, price, gun, openingStock, closingStock, testingTotal, saleLiters, shortCollections } = f;
    if (!fuel || !gun || price === "" || openingStock === "" || closingStock === "") {
      toast({ title: "Please select product, gun and fill closing stock.", variant: "destructive" });
      return false;
    }
    const openNum = Number(openingStock), closeNum = Number(closingStock), testingNum = Number(testingTotal) || 0;
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
      toast({ title: "Short collection too high!", description: `Short collection is ₹${short.toFixed(2)}. It must be ₹10 or less.`, variant: "destructive" });
      return false;
    }
    if (short < 0) {
      toast({ title: "Short collection can't be negative.", variant: "destructive" });
      return false;
    }
    return true;
  }

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

  const handleBatchSubmit = async () => {
    if (saleEntries.length === 0) return;
    setIsSubmittingBatch(true);
    isBatchRef.current = true;
    try {
      for (const entry of saleEntries) {
        await saleCollectionMutation.mutateAsync(entry);
      }
      setSaleEntries([]);
      setBatchMode(false);
      setShowSummaryPopup(false);
      toast({ title: `${saleEntries.length} sales recorded successfully!`, variant: "default" });
    } catch (e) {
      toast({ title: "Batch submit failed", variant: "destructive" });
    } finally {
      isBatchRef.current = false;
      setIsSubmittingBatch(false);
    }
  };

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

  const renderBatchSummaryDialog = () => {
    const summary = getBatchSummary(saleEntries);
    return (
      <Dialog open={showSummaryPopup} onOpenChange={(open) => setShowSummaryPopup(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sales Batch Summary</DialogTitle>
          </DialogHeader>
          <div className="mb-4 max-h-40 overflow-y-auto">
            <h4 className="font-semibold">Total Entries: {saleEntries.length}</h4>
            <h4 className="font-semibold mt-3">Product-wise Sale (Net Liters)</h4>
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
              {isSubmittingBatch ? "Submitting..." : `Submit ${saleEntries.length} Sales`}
            </Button>
            <Button variant="secondary" onClick={() => setShowSummaryPopup(false)} disabled={isSubmittingBatch}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

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
        [dayjs(r.dateTime).format("DD-MM-YYYY"), r.productName, r.guns, r.empId, r.testingTotal || 0, r.salesInLiters, r.salesInRupees, r.cashReceived, r.phonePay, r.creditCard, r.shortCollections, r.receivedTotal].join(",")
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
      head: [["Date", "Product", "Gun", "Operator", "Testing(Ltrs)", "Liters", "Sale(₹)", "Cash", "UPI", "Card", "Short", "Received"]],
      body: dsrRecords.map((r: any) => [dayjs(r.dateTime).format("DD-MM-YYYY"), r.productName, r.guns, r.empId, r.testingTotal || 0, r.salesInLiters, r.salesInRupees, r.cashReceived, r.phonePay, r.creditCard, r.shortCollections, r.receivedTotal]),
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
    let cash = 0, upi = 0, card = 0, short = 0;
    todaysCollections.forEach((col: any) => {
      cash += Number(col.cashReceived) || 0;
      upi += Number(col.phonePay) || 0;
      card += Number(col.creditCard) || 0;
      short += Number(col.shortCollections) || 0;
    });
    const received = cash + upi + card;
    let expected = 0;
    todaySalesRaw.forEach((sale: any) => {
      expected += Number(sale.salesInRupees) || 0;
    });
    return { cash, upi, card, short, received, expected };
  }, [todaysCollections, todaySalesRaw]);

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
  const todaySales = useMemo(() => todaySalesRaw.slice((currentPage - 1) * SALES_PER_PAGE, currentPage * SALES_PER_PAGE), [todaySalesRaw, currentPage]);
  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="space-y-6 animate-fade-in">
      {renderBatchSummaryDialog()}

      <Dialog open={dsrOpen} onOpenChange={(open) => { if (!open) closeDsrDialog(); }}>
        <DialogContent className="max-w-lg w-[96vw]">
          <DialogHeader>
            <DialogTitle>Download DSR Report</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            {["today", "week", "month"].map((p) => (
              <Button key={p} variant={dsrPreset === p ? "default" : "outline"} onClick={() => setDsrPreset(p as any)} className="capitalize flex-1">{p}</Button>
            ))}
            <Button variant={dsrPreset === "custom" ? "default" : "outline"} onClick={() => setDsrPreset("custom")} className="flex-1">Custom</Button>
          </div>
          {dsrPreset === "custom" && (
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <Label>From</Label>
                <Input type="date" value={from.format("YYYY-MM-DD")} onChange={(e) => setDateRange(([_, oldTo]) => [dayjs(e.target.value), oldTo])} />
              </div>
              <div className="flex-1">
                <Label>To</Label>
                <Input type="date" value={to.format("YYYY-MM-DD")} onChange={(e) => setDateRange(([oldFrom, _]) => [oldFrom, dayjs(e.target.value)])} />
              </div>
              <Button onClick={fetchDSRRecords} disabled={dsrLoading} className="self-end">Apply</Button>
            </div>
          )}
          <div className="flex flex-col items-center gap-3 mt-2">
            <Button onClick={fetchDSRRecords} disabled={dsrLoading}>
              {dsrLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>) : "Load Records"}
            </Button>
            {dsrRecords.length > 0 && (
              <div className="flex w-full gap-2">
                <Button className="flex-1" onClick={downloadDSRcsv}><Download className="mr-2 h-4 w-4" />Download CSV</Button>
                <Button className="flex-1" onClick={downloadDSRpdf}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales & Collections</h1>
          <p className="text-muted-foreground">Record sales and track daily collections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openDsrDialog}><FileText className="mr-2 h-4 w-4" />Generate DSR</Button>
          <Button variant="secondary" onClick={() => navigate("/sales-history")}><List className="mr-2 h-4 w-4" />View Sales History</Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background via-muted/5 to-background">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Banknote className="h-5 w-5 text-primary" /></div>
              Collections Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <Wallet className="h-8 w-8 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">Cash</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-1">Cash Collected</p>
                  <p className="text-3xl font-bold tracking-tight">{RUPEE}{collectionSummary.cash.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <Smartphone className="h-8 w-8 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">UPI</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-1">UPI Payments</p>
                  <p className="text-3xl font-bold tracking-tight">{RUPEE}{collectionSummary.upi.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <CreditCard className="h-8 w-8 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">Card</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-1">Card Payments</p>
                  <p className="text-3xl font-bold tracking-tight">{RUPEE}{collectionSummary.card.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <AlertCircle className="h-8 w-8 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">Short</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-1">Short Collections</p>
                  <p className="text-3xl font-bold tracking-tight">{RUPEE}{collectionSummary.short.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <Target className="h-8 w-8 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">Expected</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-1">Expected Total</p>
                  <p className="text-3xl font-bold tracking-tight">{RUPEE}{collectionSummary.expected.toLocaleString()}</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <CheckCircle className="h-8 w-8 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">Received</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-1">Total Received</p>
                  <p className="text-3xl font-bold tracking-tight">{RUPEE}{collectionSummary.received.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-gradient relative flex flex-col" style={{ maxHeight: 550 }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Record Sale & Collection</CardTitle>
          </CardHeader>
          <form id="sale-form" className="flex-1 flex flex-col" onSubmit={handleSubmit} autoComplete="off" style={{ minHeight: 0 }}>
            <div className="overflow-y-auto pr-2 flex-1" style={{ maxHeight: 400 }}>
              <div className="space-y-4 p-4 pb-20">
                <div className="space-y-2">
                  <Label htmlFor="empId">Employee ID</Label>
                  <Input id="empId" name="empId" value={empId} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel-type">Fuel Type</Label>
                  <Select value={form.fuel} onValueChange={(val) => setForm((f) => ({ ...f, fuel: val }))}>
                    <SelectTrigger id="fuel-type" className="w-full"><SelectValue placeholder="Select Fuel" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.productName} value={p.productName}>{p.productName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gun">Gun</Label>
                  <Select value={form.gun} onValueChange={(val) => setForm((f) => ({ ...f, gun: val }))}>
                    <SelectTrigger id="gun" className="w-full"><SelectValue placeholder="Select Gun" /></SelectTrigger>
                    <SelectContent>
                      {filteredGuns.map((g: any) => (
                        <SelectItem key={g.guns} value={g.guns}>{g.guns} ({g.serialNumber})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testingTotal">Testing (Liters)</Label>
                  <Input id="testingTotal" name="testingTotal" type="number" min="0" step="0.01" value={form.testingTotal} placeholder="Liters" onChange={handleFormChange} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openingStock">Opening Stock</Label>
                  <Input id="openingStock" name="openingStock" type="number" step="0.001" value={form.openingStock} readOnly disabled onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closingStock">Closing Stock</Label>
                  <Input id="closingStock" name="closingStock" type="number" step="0.001" value={form.closingStock} onChange={handleFormChange} min={Number(form.openingStock || 0) + 0.001} required onWheel={(e) => (e.target as HTMLInputElement).blur()} />
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
                  <Label>Collection Details</Label>
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
            <div className="sticky bottom-0 left-0 w-full bg-background/90 backdrop-blur rounded-b-lg z-10 px-4 py-3 border-t border-border flex flex-col gap-2">
              {!batchMode && (
                <>
                  <Button className="w-full btn-gradient-success" type="submit" disabled={saleCollectionMutation.isPending || submittingRef.current}>
                    <IndianRupee className="mr-2 h-4 w-4" />{saleCollectionMutation.isPending ? "Recording..." : "Record Sale & Collection"}
                  </Button>
                  <Button className="w-full" type="button" variant="secondary" onClick={handleAddAnotherSale} disabled={saleCollectionMutation.isPending}>
                    <Plus className="mr-2 h-4 w-4" />Add Another Sale (Batch Mode)
                  </Button>
                </>
              )}
              {batchMode && (
                <>
                  <Button className="w-full" variant="default" type="button" onClick={handleAddAnotherSale} disabled={isSubmittingBatch}>
                    <Plus className="mr-2 h-4 w-4" />Add This Sale
                  </Button>
                  <Button className="w-full btn-gradient-info" type="button" onClick={handleShowBatchSummary} disabled={(saleEntries.length === 0 && !form.fuel) || isSubmittingBatch}>
                    Show Summary & Submit
                  </Button>
                </>
              )}
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background via-muted/5 to-background">
          <CardHeader className="border-b bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-600" /></div>
                Today's Sales
                <Badge variant="secondary" className="ml-2">{todaySalesRaw.length} {todaySalesRaw.length === 1 ? 'Entry' : 'Entries'}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Loading sales...</p>
                </div>
              ) : todaySales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Fuel className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No sales entries today</p>
                  <p className="text-sm text-muted-foreground">Record your first sale to see it here</p>
                </div>
              ) : (
                todaySales.map((sale: any, index: number) => (
                  <div key={sale.id || `${sale.productName}-${sale.guns}-${index}`} className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/50">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600" />
                    <div className="flex items-center justify-between gap-4 ml-3">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="shrink-0 p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                          <Droplet className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-lg text-foreground truncate">{sale.productName}</h4>
                            <Badge variant="outline" className="shrink-0">{sale.guns}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{sale.dateTime ? dayjs(sale.dateTime).tz("Asia/Kolkata").format("hh:mm A") : "--"}</span>
                            </div>
                            <div className="h-3 w-px bg-border" />
                            <div className="flex items-center gap-1">
                              <Droplet className="h-3 w-3" />
                              <span className="font-semibold text-foreground">{sale.salesInLiters}L</span>
                              <span>× ₹{sale.price}</span>
                            </div>
                            <div className="h-3 w-px bg-border" />
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{sale.empId}</span>
                            </div>
                            {sale.testingTotal > 0 && (
                              <>
                                <div className="h-3 w-px bg-border" />
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 text-amber-600" />
                                  <span>Testing: {sale.testingTotal}L</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground mb-1">Total Sale</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          ₹{(sale.salesInRupees || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {todaySalesRaw.length > SALES_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={handlePrevPage} className="hover:bg-muted">
                  <ChevronLeft className="h-4 w-4 mr-1" />Previous
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong></span>
                  <div className="hidden md:flex items-center gap-1 ml-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (<Button key={pageNum} size="sm" variant={currentPage === pageNum ? "default" : "outline"} onClick={() => setCurrentPage(pageNum)} className="w-9 h-9">{pageNum}</Button>);
                    })}
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={handleNextPage} className="hover:bg-muted">
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FUEL-WISE SALES AT BOTTOM */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background via-muted/5 to-background">
        <CardHeader className="border-b bg-gradient-to-r from-accent/5 to-primary/5">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Fuel className="h-5 w-5 text-accent" />
            </div>
            Fuel-wise Sales Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {summary.products.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Fuel className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No sales recorded today</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {summary.products.map((prod, idx) => {
                const colors = [
                  { from: "from-blue-500", to: "to-indigo-600", icon: "bg-blue-500" },
                  { from: "from-orange-500", to: "to-red-600", icon: "bg-orange-500" },
                  { from: "from-emerald-500", to: "to-teal-600", icon: "bg-emerald-500" },
                  { from: "from-purple-500", to: "to-pink-600", icon: "bg-purple-500" },
                ];
                const color = colors[idx % colors.length];
                return (
                  <div key={prod.name} className={`group relative overflow-hidden rounded-2xl bg-gradient-to-r ${color.from} ${color.to} p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${color.icon} bg-white/20`}><Droplet className="h-6 w-6" /></div>
                        <div>
                          <p className="text-sm opacity-90 mb-1">Product</p>
                          <p className="text-2xl font-bold">{prod.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90 mb-1">Total Sales</p>
                        <p className="text-3xl font-bold tracking-tight">{RUPEE}{prod.value.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
