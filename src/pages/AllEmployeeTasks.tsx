import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  CheckCircle,
  Timer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Search as SearchIcon,
  Fuel,
  Target,
  Activity,
  User,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";

type DateFilterKey = "all" | "today" | "week" | "month" | "custom";

type Task = {
  id: string;
  taskTitle: string;
  description?: string;
  shift?: string;
  dueDate?: string;
  priority?: string;
  status: "pending" | "in-progress" | "completed";
  assignedToEmpId?: string;
  assignedToName?: string;
};

type Duty = {
  id: string;
  empId?: string;
  dutyDate?: string;
  productId?: string;
  products?: string[];
  gunIds?: string[];
  guns?: string[];
  shiftStart?: string;
  shiftEnd?: string;
  totalHours?: string;
  status?: "SCHEDULED" | "ACTIVE" | "COMPLETED";
};

export default function EmployeeDutiesSplit() {
  const orgId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);

  // Shared helpers (pure)
  const normalizeDate = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return "0.0";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let hours = eh - sh;
    let minutes = em - sm;
    if (minutes < 0) {
      minutes += 60;
      hours -= 1;
    }
    if (hours < 0) hours += 24;
    return (hours + minutes / 60).toFixed(1);
  };

  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=pending`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=in-progress`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=completed`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/employee-duties/employee/${empId}`),
    ])
      .then(([p, ip, c, dd]) => {
        const P = Array.isArray(p.data) ? p.data.map((t: any) => ({ ...t, status: "pending" })) : [];
        const IP = Array.isArray(ip.data) ? ip.data.map((t: any) => ({ ...t, status: "in-progress" })) : [];
        const C = Array.isArray(c.data) ? c.data.map((t: any) => ({ ...t, status: "completed" })) : [];
        setTasks([...P, ...IP, ...C]);
        setDuties(Array.isArray(dd.data) ? dd.data : []);
      })
      .finally(() => setLoading(false));
  }, [orgId, empId]);

  return (
    <div className="space-y-10">
      <SpecialSection
        title="Special Tasks"
        tasks={tasks}
        normalizeDate={normalizeDate}
        calculateHours={calculateHours}
        loading={loading}
      />
      <DailySection
        title="Daily Duties"
        duties={duties}
        normalizeDate={normalizeDate}
        calculateHours={calculateHours}
        loading={loading}
      />
    </div>
  );
}

/* ================= Special Tasks Section ================= */

