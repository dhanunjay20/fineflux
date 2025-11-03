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
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  CreditCard,
  Banknote,
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
  Layers,
  Trash2,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/contexts/AuthContext";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://finflux-64307221061.asia-south1.run.app";
const RUPEE = "\u20B9";
const SALES_PER_PAGE = 5;

type SaleMode = "single" | "batch";

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
  ].join("|");
}

export default function Sales() {
  const { user } = useAuth();
  const orgId = localStorage.getItem("organizationId");
  const empId = localStorage.getItem("empId");
  
  // Use role from AuthContext for proper role-based access control
  const userRole = (user?.role || "").toLowerCase();
  const isEmployee = userRole === "employee";
  const isOwner = userRole === "owner";
  const isManager = userRole === "manager";
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [saleMode, setSaleMode] = useState<SaleMode>("single");
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
  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const submittingRef = useRef(false);
  const isBatchRef = useRef(false);


  const [batchCollectionForm, setBatchCollectionForm] = useState({
    totalCash: "",
    totalUPI: "",
    totalCard: "",
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () =>
      (await axios.get(`${API_BASE}/api/organizations/${orgId}/products`)).data || [],
  });

  const productsActive = useMemo(
    () => products.filter((p: any) => p.status === true),
    [products]
  );



  const { data: guns = [] } = useQuery({
    queryKey: ["guninfo", orgId],
    queryFn: async () =>
      (await axios.get(`${API_BASE}/api/organizations/${orgId}/guninfo`)).data || [],
  });

  // Fetch employee duties to filter guns for employees
  const { data: employeeDuties = [] } = useQuery({
    queryKey: ["employee-duties", orgId, empId],
    queryFn: async () => {
      if (!isEmployee) return [];
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/duties?empId=${empId}`);
      return res.data || [];
    },
    enabled: isEmployee,
  });

  // Filter guns based on employee duties (Point 9)
  const availableGunsForEmployee = useMemo(() => {
    if (!isEmployee) return guns;
    
    const assignedGunNames = employeeDuties
      .filter((d: any) => d.status === "active" || d.status === "assigned")
      .map((d: any) => d.gunName || d.guns);
    
    return guns.filter((g: any) => assignedGunNames.includes(g.guns));
  }, [isEmployee, guns, employeeDuties]);

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
    () => (!form.fuel ? [] : availableGunsForEmployee.filter((g: any) => g.productName === form.fuel)),
    [form.fuel, availableGunsForEmployee]
  );

  // Auto-fill opening stock and price
  useEffect(() => {
    let openingStock = "";
    let price = "";

    if (form.gun) {
      const gunObj = availableGunsForEmployee.find(
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
  }, [form.gun, form.fuel, availableGunsForEmployee, products, filteredGuns]);

  // Calculate sale liters and amount
  useEffect(() => {
    const open = Number(form.openingStock) || 0;
    const close = Number(form.closingStock) || 0;
    const testing = Number(form.testingTotal) || 0;
    const pricePerLiter = Number(form.price) || 0;
    
    // Validate closing stock doesn't exceed tank capacity in real-time
    if (close > 0 && form.fuel) {
      // Get tank capacity from products API based on selected fuel
      const selectedProduct = products.find((p: any) => p.productName === form.fuel);
      const tankCapacity = selectedProduct?.tankCapacity || Infinity;
      
      if (tankCapacity !== Infinity && close > tankCapacity) {
        setValidationError({
          title: "Tank Capacity Exceeded",
          message: `Closing stock (${close.toLocaleString()}L) cannot exceed the tank capacity of ${tankCapacity.toLocaleString()}L for ${form.fuel}. Please reduce the closing stock value to proceed.`
        });
        // Don't calculate sales if validation fails
        return;
      } else {
        // Clear validation error if closing stock is now valid
        setValidationError(null);
      }
    } else {
      // Clear validation error if fields are empty
      setValidationError(null);
    }
    
    const grossSale = close > open ? close - open : 0;
    const netSale = Math.max(0, grossSale - testing);
    const salesAmount = Math.round(netSale * pricePerLiter * 100) / 100;
    setForm((f) => ({
      ...f,
      saleLiters: netSale > 0 ? netSale.toFixed(3) : "",
      salesInRupees: salesAmount > 0 ? salesAmount.toFixed(2) : "",
    }));
  }, [form.closingStock, form.openingStock, form.price, form.testingTotal, form.fuel, products]);


  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<{ title: string; message: string } | null>(null);
  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      const url = `${API_BASE}/api/organizations/${orgId}/sales/${saleId}`;
      await axios.delete(url, {
        headers: {
          "X-Employee-Id": empId || "",
        },
      });
    },
    onSuccess: () => {
      setDeleteSaleId(null);
      queryClient.invalidateQueries({ queryKey: ["sales", orgId] });
      toast({ title: "Deleted", description: "Sale entry deleted.", variant: "success" });
    },
    onError: (error: any) => {
      console.error("❌ Delete Sale Error:", error);
      toast({
        title: "Delete Failed",
        description: error?.response?.data?.message || "Failed to delete sale entry.",
        variant: "destructive",
      });
    },
  });


  // Calculate short collections
  useEffect(() => {
    if (saleMode === "batch") {
      setForm((f) => ({ ...f, shortCollections: "" }));
      return;
    }
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
  }, [form.cashReceived, form.phonePay, form.creditCard, form.salesInRupees, saleMode]);

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
        salesInLiters: Number(input.saleLiters) || 0,
        salesInRupees: Number(input.salesInRupees) || 0,
        dateTime: now.toISOString(),
      };

      const collectionDTO = {
        organizationId: orgId,
        empId,
        productName: input.fuel,
        guns: input.gun,
        price: Number(input.price),
        dateTime: now.toISOString(),
        cashReceived: Number(input.cashReceived) || 0,
        phonePay: Number(input.phonePay) || 0,
        creditCard: Number(input.creditCard) || 0,
      };

      console.log("📤 Sending Sale DTO:", saleDTO);
      console.log("📤 Sending Collection DTO:", collectionDTO);

      try {
        const saleResponse = await axios.post(
          `${API_BASE}/api/organizations/${orgId}/sales`,
          saleDTO
        );
        console.log("✅ Sale created:", saleResponse.data);

        const collectionResponse = await axios.post(
          `${API_BASE}/api/organizations/${orgId}/collections`,
          collectionDTO
        );
        console.log("✅ Collection created:", collectionResponse.data);

        return { success: true };
      } catch (error: any) {
        console.error("❌ Sale/Collection Error:", error);

        let errorMessage = "Unable to process your sale request. Please check all fields and try again.";
        let errorTitle = "Sale Recording Failed";
        
        // Simple error handling with our own messages
        if (error.response?.status === 500) {
          errorTitle = "Server Error";
          errorMessage = "An error occurred while saving your sale. Please verify all information is correct and try again.";
        } else if (error.response?.status === 400) {
          errorTitle = "Invalid Data";
          errorMessage = "Please check that all required fields are filled correctly and try again.";
        } else if (error.response?.status === 404) {
          errorTitle = "Not Found";
          errorMessage = "Required resource not found. Please refresh the page and try again.";
        } else if (error.message === "Network Error") {
          errorTitle = "Network Error";
          errorMessage = "Cannot connect to the server. Please check your internet connection.";
        }

        throw new Error(`${errorTitle}|${errorMessage}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", orgId] });
      queryClient.invalidateQueries({ queryKey: ["collections", orgId] });
      queryClient.invalidateQueries({ queryKey: ["guninfo", orgId] });

      if (!isBatchRef.current) {
        setForm(initialFormState);
        toast({
          title: "✅ Success",
          description: "Sale & Collection recorded successfully!",
          variant: "default"
        });
      }
    },
    onError: (error: any) => {
      console.error("❌ Mutation Error:", error);
      
      // Parse enhanced error message
      let title = "Failed to Record Sale";
      let description = "Please check your input and try again.";
      
      if (error.message && error.message.includes("|")) {
        const [errorTitle, errorMessage] = error.message.split("|");
        title = errorTitle;
        description = errorMessage;
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        title,
        description,
        variant: "destructive"
      });
    },
  });

  function isFormValid(f: FormState, skipCollectionCheck: boolean = false) {
    const { fuel, price, gun, openingStock, closingStock, testingTotal, saleLiters, shortCollections } = f;

    if (!fuel || !gun || price === "") {
      setValidationError({
        title: "Missing Information",
        message: "Please select product and gun before proceeding."
      });
      return false;
    }

    if (openingStock === "" || closingStock === "") {
      setValidationError({
        title: "Missing Stock Information",
        message: "Please fill in the closing stock value."
      });
      return false;
    }

    const openNum = Number(openingStock), closeNum = Number(closingStock), testingNum = Number(testingTotal) || 0;

    if (isNaN(openNum) || isNaN(closeNum) || closeNum <= openNum) {
      setValidationError({
        title: "Invalid Closing Stock",
        message: "Closing stock must be greater than opening stock."
      });
      return false;
    }

    // Validate closing stock doesn't exceed tank capacity
    const selectedProduct = products.find((p: any) => p.productName === fuel);
    const tankCapacity = selectedProduct?.tankCapacity || Infinity;
    
    if (tankCapacity !== Infinity && closeNum > tankCapacity) {
      setValidationError({
        title: "Tank Capacity Exceeded",
        message: `Closing stock (${closeNum.toLocaleString()}L) cannot exceed the tank capacity of ${tankCapacity.toLocaleString()}L for ${fuel}. Please enter a valid closing stock value.`
      });
      return false;
    }

    const gross = closeNum - openNum;
    if (testingNum < 0 || testingNum > gross) {
      setValidationError({
        title: "Invalid Testing Value",
        message: "Testing liters must be between 0 and gross liters."
      });
      return false;
    }

    const net = gross - testingNum;
    
    // Point 8: Allow net sale 0 when testing data is entered (no business day)
    if (net === 0 && testingNum > 0) {
      // Valid case: testing only, no actual sales
      return skipCollectionCheck ? true : true;
    }
    
    if (net < 0) {
      setValidationError({
        title: "Invalid Net Sale",
        message: "Net sale liters cannot be negative."
      });
      return false;
    }

    if (skipCollectionCheck) return true;

    const short = Number(shortCollections) || 0;
    if (short > 10) {
      setValidationError({
        title: "Short Collection Too High",
        message: `Short collection is ₹${short.toFixed(2)}. Maximum allowed is ₹10.`
      });
      return false;
    }
    if (short < 0) {
      setValidationError({
        title: "Invalid Short Collection",
        message: "Short collection cannot be negative."
      });
      return false;
    }
    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!isFormValid(form, false)) return;
    if (saleMode === "batch") {
      toast({ title: "Batch mode is active", description: "Use Show Summary & Submit.", variant: "destructive" });
      return;
    }
    submittingRef.current = true;
    isBatchRef.current = false;

    try {
      await saleCollectionMutation.mutateAsync(form);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      submittingRef.current = false;
    }
  };

  const handleAddAnotherSale = () => {
    if (!isFormValid(form, true)) return;
    const key = entryKey(form);
    const existingKeys = new Set(saleEntries.map(entryKey));
    
    // Point 7: Check for duplicate gun in batch sales
    const isDuplicateGun = saleEntries.some((entry) => entry.gun === form.gun);
    
    if (isDuplicateGun) {
      toast({ 
        title: "Duplicate Gun Blocked", 
        description: `Gun "${form.gun}" has already been added to this batch. Same gun cannot be entered twice.`, 
        variant: "destructive" 
      });
      return;
    }
    
    if (existingKeys.has(key)) {
      toast({ title: "Duplicate sale blocked", description: "This entry already exists in the batch.", variant: "destructive" });
      return;
    }
    setSaleEntries((prev) => [...prev, { ...form, cashReceived: "", phonePay: "", creditCard: "", shortCollections: "" }]);
    setForm(initialFormState);
  };

  const handleShowBatchSummary = () => {
    if (form.fuel && isFormValid(form, true)) {
      const key = entryKey(form);
      const existingKeys = new Set(saleEntries.map(entryKey));
      
      // Point 7: Check for duplicate gun
      const isDuplicateGun = saleEntries.some((entry) => entry.gun === form.gun);
      
      if (isDuplicateGun) {
        toast({ 
          title: "Duplicate Gun Blocked", 
          description: `Gun "${form.gun}" has already been added to this batch. Same gun cannot be entered twice.`, 
          variant: "destructive" 
        });
        setShowSummaryPopup(true);
        return;
      }
      
      if (!existingKeys.has(key)) {
        setSaleEntries((prev) => [...prev, { ...form, cashReceived: "", phonePay: "", creditCard: "", shortCollections: "" }]);
      }
      setForm(initialFormState);
      setTimeout(() => setShowSummaryPopup(true), 50);
    } else {
      setShowSummaryPopup(true);
    }
  };

  const handleBatchSubmit = async () => {
    if (saleEntries.length === 0) return;

    const totalCash = Number(batchCollectionForm.totalCash) || 0;
    const totalUPI = Number(batchCollectionForm.totalUPI) || 0;
    const totalCard = Number(batchCollectionForm.totalCard) || 0;
    const totalReceived = totalCash + totalUPI + totalCard;
    const totalExpected = saleEntries.reduce((sum, e) => sum + Number(e.salesInRupees || 0), 0);
    const short = Math.max(0, totalExpected - totalReceived);

    if (short > 10) {
      toast({
        title: "Short collection too high!",
        description: `Total short is ₹${short.toFixed(2)}. Maximum allowed is ₹10.`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingBatch(true);
    isBatchRef.current = true;

    try {
      const entriesWithCollections = saleEntries.map((entry) => {
        const proportion = Number(entry.salesInRupees) / totalExpected;
        return {
          ...entry,
          cashReceived: (totalCash * proportion).toFixed(2),
          phonePay: (totalUPI * proportion).toFixed(2),
          creditCard: (totalCard * proportion).toFixed(2),
        };
      });

      for (const entry of entriesWithCollections) {
        await saleCollectionMutation.mutateAsync(entry);
      }

      setSaleEntries([]);
      setShowSummaryPopup(false);
      setBatchCollectionForm({ totalCash: "", totalUPI: "", totalCard: "" });
      toast({ title: `${saleEntries.length} sales recorded successfully!`, variant: "success" });
    } catch (e) {
      toast({ title: "Batch submit failed", variant: "destructive" });
    } finally {
      isBatchRef.current = false;
      setIsSubmittingBatch(false);
    }
  };

  function getBatchSummary(entries: FormState[]) {
    const productWise: Record<string, number> = {};
    let totalExpected = 0;
    entries.forEach((entry) => {
      productWise[entry.fuel] = (productWise[entry.fuel] || 0) + Number(entry.saleLiters || 0);
      totalExpected += Number(entry.salesInRupees || 0);
    });
    const totalCash = Number(batchCollectionForm.totalCash) || 0;
    const totalUPI = Number(batchCollectionForm.totalUPI) || 0;
    const totalCard = Number(batchCollectionForm.totalCard) || 0;
    const totalReceived = totalCash + totalUPI + totalCard;
    const short = Math.max(0, totalExpected - totalReceived);
    return { productWise, totalExpected, totalCash, totalUPI, totalCard, totalReceived, short };
  }

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
    const d = dayjs(iso).tz(tz);
    return d.isSameOrAfter(start) && d.isSameOrBefore(end);
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
    
    // Point 6: Calculate excess collections (only for owner)
    const excess = Math.max(0, received - expected);
    
    return { cash, upi, card, short, received, expected, excess };
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
  const renderBatchSummaryDialog = () => {
    const summary = getBatchSummary(saleEntries);
    return (
      <Dialog open={showSummaryPopup} onOpenChange={(open) => setShowSummaryPopup(open)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Sales Batch Summary - Enter Total Collections
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <List className="h-4 w-4" />
                Total Entries: {saleEntries.length}
              </h4>

              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-muted-foreground">Product-wise Sale (Net Liters)</h5>
                {Object.entries(summary.productWise).length === 0 && (
                  <p className="text-muted-foreground italic text-sm">No sales added yet.</p>
                )}
                {Object.entries(summary.productWise).map(([prod, liters]) => (
                  <div key={prod} className="flex justify-between px-4 py-2 rounded-lg bg-muted/50 border">
                    <span className="font-semibold flex items-center gap-2">
                      <Droplet className="h-4 w-4 text-primary" />
                      {prod}
                    </span>
                    <span className="font-mono">{String(liters)} Ltrs</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Total Expected Sale:</span>
                <span className="text-xl font-bold text-primary">{RUPEE}{summary.totalExpected.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <h4 className="font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Enter Total Collections Received
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    Total Cash
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={batchCollectionForm.totalCash}
                    onChange={(e) => setBatchCollectionForm(f => ({ ...f, totalCash: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-indigo-600" />
                    Total UPI
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={batchCollectionForm.totalUPI}
                    onChange={(e) => setBatchCollectionForm(f => ({ ...f, totalUPI: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    Total Card
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={batchCollectionForm.totalCard}
                    onChange={(e) => setBatchCollectionForm(f => ({ ...f, totalCard: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div className="flex justify-between p-3 rounded-lg bg-background">
                  <span className="text-sm font-medium">Total Received:</span>
                  <span className="font-bold">{RUPEE}{summary.totalReceived.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between p-3 rounded-lg ${summary.short > 10 ? 'bg-destructive/10 border border-destructive/20' : 'bg-background'}`}>
                  <span className="text-sm font-medium">Short Collection:</span>
                  <span className={`font-bold ${summary.short > 10 ? 'text-destructive' : ''}`}>
                    {RUPEE}{summary.short.toFixed(2)}
                  </span>
                </div>
              </div>

              {summary.short > 10 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Short collection exceeds ₹10 limit! Please verify your collections.</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 Collections will be <strong>automatically distributed proportionally</strong> across all products based on their sale amounts.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowSummaryPopup(false)}
              disabled={isSubmittingBatch}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
            <Button
              onClick={handleBatchSubmit}
              disabled={saleEntries.length === 0 || isSubmittingBatch || summary.short > 10}
              className="w-full sm:w-auto"
            >
              {isSubmittingBatch ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>Submit {saleEntries.length} Sales</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* CSS Animations */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {renderBatchSummaryDialog()}

      {/* DSR Dialog */}
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

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales & Collections</h1>
          <p className="text-muted-foreground">Record sales and track daily collections</p>
        </div>
        {/* Point 2: Hide DSR and Sales History buttons for employees */}
        {!isEmployee && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={openDsrDialog}><FileText className="mr-2 h-4 w-4" />Generate DSR</Button>
            <Button variant="secondary" onClick={() => navigate("/sales-history")}><List className="mr-2 h-4 w-4" />View Sales History</Button>
          </div>
        )}
      </div>

      {/* Point 1: Collections Overview - Hidden for employees */}
      {!isEmployee && (
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
            
            {/* Point 6: Excess Collections Card - Only visible to Owner */}
            {isOwner && collectionSummary.excess > 0 && (
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <Target className="h-8 w-8 opacity-90" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">Excess</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-1">Excess Collections</p>
                  <p className="text-3xl font-bold tracking-tight">{RUPEE}{collectionSummary.excess.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}
      {/* SALE MODE SWITCHER - ONLY 2 BUTTONS */}
      <div className="w-full flex flex-col sm:flex-row items-stretch gap-4 mb-6">
        <Button
          variant={saleMode === "single" ? "default" : "outline"}
          className={`flex-1 flex items-center justify-center gap-3 h-20 font-bold text-lg shadow-lg transition-all duration-300 ${saleMode === "single"
            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white scale-105"
            : "hover:scale-105"
            }`}
          onClick={() => {
            setSaleMode("single");
            setForm(initialFormState);
            setSaleEntries([]);
          }}
        >
          <Plus className="h-7 w-7" />
          <div className="flex flex-col items-start">
            <span>Single Sale</span>
            <span className="text-sm font-normal opacity-80">With Collections</span>
          </div>
        </Button>

        <Button
          variant={saleMode === "batch" ? "default" : "outline"}
          className={`flex-1 flex items-center justify-center gap-3 h-20 font-bold text-lg shadow-lg transition-all duration-300 ${saleMode === "batch"
            ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white scale-105"
            : "hover:scale-105"
            }`}
          onClick={() => {
            setSaleMode("batch");
            setForm(initialFormState);
            setSaleEntries([]);
          }}
        >
          <Layers className="h-7 w-7" />
          <div className="flex flex-col items-start">
            <span>Batch Sale</span>
            <span className="text-sm font-normal opacity-80">Multiple Products</span>
          </div>
        </Button>
      </div>

      {/* RECORD SALE FORM */}
      <Card className="w-full shadow-2xl rounded-2xl border-0 bg-gradient-to-br from-background via-muted/5 to-background overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-xl bg-primary/10 shadow-inner">
                {saleMode === "single" ? <Plus className="h-6 w-6 text-primary" /> : <Layers className="h-6 w-6 text-primary" />}
              </div>
              <span className="font-bold">
                {saleMode === "single" ? "Record Single Sale & Collection" : "Batch Sale Entry"}
              </span>
            </CardTitle>
            {saleMode === "batch" && saleEntries.length > 0 && (
              <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md px-3 py-1.5">
                <Fuel className="h-3.5 w-3.5 mr-1.5" />
                <span className="font-semibold">{saleEntries.length} {saleEntries.length === 1 ? 'Item' : 'Items'}</span>
              </Badge>
            )}
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit} autoComplete="off">
          <CardContent className="p-6">
            <div className="space-y-6">

              {/* Employee ID */}
              <div className="space-y-2">
                <Label htmlFor="empId" className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Employee ID
                </Label>
                <Input id="empId" name="empId" value={empId || ""} readOnly disabled className="bg-muted/50" />
              </div>

              {/* Product & Gun Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fuel-type" className="text-sm font-semibold flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-blue-600" />
                    Fuel Type *
                  </Label>
                  <Select value={form.fuel} onValueChange={(val) => setForm((f) => ({ ...f, fuel: val }))}>
                    <SelectTrigger id="fuel-type" className="w-full shadow-sm">
                      <SelectValue placeholder="Select Fuel" />
                    </SelectTrigger>
                    <SelectContent className='z-[10000]'>
                      {productsActive.map((p: any) => (
                        <SelectItem key={p.productName} value={p.productName}>{p.productName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gun" className="text-sm font-semibold flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-orange-600" />
                    Gun *
                  </Label>
                  <Select value={form.gun} onValueChange={(val) => setForm((f) => ({ ...f, gun: val }))}>
                    <SelectTrigger id="gun" className="w-full shadow-sm">
                      <SelectValue placeholder="Select Gun" />
                    </SelectTrigger>
                    <SelectContent className='z-[10000]'>
                      {filteredGuns.map((g: any) => (
                        <SelectItem key={g.guns} value={g.guns}>{g.guns} ({g.serialNumber})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stock Readings */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 border border-blue-200/50 dark:border-blue-800/50">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Target className="h-4 w-4" />
                  Stock Readings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openingStock" className="text-xs font-medium">Opening Stock (L)</Label>
                    <Input id="openingStock" name="openingStock" type="number" step="0.001" value={form.openingStock} readOnly disabled className="bg-white/70 dark:bg-slate-900/70" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closingStock" className="text-xs font-medium">Closing Stock (L) *</Label>
                    <Input id="closingStock" name="closingStock" type="number" step="0.001" value={form.closingStock} onChange={handleFormChange} min={Number(form.openingStock || 0) + 0.001} required className="font-semibold" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testingTotal" className="text-xs font-medium">Testing (L)</Label>
                    <Input id="testingTotal" name="testingTotal" type="number" min="0" step="0.01" value={form.testingTotal} placeholder="0.00" onChange={handleFormChange} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saleLiters" className="text-xs font-medium">Net Sale (L)</Label>
                    <Input id="saleLiters" name="saleLiters" type="number" step="0.001" value={form.saleLiters} readOnly disabled className="bg-green-50 dark:bg-green-950/30 font-bold text-green-700 dark:text-green-300" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                </div>
              </div>

              {/* Sales Calculation */}
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4 border border-emerald-200/50 dark:border-emerald-800/50">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                  <IndianRupee className="h-4 w-4" />
                  Sales Calculation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-xs font-medium">Price per Liter</Label>
                    <Input id="price" name="price" type="number" step="0.01" value={form.price} readOnly disabled className="bg-white/70 dark:bg-slate-900/70" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesInRupees" className="text-xs font-medium">Total Sale Amount</Label>
                    <Input id="salesInRupees" name="salesInRupees" type="number" step="0.01" value={form.salesInRupees} readOnly disabled className="bg-emerald-100 dark:bg-emerald-950/50 font-bold text-emerald-700 dark:text-emerald-300 text-lg" onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  </div>
                </div>
              </div>

              {/* Collection Details - Only for Single Mode */}
              {saleMode === "single" && (
                <>
                  <Separator className="my-4" />

                  <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-5 border border-purple-200/50 dark:border-purple-800/50 shadow-sm">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-purple-900 dark:text-purple-100">
                      <div className="p-1.5 rounded-lg bg-purple-500/10">
                        <Wallet className="h-4 w-4 text-purple-600" />
                      </div>
                      Collection Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cashReceived" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                          <Banknote className="h-3.5 w-3.5 text-green-600" />
                          Cash Received
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">₹</span>
                          <Input
                            id="cashReceived"
                            name="cashReceived"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.cashReceived}
                            onChange={handleFormChange}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            className="pl-7 font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phonePay" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                          <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
                          UPI Payment
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">₹</span>
                          <Input
                            id="phonePay"
                            name="phonePay"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.phonePay}
                            onChange={handleFormChange}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            className="pl-7 font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="creditCard" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                          <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                          Card Payment
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">₹</span>
                          <Input
                            id="creditCard"
                            name="creditCard"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.creditCard}
                            onChange={handleFormChange}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            className="pl-7 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-purple-200/50 dark:border-purple-800/50">
                      <Label htmlFor="shortCollections" className="text-xs font-semibold flex items-center gap-1.5 mb-2 text-foreground">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        Short Collection
                      </Label>
                      <Input
                        id="shortCollections"
                        name="shortCollections"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.shortCollections}
                        readOnly
                        disabled
                        className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold text-base border-amber-200 dark:border-amber-800"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      />
                      {Number(form.shortCollections) > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Short amount: ₹{Number(form.shortCollections).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Batch Mode Info */}
              {saleMode === "batch" && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 border border-blue-200 dark:border-blue-800 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                      <Fuel className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm text-blue-900 dark:text-blue-100">Batch Mode Active</p>
                        <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200">
                          {saleEntries.length} {saleEntries.length === 1 ? 'item' : 'items'}
                        </Badge>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        Add all your sales first, then enter collections once for all products at the end. Collections will be distributed proportionally.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </CardContent>

          {/* ACTION BUTTONS */}
          <div className="px-6 py-4 bg-muted/20 border-t border-border">
            <div className="flex flex-col sm:flex-row gap-3">
              {saleMode === "single" && (
                <Button
                  type="submit"
                  className="w-full h-12 font-semibold shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saleCollectionMutation.isPending || submittingRef.current || validationError !== null}
                >
                  {saleCollectionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : validationError ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Fix Validation Error
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Record Sale & Collection
                    </>
                  )}
                </Button>
              )}

              {saleMode === "batch" && (
                <>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 h-12 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleAddAnotherSale}
                    disabled={isSubmittingBatch || validationError !== null}
                  >
                    {validationError ? (
                      <>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Fix Validation Error
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Sale to Batch
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 h-12 font-semibold shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                    onClick={handleShowBatchSummary}
                    disabled={(saleEntries.length === 0 && !form.fuel) || isSubmittingBatch}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Show Summary & Submit ({saleEntries.length})
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* Point 1: TODAY'S SALES - Hidden for employees */}
      {!isEmployee && (
        <div className="w-full mt-10">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background via-muted/5 to-background">
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
                  <div key={sale._id || sale.id || `${sale.productName}-${sale.guns}-${index}`} className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/50">
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
                        {/* Point 3: Delete button only for latest sale and hidden for employees */}
                        {index === 0 && !isEmployee && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Sale"
                            onClick={() => setDeleteSaleId(sale._id || sale.id)}
                            className="bg-red-100 text-destructive mt-1 hover:bg-red-200"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        )}
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
                </div>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={handleNextPage} className="hover:bg-muted">
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>

          {/* Delete Dialog for latest sale */}
          {deleteSaleId && (
            <div
              className={
                "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
                (deleteSaleId ? 'opacity-100' : 'opacity-0 pointer-events-none')
              }
              style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
              onClick={() => setDeleteSaleId(null)}
            >
              <div
                className="bg-gradient-to-br from-white/95 via-slate-50/90 to-red-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-red-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-md my-auto animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  type="button" 
                  className="absolute top-4 right-4 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 p-2 transition-all backdrop-blur-sm" 
                  onClick={() => setDeleteSaleId(null)}
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="mb-6 flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 shadow-lg shadow-red-500/30">
                    <Trash2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-2xl text-foreground">Delete Sale Record</h2>
                    <p className="text-sm text-muted-foreground">This action is permanent</p>
                  </div>
                </div>
                
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200/50 dark:border-red-800/50">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete this sale record? 
                  </p>
                  <p className="text-sm font-bold text-destructive mt-2">
                    ⚠️ This action cannot be undone and will permanently remove the sale data.
                  </p>
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setDeleteSaleId(null)} 
                    className="h-11 px-6"
                    disabled={deleteSaleMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteSaleId && deleteSaleMutation.mutate(deleteSaleId)} 
                    disabled={deleteSaleMutation.isPending} 
                    className="h-11 px-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                  >
                    {deleteSaleMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Deleting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Sale</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
      )}

      {/* Validation Error Dialog */}
      {validationError && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => {
            setValidationError(null);
            setForm(initialFormState);
          }}
        >
          <div
            className="bg-gradient-to-br from-white/95 via-slate-50/90 to-amber-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-amber-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 relative w-full max-w-md my-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              className="absolute top-4 right-4 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-muted-foreground hover:text-amber-600 p-2 transition-all backdrop-blur-sm" 
              onClick={() => {
                setValidationError(null);
                setForm(initialFormState);
              }}
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="mb-6 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-2xl text-foreground">{validationError.title}</h2>
                <p className="text-sm text-muted-foreground">Validation Error</p>
              </div>
            </div>
            
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200/50 dark:border-amber-800/50">
              <p className="text-sm text-foreground">
                {validationError.message}
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  setValidationError(null);
                  setForm(initialFormState);
                }} 
                className="h-11 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                OK, Got It
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Point 4: Fuel-wise Sales Breakdown - Hidden for employees */}
      {!isEmployee && (
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
      )}
    </div>
  );
}
