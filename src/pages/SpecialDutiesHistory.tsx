import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  Search as SearchIcon,
  Calendar,
  Clock,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const DEFAULT_PAGE_SIZE = 10;

type SpecialTask = {
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

type DateFilterKey = "all" | "today" | "week" | "month" | "custom";

export default function SpecialDutiesHistory() {
  const orgId = localStorage.getItem("organizationId") || "";
  const empId = localStorage.getItem("empId") || "";

  const navigate = useNavigate();

  const [tasks, setTasks] = useState<SpecialTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0);

  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Fetch completed tasks
  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=completed`)
      .then((res) => setTasks(Array.isArray(res.data) ? res.data : []))
      .finally(() => setLoading(false));
  }, [orgId, empId]);

  // Date helpers
  const normalizeDate = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const inRange = (dateStr?: string) => {
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

  // Search + date filter + sort
  const filteredSorted = useMemo(() => {
    const bySearch = !searchQuery.trim()
      ? tasks
      : tasks.filter((t) => {
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
          return composite.includes(searchQuery.toLowerCase());
        });

    const byDate = bySearch.filter((t) => inRange(t.dueDate));

    const toTime = (d?: string) => {
      if (!d) return 0;
      const n = new Date(d);
      return isNaN(n.getTime()) ? 0 : n.getTime();
    };

    return [...byDate].sort((a, b) => toTime(b.dueDate) - toTime(a.dueDate));
  }, [tasks, searchQuery, dateFilter, customStartDate, customEndDate]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const paginated = filteredSorted.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, pageSize, dateFilter, customStartDate, customEndDate, filteredSorted.length]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="card-gradient">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Special Duties History</CardTitle>
              <p className="text-sm text-muted-foreground">Review completed special tasks and their details</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/special-duties")}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Go back to Special Duties
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent />
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Matching Search</p>
                <p className="text-2xl font-bold">{filteredSorted.length}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pages</p>
                <p className="text-2xl font-bold">{totalPages}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <ChevronRight className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Controls</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Row 1: Search + page size */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-[260px]">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search completed tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search completed tasks"
              />
            </div>

            <div className="flex items-center gap-3 lg:ml-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
                aria-label="Items per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date Filter */}
          <div className="space-y-3 pt-2 border-t border-border/50">
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

      {/* List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5" />
            </div>
            Completed Tasks
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
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Completed Tasks</h3>
              <p className="text-muted-foreground">Try adjusting your search or date filters.</p>
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
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                      {task.priority && (
                        <Badge variant="outline" className="border-muted-foreground/20">
                          {String(task.priority).toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-sm pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground">Due:</span>
                        <span className="font-medium">{task.dueDate || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-muted-foreground">Shift:</span>
                        <span className="font-medium">{task.shift || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

          {/* Pagination */}
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
