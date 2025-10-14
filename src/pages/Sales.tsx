import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Plus, CreditCard, Banknote, Calendar, Clock, FileText, List } from "lucide-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

dayjs.extend(utc);
dayjs.extend(timezone);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://fineflux-spring.onrender.com";
const RUPEE = "\u20B9";

const rangeForPreset = (preset: string) => {
  const today = dayjs().startOf('day');
  switch (preset) {
    case "today":
      return [today, today];
    case "week":
      return [today.startOf('week'), today.endOf('week')];
    case "month":
      return [today.startOf('month'), today.endOf('month')];
    default:
      return [today, today];
  }
};

export default function Sales() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const empId = localStorage.getItem("empId") || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // DSR modal state
  const [dsrOpen, setDsrOpen] = useState(false);
  const [dsrPreset, setDsrPreset] = useState<"today" | "week" | "month" | "custom">("today");
  const [[from, to], setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => rangeForPreset("today") as [dayjs.Dayjs, dayjs.Dayjs]);
  const [dsrRecords, setDsrRecords] = useState<any[]>([]);
  const [dsrLoading, setDsrLoading] = useState(false);

  // Sales Entry form
  const [form, setForm] = useState({
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
  });

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

  const filteredGuns = useMemo(() =>
    !form.fuel ? [] : guns.filter((g: any) => g.productName === form.fuel),
    [form.fuel, guns]
  );

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
      openingStock: openingStock,
      price: price,
      closingStock: "",
      saleLiters: "",
      salesInRupees: "",
      cashReceived: "",
      phonePay: "",
      creditCard: "",
      shortCollections: "",
      gun: filteredGuns.some((g: any) => g.guns === prev.gun) ? prev.gun : "",
    }));
    // eslint-disable-next-line
  }, [form.gun, form.fuel, guns, products]);

  useEffect(() => {
    const open = Number(form.openingStock) || 0;
    const close = Number(form.closingStock) || 0;
    const liters = close > open ? close - open : 0;
    const amt = Math.round((Number(form.price) * liters) * 100) / 100;
    setForm((f) => ({
      ...f,
      saleLiters: liters > 0 ? liters.toString() : "",
      salesInRupees: liters > 0 ? amt.toFixed(2) : "",
    }));
  }, [form.closingStock, form.openingStock, form.price]);

  useEffect(() => {
    const amt = Number(form.salesInRupees) || 0;
    const cash = Number(form.cashReceived) || 0;
    const upi = Number(form.phonePay) || 0;
    const card = Number(form.creditCard) || 0;
    const short = Math.max(0, Number((amt - (cash + upi + card)).toFixed(2)));
    setForm((f) => ({
      ...f,
      shortCollections: amt > 0 ? short.toFixed(2) : "",
    }));
  }, [form.cashReceived, form.phonePay, form.creditCard, form.salesInRupees]);

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const saleCollectionMutation = useMutation({
    mutationFn: async (input: typeof form) => {
      const now = new Date();
      const saleDTO = {
        organizationId: orgId,
        empId,
        productName: input.fuel,
        guns: input.gun,
        closingStock: Number(input.closingStock),
        testingTotal: 0,
        price: Number(input.price),
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
      setForm({
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
      });
      toast({
        title: "Sale & Collection Recorded",
        description: "All records added.",
        variant: "default"
      });
    },
    onError: () => {
      toast({ title: "Failed to record sale or collection", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { fuel, price, gun, openingStock, closingStock, cashReceived, phonePay, creditCard, shortCollections } = form;
    if (!fuel || !gun || price === "" || openingStock === "" || closingStock === "") {
      toast({ title: "Please select product, gun and fill closing stock.", variant: "destructive" });
      return;
    }
    const openNum = Number(openingStock), closeNum = Number(closingStock);
    if (isNaN(openNum) || isNaN(closeNum) || closeNum <= openNum) {
      toast({ title: "Closing stock must be greater than opening stock.", variant: "destructive" });
      return;
    }
    const liters = closeNum - openNum;
    if (liters <= 0) {
      toast({ title: "Sale liters must be positive.", variant: "destructive" });
      return;
    }
    const priceNum = Number(price);
    const saleAmt = Math.round(priceNum * liters * 100) / 100;
    const cash = Number(cashReceived) || 0;
    const upi = Number(phonePay) || 0;
    const card = Number(creditCard) || 0;
    const short = Number(shortCollections) || 0;
    if (short > 10) {
      toast({
        title: "Short collection too high!",
        description: `Short collection is ₹${short.toFixed(2)}. It must be ₹10 or less.`,
        variant: "destructive"
      });
      return;
    }
    if (short < 0) {
      toast({ title: "Short collection can't be negative.", variant: "destructive" });
      return;
    }
    saleCollectionMutation.mutate(form);
  };

  // Daily summary/stat cards
  const collectionSummary = useMemo(() => {
    let cash = 0, upi = 0, card = 0, short = 0, received = 0, expected = 0;
    collections.forEach((col: any) => {
      cash += Number(col.cashReceived) || 0;
      upi += Number(col.phonePay) || 0;
      card += Number(col.creditCard) || 0;
      short += Number(col.shortCollections) || 0;
      received += Number(col.receivedTotal) || 0;
      expected += Number(col.expectedTotal) || 0;
    });
    return { cash, upi, card, short, received, expected };
  }, [collections]);

  const stats = useMemo(() => {
    let total = 0;
    sales.forEach((sale) => { total += sale.salesInRupees || 0; });
    const totalPct = total ? (x: number) => Math.round((x / total) * 100) : () => 0;
    return [
      { title: "Total Sales", value: `${RUPEE}${total.toLocaleString()}`, change: "", icon: DollarSign, color: "text-success", bgColor: "bg-success-soft" },
      { title: "Cash Collection", value: `${RUPEE}${collectionSummary.cash.toLocaleString()}`, change: `${totalPct(collectionSummary.cash)}% of total`, icon: Banknote, color: "text-primary", bgColor: "bg-primary-soft" },
      { title: "UPI Collection", value: `${RUPEE}${collectionSummary.upi.toLocaleString()}`, change: `${totalPct(collectionSummary.upi)}% of total (UPI)`, icon: CreditCard, color: "text-accent", bgColor: "bg-accent-soft" },
      { title: "Card Collection", value: `${RUPEE}${collectionSummary.card.toLocaleString()}`, change: `${totalPct(collectionSummary.card)}% of total (Card)`, icon: CreditCard, color: "text-accent", bgColor: "bg-accent-soft" },
    ];
  }, [sales, collectionSummary]);

  const summary = useMemo(() => {
    const productMap: any = {};
    sales.forEach((sale) => {
      const prod = sale.productName || "Other";
      productMap[prod] = (productMap[prod] || 0) + (sale.salesInRupees || 0);
    });
    const outProducts = Object.entries(productMap).map(([k, v]) => ({ name: k, value: v }));
    return {
      products: outProducts,
    };
  }, [sales]);

  const todaySales = useMemo(() => sales.slice().reverse().slice(0, 10), [sales]);

  // DSR/Report dialog handlers below
  const openDsrDialog = () => {
    setDsrPreset("today");
    setDateRange(rangeForPreset("today") as [dayjs.Dayjs, dayjs.Dayjs]);
    setDsrRecords([]);
    setDsrOpen(true);
  };

  const fetchDSRRecords = async () => {
    setDsrLoading(true);
    try {
      const url = `${API_BASE}/api/organizations/${orgId}/sale-history/by-date?from=${from.startOf('day').toISOString()}&to=${to.endOf('day').toISOString()}`;
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
      "Date,Product,Gun,Operator,Liters,Sale(₹),Cash,UPI,Card,Short,Received",
      ...dsrRecords.map((r: any) =>
        [
          dayjs(r.dateTime).format("DD-MM-YYYY"),
          r.productName,
          r.guns,
          r.empId,
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
        ["Date", "Product", "Gun", "Operator", "Liters", "Sale(₹)", "Cash", "UPI", "Card", "Short", "Received"]
      ],
      body: dsrRecords.map((r: any) => [
        dayjs(r.dateTime).format("DD-MM-YYYY"),
        r.productName,
        r.guns,
        r.empId,
        r.salesInLiters,
        r.salesInRupees,
        r.cashReceived,
        r.phonePay,
        r.creditCard,
        r.shortCollections,
        r.receivedTotal,
      ])
    });
    doc.save(`DSR_${from.format("DD-MM-YYYY")}_to_${to.format("DD-MM-YYYY")}.pdf`);
  };

  useEffect(() => {
    if (dsrOpen) {
      setDateRange(rangeForPreset(dsrPreset) as [dayjs.Dayjs, dayjs.Dayjs]);
      setDsrRecords([]);
    }
  }, [dsrPreset]);

  useEffect(() => {
    if (dsrPreset === "custom") setDsrRecords([]);
  }, [from, to]);

  const closeDsrDialog = () => {
    setDsrOpen(false);
    setDsrRecords([]);
    setDsrLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* DSR Dialog */}
      <Dialog open={dsrOpen} onOpenChange={open => { if (!open) closeDsrDialog(); }}>
        <DialogContent className="max-w-lg w-[96vw]">
          <DialogHeader>
            <DialogTitle>Download DSR Report</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            {["today", "week", "month"].map(p => (
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
                <Input type="date" value={from.format("YYYY-MM-DD")} onChange={e => setDateRange(([_, oldTo]) => [dayjs(e.target.value), oldTo])} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={to.format("YYYY-MM-DD")} onChange={e => setDateRange(([oldFrom, _]) => [oldFrom, dayjs(e.target.value)])} />
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
                <Button className="flex-1" onClick={downloadDSRcsv}>
                  Download CSV
                </Button>
                <Button className="flex-1" onClick={downloadDSRpdf}>
                  Download PDF
                </Button>
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

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title + i} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </div>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                  <Label htmlFor="openingStock">Opening Stock</Label>
                  <Input id="openingStock" name="openingStock" type="number" value={form.openingStock} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closingStock">Closing Stock</Label>
                  <Input
                    id="closingStock"
                    name="closingStock"
                    type="number"
                    value={form.closingStock}
                    onChange={handleFormChange}
                    min={Number(form.openingStock || 0) + 1}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saleLiters">Sale (Liters)</Label>
                  <Input id="saleLiters" name="saleLiters" type="number" value={form.saleLiters} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Liter</Label>
                  <Input id="price" name="price" type="number" value={form.price} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salesInRupees">Total Sale (₹)</Label>
                  <Input id="salesInRupees" name="salesInRupees" type="number" value={form.salesInRupees} readOnly disabled />
                </div>
                <div className="border-t pt-4 space-y-2">
                  <Label>Collection Details (must add up exactly)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cashReceived">Cash Received</Label>
                      <Input id="cashReceived" name="cashReceived" type="number" min="0" placeholder="₹" value={form.cashReceived} onChange={handleFormChange} />
                    </div>
                    <div>
                      <Label htmlFor="phonePay">UPI Received</Label>
                      <Input id="phonePay" name="phonePay" type="number" min="0" placeholder="₹" value={form.phonePay} onChange={handleFormChange} />
                    </div>
                    <div>
                      <Label htmlFor="creditCard">Card Received</Label>
                      <Input id="creditCard" name="creditCard" type="number" min="0" placeholder="₹" value={form.creditCard} onChange={handleFormChange} />
                    </div>
                    <div>
                      <Label htmlFor="shortCollections">Short Collections</Label>
                      <Input id="shortCollections" name="shortCollections" type="number" min="0" value={form.shortCollections} readOnly disabled />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Sticky submit button */}
            <div className="sticky bottom-0 left-0 w-full bg-background/90 backdrop-blur rounded-b-lg z-10 px-4 py-3 border-t border-border">
              <Button
                className="w-full btn-gradient-success"
                type="submit"
                disabled={saleCollectionMutation.isPending}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                {saleCollectionMutation.isPending ? "Recording..." : "Record Sale & Collection"}
              </Button>
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
              ) : todaySales.map((sale: any, index: number) => (
                <div key={sale.id || index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-4">
                    <td>
                      <div className="text-sm text-muted-foreground min-w-[120px]">
                        {sale.dateTime
                          ? dayjs(sale.dateTime).tz('Asia/Kolkata').format("DD/MM/YYYY HH:mm")
                          : "--"}
                      </div>
                    </td>

                    <div>
                      <p className="font-medium text-foreground">{sale.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.salesInLiters}L × ₹{sale.price}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Gun: {sale.guns} | Emp: {sale.empId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">₹{(sale.salesInRupees || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                {summary.products.map((prod: any, idx: number) => (
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
