import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Clock, List, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const RUPEE = '\u20B9';

const now = dayjs();

const rangeForPreset = (preset: string) => {
  const today = now.startOf('day');
  switch (preset) {
    case "today":
      return [today, today.endOf('day')];
    case "week":
      return [today.startOf('week'), today.endOf('week')];
    case "month":
      return [today.startOf('month'), today.endOf('month')];
    default:
      return [today, today];
  }
};

export default function SalesHistory() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const [preset, setPreset] = useState<"today" | "week" | "month" | "custom">("today");
  const [[from, to], setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => rangeForPreset("today") as [dayjs.Dayjs, dayjs.Dayjs]);
  const navigate = useNavigate();

  useEffect(() => {
    if (preset !== "custom") {
      setDateRange(() => rangeForPreset(preset) as [dayjs.Dayjs, dayjs.Dayjs]);
    }
  }, [preset]);

  const { data: records = [], isFetching, refetch } = useQuery({
    queryKey: ["sale-history", orgId, from, to],
    queryFn: async () => {
      const params = `from=${from.toISOString()}&to=${to.toISOString()}`;
      const url = `${API_BASE}/api/organizations/${orgId}/sale-history/by-date?${params}`;
      const res = await axios.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchOnWindowFocus: false
  });

  const summary = useMemo(() => {
    let totalSales = 0, cash = 0, upi = 0, card = 0, short = 0;
    records.forEach((r: any) => {
      totalSales += r.salesInRupees || 0;
      cash += r.cashReceived || 0;
      upi += r.phonePay || 0;
      card += r.creditCard || 0;
      short += r.shortCollections || 0;
    });
    return { totalSales, cash, upi, card, short };
  }, [records]);

  const handleCustomChange = (which: "from" | "to", value: string) => {
    setPreset("custom");
    setDateRange(([oldFrom, oldTo]) => [
      which === "from" ? dayjs(value) : oldFrom,
      which === "to" ? dayjs(value) : oldTo
    ]);
  };

  // Use useNavigate() directly
  const handleNavigateToSales = () => {
    navigate("/sales");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8">
      {/* Nav Bar */}
      <div className="flex items-center justify-between py-4">
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleNavigateToSales} className="font-semibold tracking-wider">
            <RotateCw className="mr-2 h-4 w-4" /> Go to Sales Entry
          </Button>
          <Button variant="secondary" className="font-semibold tracking-wider" disabled>
            <List className="mr-2 h-4 w-4" /> View Sale History
          </Button>
        </div>
        <div className="flex gap-2">
          {["today", "week", "month"].map(p => (
            <Button
              key={p}
              variant={preset === p ? "default" : "outline"}
              onClick={() => setPreset(p as any)}
              className="capitalize">
              {p === "today" && <Clock className="mr-2 h-4 w-4" />}
              {p === "week" && <CalendarIcon className="mr-2 h-4 w-4" />}
              {p === "month" && <CalendarIcon className="mr-2 h-4 w-4" />}
              {p}
            </Button>
          ))}
          <Button
            variant={preset === "custom" ? "default" : "outline"}
            onClick={() => setPreset("custom")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" /> Custom
          </Button>
        </div>
      </div>
      {preset === "custom" && (
        <div className="flex gap-3 mb-4">
          <div>
            <Label>From</Label>
            <Input type="date" value={from.format("YYYY-MM-DD")} onChange={e => handleCustomChange("from", e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to.format("YYYY-MM-DD")} onChange={e => handleCustomChange("to", e.target.value)} />
          </div>
          <Button onClick={() => refetch()} className="mt-5">Apply</Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground font-semibold">Total Sales</p>
            <h3 className="text-2xl font-bold text-primary">{RUPEE}{summary.totalSales.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground font-semibold">Cash</p>
            <h3 className="text-2xl font-bold text-green-700">{RUPEE}{summary.cash.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground font-semibold">UPI</p>
            <h3 className="text-2xl font-bold text-indigo-700">{RUPEE}{summary.upi.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground font-semibold">Card</p>
            <h3 className="text-2xl font-bold text-blue-700">{RUPEE}{summary.card.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>
      {/* Short Collection card */}
      <div className="mt-2">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground font-semibold">Short Collections</p>
            <h3 className="text-2xl font-bold text-yellow-700">{RUPEE}{summary.short.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Records Table/List */}
      <Card>
        <CardHeader>
          <CardTitle>Sale History: {from.format('DD MMM YYYY')} to {to.format('DD MMM YYYY')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isFetching ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No records found.</div>
          ) : (
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left">Date/Time</th>
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-left">Gun</th>
                  <th className="p-2 text-left">Liters</th>
                  <th className="p-2 text-left">Operator</th>
                  <th className="p-2 text-left">Total (₹)</th>
                  <th className="p-2 text-left">Cash</th>
                  <th className="p-2 text-left">UPI</th>
                  <th className="p-2 text-left">Card</th>
                  <th className="p-2 text-left">Short</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id}>
                    <td className="p-2">{dayjs(r.dateTime).format("DD MMM, HH:mm")}</td>
                    <td className="p-2">{r.productName}</td>
                    <td className="p-2">{r.guns}</td>
                    <td className="p-2">{r.salesInLiters}</td>
                    <td className="p-2">{r.empId}</td>
                    <td className="p-2 font-bold text-primary">{RUPEE}{r.salesInRupees?.toLocaleString()}</td>
                    <td className="p-2 text-green-800">{RUPEE}{r.cashReceived}</td>
                    <td className="p-2 text-indigo-800">{RUPEE}{r.phonePay}</td>
                    <td className="p-2 text-blue-800">{RUPEE}{r.creditCard}</td>
                    <td className="p-2 text-yellow-700">{RUPEE}{r.shortCollections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