function SpecialSection({
  title,
  tasks,
  normalizeDate,
  calculateHours,
  loading,
}: {
  title: string;
  tasks: Task[];
  normalizeDate: (d: Date) => Date;
  calculateHours: (s?: string, e?: string) => string;
  loading: boolean;
}) {
  const [selectedTab, setSelectedTab] = useState<"pending" | "in-progress" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = normalizeDate(new Date());
    const due = normalizeDate(new Date(dueDate));
    return due.getTime() < today.getTime();
  };

  const isInDateRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = normalizeDate(new Date(dateStr));
    const now = new Date();
    switch (dateFilter) {
      case "all":
        return true;
      case "today":
        return d.getTime() === normalizeDate(now).getTime();
      case "week": {
        const weekStart = normalizeDate(new Date(now));
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return d >= weekStart && d <= weekEnd;
      }
      case "month":
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case "custom": {
        if (!customStartDate || !customEndDate) return true;
        const start = normalizeDate(new Date(customStartDate));
        const end = normalizeDate(new Date(customEndDate));
        return d >= start && d <= end;
      }
      default:
        return true;
    }
  };

  const stats = useMemo(() => {
    let pending = 0,
      inProgress = 0,
      completed = 0,
      overdue = 0;
    for (const t of tasks) {
      if (t.status === "pending") pending++;
      if (t.status === "in-progress") inProgress++;
      if (t.status === "completed") completed++;
      if (t.status !== "completed" && t.dueDate && isOverdue(t.dueDate)) overdue++;
    }
    return { pending, inProgress, completed, overdue, total: tasks.length };
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => t.status === selectedTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => {
        const composite = [
          t.taskTitle,
          t.description,
          t.assignedToName,
          t.assignedToEmpId,
          t.shift,
          t.priority,
          t.dueDate,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return composite.includes(q);
      });
    }
    list = list.filter((t) => isInDateRange(t.dueDate));
    return list;
  }, [tasks, selectedTab, searchQuery, dateFilter, customStartDate, customEndDate]);

  useEffect(() => setPage(0), [selectedTab, searchQuery, dateFilter, customStartDate, customEndDate, pageSize, filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "pending", label: "Pending", icon: Timer, count: stats.pending },
            { key: "in-progress", label: "In Progress", icon: FileText, count: stats.inProgress },
            { key: "completed", label: "Completed", icon: CheckCircle, count: stats.completed },
          ].map((s) => {
            const active = selectedTab === (s.key as any);
            const Icon = s.icon as any;
            return (
              <Button
                key={s.key}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTab(s.key as any)}
                className={active ? "btn-gradient-primary" : ""}
              >
                <Icon className="h-4 w-4 mr-2" />
                {s.label}
                <Badge variant="secondary" className="ml-2">
                  {s.count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      <Card className="card-gradient">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search special tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Show:</Label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Filter by Date</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "week", label: "This Week" },
                { key: "month", label: "This Month" },
                { key: "custom", label: "Custom Range" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={dateFilter === (f.key as DateFilterKey) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter(f.key as DateFilterKey)}
                  className={dateFilter === f.key ? "btn-gradient-primary" : ""}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {dateFilter === "custom" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>List</CardTitle>
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
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
              <p className="text-muted-foreground">No tasks match your current filters.</p>
            </div>
          )}

          {!loading &&
            paginated.map((task) => (
              <div
                key={task.id}
                className="p-5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        {task.taskTitle}
                      </h4>
                      {String(task.priority).toLowerCase() === "high" && (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          High Priority
                        </Badge>
                      )}
                      {isOverdue(task.dueDate) && task.status !== "completed" && (
                        <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-sm pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-accent/10">
                          <Clock className="h-3.5 w-3.5 text-accent" />
                        </div>
                        <span className="text-muted-foreground">Shift:</span>
                        <span className="font-medium text-foreground">{task.shift || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${isOverdue(task.dueDate) ? "bg-red-500/10" : "bg-green-500/10"}`}>
                          <Calendar
                            className={`h-3.5 w-3.5 ${
                              isOverdue(task.dueDate) ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                            }`}
                          />
                        </div>
                        <span className="text-muted-foreground">Due:</span>
                        <span className={`font-medium ${isOverdue(task.dueDate) ? "text-destructive" : "text-foreground"}`}>
                          {task.dueDate || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Badge className="bg-muted text-foreground border-border">
                      {String(task.status || "").replace("-", " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm font-medium">
                Page <span className="text-primary">{page + 1}</span> of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= Daily Duties Section ================= */

function DailySection({
  title,
  duties,
  normalizeDate,
  calculateHours,
  loading,
}: {
  title: string;
  duties: Duty[];
  normalizeDate: (d: Date) => Date;
  calculateHours: (s?: string, e?: string) => string;
  loading: boolean;
}) {
  const [selectedTab, setSelectedTab] = useState<"SCHEDULED" | "ACTIVE" | "COMPLETED">("SCHEDULED");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const isInDateRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = normalizeDate(new Date(dateStr));
    const now = new Date();
    switch (dateFilter) {
      case "all":
        return true;
      case "today":
        return d.getTime() === normalizeDate(now).getTime();
      case "week": {
        const weekStart = normalizeDate(new Date(now));
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return d >= weekStart && d <= weekEnd;
      }
      case "month":
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case "custom": {
        if (!customStartDate || !customEndDate) return true;
        const start = normalizeDate(new Date(customStartDate));
        const end = normalizeDate(new Date(customEndDate));
        return d >= start && d <= end;
      }
      default:
        return true;
    }
  };

  const stats = useMemo(() => {
    const scheduled = duties.filter((d) => d.status === "SCHEDULED" || !d.status).length;
    const active = duties.filter((d) => d.status === "ACTIVE").length;
    const completed = duties.filter((d) => d.status === "COMPLETED").length;
    return { scheduled, active, completed, total: duties.length };
  }, [duties]);

  const filtered = useMemo(() => {
    let list =
      selectedTab === "SCHEDULED" ? duties.filter((d) => d.status === "SCHEDULED" || !d.status) : duties.filter((d) => d.status === selectedTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => {
        const productsText = Array.isArray(d.products) ? d.products.join(" ").toLowerCase() : "";
        const gunsText = Array.isArray(d.guns) ? d.guns.join(" ").toLowerCase() : "";
        return (
          String(d.productId || "").toLowerCase().includes(q) ||
          productsText.includes(q) ||
          String(d.empId || "").toLowerCase().includes(q) ||
          String(d.dutyDate || "").toLowerCase().includes(q) ||
          gunsText.includes(q) ||
          String(d.status || "").toLowerCase().includes(q) ||
          String(d.shiftStart || "").toLowerCase().includes(q) ||
          String(d.shiftEnd || "").toLowerCase().includes(q)
        );
      });
    }

    list = list.filter((d) => isInDateRange(d.dutyDate));
    return list;
  }, [duties, selectedTab, searchQuery, dateFilter, customStartDate, customEndDate]);

  useEffect(() => setPage(0), [selectedTab, searchQuery, dateFilter, customStartDate, customEndDate, pageSize, filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const statusBadgeClass = (status?: Duty["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "ACTIVE":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "SCHEDULED", label: "Scheduled", icon: Calendar, count: stats.scheduled },
            { key: "ACTIVE", label: "Active", icon: Activity, count: stats.active },
            { key: "COMPLETED", label: "Completed", icon: CheckCircle, count: stats.completed },
          ].map((s) => {
            const active = selectedTab === (s.key as any);
            const Icon = s.icon as any;
            return (
              <Button
                key={s.key}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTab(s.key as any)}
                className={active ? "btn-gradient-primary" : ""}
              >
                <Icon className="h-4 w-4 mr-2" />
                {s.label}
                <Badge variant="secondary" className="ml-2">
                  {s.count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      <Card className="card-gradient">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search daily duties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Show:</Label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Filter by Date</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "week", label: "This Week" },
                { key: "month", label: "This Month" },
                { key: "custom", label: "Custom Range" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={dateFilter === (f.key as DateFilterKey) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter(f.key as DateFilterKey)}
                  className={dateFilter === f.key ? "btn-gradient-primary" : ""}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {dateFilter === "custom" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>List</CardTitle>
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
              <p className="text-muted-foreground">No duties match your current filters.</p>
            </div>
          )}

          {!loading &&
            paginated.map((duty) => {
              const productDisplay = duty.productId || (Array.isArray(duty.products) ? duty.products.join(", ") : "—");
              const gunsCount = Array.isArray(duty.gunIds)
                ? duty.gunIds.length
                : Array.isArray(duty.guns)
                ? duty.guns.length
                : 0;

              return (
                <div
                  key={duty.id}
                  className="p-5 rounded-xl border border-border/50 hover:border-blue-500/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Fuel className="h-5 w-5 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                          Pump Duty
                        </h4>
                        <Badge className={statusBadgeClass(duty.status)}>{duty.status || "SCHEDULED"}</Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">{duty.dutyDate || "—"}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-purple-600" />
                          <span className="text-muted-foreground">Product:</span>
                          <span className="font-medium">{productDisplay}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="text-muted-foreground">Shift:</span>
                          <span className="font-medium">
                            {(duty.shiftStart || "—")} - {(duty.shiftEnd || "—")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-green-600" />
                          <span className="text-muted-foreground">Hours:</span>
                          <span className="font-medium">
                            {duty.totalHours || calculateHours(duty.shiftStart, duty.shiftEnd)}h
                          </span>
                        </div>

                        {gunsCount > 0 && (
                          <div className="flex items-center gap-2 col-span-2">
                            <Fuel className="h-4 w-4 text-red-600" />
                            <span className="text-muted-foreground">Guns:</span>
                            <span className="font-medium">{gunsCount} assigned</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm font-medium">
                Page <span className="text-primary">{page + 1}</span> of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
