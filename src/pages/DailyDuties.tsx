import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Fuel, Activity, CheckCircle, ChevronLeft, ChevronRight,
  Clock, Calendar, Target, Timer, Play, History
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const ITEMS_PER_PAGE = 6;

type Duty = {
  id: string;
  empId?: string;
  dutyDate?: string;      // "YYYY-MM-DD" or ISO
  productId?: string;
  products?: string[];
  gunIds?: string[];
  guns?: string[];
  shiftStart?: string;    // "HH:mm"
  shiftEnd?: string;      // "HH:mm"
  totalHours?: string;
  status?: "SCHEDULED" | "ACTIVE" | "COMPLETED";
};

type DutyTab = "SCHEDULED" | "ACTIVE" | "COMPLETED";

export default function DailyDuties() {
  const navigate = useNavigate();  // View History [memory:9]
  const orgId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";

  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<DutyTab>("SCHEDULED");
  const [page, setPage] = useState(0);

  // Helpers
  const normalizeDate = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };  // [memory:11]
  const parseLocalDate = (s?: string) => {
    if (!s) return undefined;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(s);
  };  // [memory:11]
  const isFutureDate = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = normalizeDate(new Date());
    const d = normalizeDate(parseLocalDate(dateStr)!);
    return d.getTime() > today.getTime();
  };  // [memory:10]
  const calculateHours = (start?: string, end?: string): string => {
    if (!start || !end) return "0.0";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let hours = eh - sh; let minutes = em - sm;
    if (minutes < 0) { minutes += 60; hours -= 1; }
    if (hours < 0) hours += 24;
    return (hours + minutes / 60).toFixed(1);
  };  // [memory:11]

  // Fetch all duties; show only today's
  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    axios.get(`${API_BASE}/api/organizations/${orgId}/employee-duties/employee/${empId}`)
      .then(res => setDuties(Array.isArray(res.data) ? res.data : []))
      .finally(() => setLoading(false));
  }, [orgId, empId]);  // [memory:10]

  // Today key
  const todayKey = useMemo(() => normalizeDate(new Date()).getTime(), []);  // [memory:11]

  // Build today-only list
  const todayList = useMemo(() => {
    return duties.filter(d => {
      const dt = parseLocalDate(d.dutyDate);
      if (!dt) return false;
      return normalizeDate(dt).getTime() === todayKey;
    });
  }, [duties, todayKey]);  // [memory:5]

  // Apply status filter
  const filtered = useMemo(() => {
    return selectedTab === "SCHEDULED"
      ? todayList.filter(d => d.status === "SCHEDULED" || !d.status)
      : todayList.filter(d => d.status === selectedTab);
  }, [todayList, selectedTab]);  // [memory:11]

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  useEffect(() => { setPage(0); }, [filtered.length, selectedTab]);  // [memory:8]

  // Actions
  const handleDailyDutyAction = async (dutyId: string, newStatus: Duty["status"]) => {
    try {
      if (newStatus === "ACTIVE") {
        const duty = duties.find(d => d.id === dutyId);
        if (duty && isFutureDate(duty.dutyDate)) {
          window.alert("Cannot start a duty scheduled for a future date.");
          return;
        }
      }
      await axios.put(`${API_BASE}/api/organizations/${orgId}/employee-duties/${dutyId}`, { status: newStatus });
      setDuties(ds => ds.map(d => d.id === dutyId ? { ...d, status: newStatus } : d));
    } catch (err) {
      console.error("Error updating duty:", err);
    }
  };  // [memory:10]

  // Stats across today’s duties
  const stats = useMemo(() => {
    const scheduled = todayList.filter(d => d.status === "SCHEDULED" || !d.status).length;
    const active = todayList.filter(d => d.status === "ACTIVE").length;
    const completed = todayList.filter(d => d.status === "COMPLETED").length;
    return { total: todayList.length, scheduled, active, completed };
  }, [todayList]);  // [memory:8]

  const statusBadgeClass = (status?: Duty["status"]) => {
    switch (status) {
      case "COMPLETED": return "bg-green-500/10 text-green-700 border-green-500/20";
      case "ACTIVE": return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      default: return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    }
  };  // [memory:6]

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Pump Duty</CardTitle>
              <p className="text-sm text-muted-foreground">Your scheduled, active, and completed duties for today</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/daily-duties-history")}>
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          </div>
        </CardHeader>
      </Card> 
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: "Today’s Duties", value: stats.total, Icon: Fuel, tint: "bg-blue-500/10", color: "text-blue-600" },
          { title: "Scheduled", value: stats.scheduled, Icon: Calendar, tint: "bg-yellow-500/10", color: "text-yellow-600" },
          { title: "Active", value: stats.active, Icon: Activity, tint: "bg-purple-500/10", color: "text-purple-600" },
          { title: "Completed", value: stats.completed, Icon: CheckCircle, tint: "bg-green-500/10", color: "text-green-600" },
        ].map(tile => (
          <Card key={tile.title} className="stat-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{tile.title}</p>
                  <p className="text-2xl font-bold text-foreground">{tile.value}</p>
                </div>
                <div className={`${tile.tint} p-3 rounded-lg`}>
                  <tile.Icon className={`h-6 w-6 ${tile.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>  {/* compact, consistent tiles */} 

      {/* Status Segmented Controls */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "SCHEDULED", label: "Scheduled", icon: Calendar, count: stats.scheduled },
          { key: "ACTIVE", label: "Active", icon: Activity, count: stats.active },
          { key: "COMPLETED", label: "Completed", icon: CheckCircle, count: stats.completed },
        ].map(s => {
          const Icon = s.icon as any;
          const active = selectedTab === (s.key as DutyTab);
          return (
            <Button
              key={s.key}
              variant={active ? "default" : "outline"}
              onClick={() => setSelectedTab(s.key as DutyTab)}
              size="sm"
              className={active ? "btn-gradient-primary" : ""}
            >
              <Icon className="h-4 w-4 mr-2" />
              {s.label}
              <Badge variant="secondary" className="ml-2">{s.count}</Badge>
            </Button>
          );
        })}
      </div>  {/* minimalist, modern segmented tabs */} 

      {/* List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              {selectedTab === "SCHEDULED" ? <Calendar className="h-5 w-5" /> : selectedTab === "ACTIVE" ? <Activity className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
            </div>
            {selectedTab === "SCHEDULED" ? "Scheduled" : selectedTab === "ACTIVE" ? "Active" : "Completed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}
          {!loading && paginated.length === 0 && (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Fuel className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
              <p className="text-muted-foreground">No duties for today in this tab.</p>
            </div>
          )}
          {!loading && paginated.map((duty) => {
            const productDisplay = duty.productId || (Array.isArray(duty.products) ? duty.products.join(", ") : "—");
            const gunsCount = Array.isArray(duty.gunIds) ? duty.gunIds.length : Array.isArray(duty.guns) ? duty.guns.length : 0;
            const startDisabled = isFutureDate(duty.dutyDate);
            return (
              <div key={duty.id} className="p-5 rounded-xl border border-border/50 hover:border-blue-500/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Fuel className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">Pump Duty</h4>
                      <Badge className={statusBadgeClass(duty.status)}>{duty.status || "SCHEDULED"}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-600" /><span className="text-muted-foreground">Date:</span><span className="font-medium">{duty.dutyDate || "—"}</span></div>
                      <div className="flex items-center gap-2"><Target className="h-4 w-4 text-purple-600" /><span className="text-muted-foreground">Product:</span><span className="font-medium">{productDisplay}</span></div>
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange-600" /><span className="text-muted-foreground">Shift:</span><span className="font-medium">{(duty.shiftStart || "—")} - {(duty.shiftEnd || "—")}</span></div>
                      <div className="flex items-center gap-2"><Timer className="h-4 w-4 text-green-600" /><span className="text-muted-foreground">Hours:</span><span className="font-medium">{duty.totalHours || calculateHours(duty.shiftStart, duty.shiftEnd)}h</span></div>
                      {gunsCount > 0 && (<div className="flex items-center gap-2 col-span-2"><Fuel className="h-4 w-4 text-red-600" /><span className="text-muted-foreground">Guns:</span><span className="font-medium">{gunsCount} assigned</span></div>)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {duty.status === "SCHEDULED" && (
                      <Button
                        size="sm"
                        disabled={startDisabled}
                        title={startDisabled ? "Cannot start a duty scheduled for a future date" : undefined}
                        className={`shadow-md transition-all duration-300 ${startDisabled ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg"}`}
                        onClick={() => handleDailyDutyAction(duty.id, "ACTIVE")}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start Duty
                      </Button>
                    )}
                    {duty.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
                        onClick={() => handleDailyDutyAction(duty.id, "COMPLETED")}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                    {duty.status === "COMPLETED" && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm font-medium">Page <span className="text-primary">{page + 1}</span> of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
