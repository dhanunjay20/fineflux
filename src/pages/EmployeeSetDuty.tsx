import { useMemo, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";
import { Plus, Mail, Phone, Filter, Clock, Search, Eye, Users, UserCheck, Briefcase, ClipboardList, Star, Calendar, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";

type Employee = {
  empId: string;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber?: string;
  role: string;
  status?: string;
  department?: string;
  profileImageUrl?: string;
  shiftTiming?: { start?: string; end?: string };
};

type TaskCreate = {
  organizationId: string;
  taskTitle: string;
  description: string;
  priority: string;
  shift: string;
  assignedToEmpId: string;
  dueDate: string;
};

type DailyDutyCreate = {
  organizationId: string;
  empId: string;
  productName: string;
  guns: string;
  dutyDate: string;
  shiftStart: string;
  shiftEnd: string;
};

function formatTime(time?: string) {
  return time || "";
}

export default function EmployeeSetDuty() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const orgId = typeof window !== "undefined" ? localStorage.getItem("organizationId") || "" : "";

  if (!orgId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading organization context…
      </div>
    );
  }

  const [search, setSearch] = useState("");

  const { data: employeesRaw = [], isLoading } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/employees`);
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.content)) return res.data.content;
      return [];
    },
    enabled: !!orgId,
  });

  const { data: productsRaw = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  const { data: gunsRaw = [] } = useQuery({
    queryKey: ["guns", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/guninfo`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  const employees = Array.isArray(employeesRaw)
    ? employeesRaw.filter((e: any) => (e.status ?? "").toLowerCase() === "active")
    : [];

  const products = Array.isArray(productsRaw) ? productsRaw : [];
  const guns = Array.isArray(gunsRaw) ? gunsRaw : [];

  const stats = useMemo(() => ([
    {
      title: 'Total Employees',
      value: employees.length.toString(),
      change: 'Available for duty',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Active',
      value: employees.filter((e: Employee) => (e.status || '').toLowerCase() === 'active').length.toString(),
      change: 'Ready to assign',
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Departments',
      value: new Set(employees.map((e: Employee) => e.department)).size.toString(),
      change: 'Active departments',
      icon: Briefcase,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      title: 'Total Tasks',
      value: '0',
      change: 'Duties assigned',
      icon: ClipboardList,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
  ]), [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e: Employee) => {
      const fullName = `${e.firstName} ${e.lastName}`.trim();
      const composite = [fullName, e.empId, e.role, e.emailId, e.phoneNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return composite.includes(q);
    });
  }, [employees, search]);

  const [specialDutyOpen, setSpecialDutyOpen] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  const [specialDutyForm, setSpecialDutyForm] = useState<TaskCreate>({
    organizationId: orgId,
    taskTitle: "",
    description: "",
    priority: "medium",
    shift: "",
    assignedToEmpId: "",
    dueDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
  });

  const [dailyDutyOpen, setDailyDutyOpen] = useState(false);
  const [dailyDutyForm, setDailyDutyForm] = useState<DailyDutyCreate>({
    organizationId: orgId,
    empId: "",
    productName: "",
    guns: "",
    dutyDate: dayjs().format("YYYY-MM-DD"),
    shiftStart: "",
    shiftEnd: "",
  });

  const [submitting, setSubmitting] = useState(false);

  function openSpecialDutyDialog(emp: Employee) {
    setCurrentEmp(emp);
    setSpecialDutyForm({
      organizationId: orgId,
      assignedToEmpId: emp.empId,
      taskTitle: "",
      description: "",
      priority: "medium",
      shift: "",
      dueDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    });
    setSpecialDutyOpen(true);
  }

  function openDailyDutyDialog(emp: Employee) {
    setCurrentEmp(emp);
    setDailyDutyForm({
      organizationId: orgId,
      empId: emp.empId,
      productName: "",
      guns: "",
      dutyDate: dayjs().format("YYYY-MM-DD"),
      shiftStart: emp.shiftTiming?.start || "",
      shiftEnd: emp.shiftTiming?.end || "",
    });
    setDailyDutyOpen(true);
  }

  async function assignSpecialDuty(e: React.FormEvent) {
    e.preventDefault();
    if (!specialDutyForm.taskTitle || !specialDutyForm.assignedToEmpId || !specialDutyForm.priority) {
      toast({
        title: "Validation",
        description: "Title, priority, and assignee required.",
        variant: "destructive"
      });
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(`${API_BASE}/api/organizations/${orgId}/tasks`, specialDutyForm);
      toast({ title: "Special Duty Assigned", description: specialDutyForm.taskTitle });
      setSpecialDutyOpen(false);
    } catch (err: any) {
      toast({
        title: "Assignment Failed",
        description: err?.response?.data?.message || "Could not assign special duty.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function assignDailyDuty(e: React.FormEvent) {
    e.preventDefault();
    if (!dailyDutyForm.empId || !dailyDutyForm.productName || !dailyDutyForm.guns) {
      toast({
        title: "Validation",
        description: "Employee, product, and gun are required.",
        variant: "destructive"
      });
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(`${API_BASE}/api/organizations/${orgId}/duty-assignments`, dailyDutyForm);
      toast({ title: "Daily Duty Assigned", description: `Pump duty assigned to ${currentEmp?.firstName}` });
      setDailyDutyOpen(false);
    } catch (err: any) {
      toast({
        title: "Assignment Failed",
        description: err?.response?.data?.message || "Could not assign daily duty.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  }

  const getUserInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const filteredGuns = guns.filter((gun: any) => gun.productName === dailyDutyForm.productName);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Set Employee Duty</h1>
          <p className="text-muted-foreground">
            Assign special tasks or daily pump duties to team members
          </p>
        </div>
        <Button className="btn-gradient-primary" onClick={() => navigate('/all-employee-tasks')}>
          <Eye className="mr-2 h-4 w-4" />
          View All Duties
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                    <div>
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

      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Active Employees ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-muted-foreground">Loading employees…</div>}
          {!isLoading && (
            <div className="space-y-4">
              {filtered.map((emp: Employee) => {
                const fullName = `${emp.firstName} ${emp.lastName}`;
                const start = formatTime(emp.shiftTiming?.start);
                const end = formatTime(emp.shiftTiming?.end);
                return (
                  <div
                    key={emp.empId}
                    className="grid gap-3 sm:grid-cols-[1fr_auto] items-start sm:items-center p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="h-12 w-12 shrink-0">
                        {emp.profileImageUrl ? (
                          <AvatarImage src={emp.profileImageUrl} alt={fullName} />
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                            {getUserInitials(fullName)}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
                          <Badge className="shrink-0">{emp.role}</Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{emp.emailId}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{emp.phoneNumber || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Shift: {start && end ? `${start} — ${end}` : "—"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => openSpecialDutyDialog(emp)}
                      >
                        <Star className="mr-1 h-4 w-4" />
                        Special Duty
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full sm:w-auto"
                        onClick={() => openDailyDutyDialog(emp)}
                      >
                        <Calendar className="mr-1 h-4 w-4" />
                        Daily Duty
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No employees match the current filter.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Special Duty Dialog */}
      {specialDutyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto"
          onClick={() => setSpecialDutyOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl mx-auto w-full max-w-lg max-h-[90vh] my-8 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSpecialDutyOpen(false)}
              className="absolute top-4 right-4 z-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <form className="flex flex-col gap-5 p-8 pt-6 overflow-y-auto" onSubmit={assignSpecialDuty}>
              <div className="flex items-center gap-3 mb-2">
                {currentEmp && (
                  <Avatar className="h-10 w-10">
                    {currentEmp.profileImageUrl ? (
                      <AvatarImage src={currentEmp.profileImageUrl} alt={`${currentEmp.firstName} ${currentEmp.lastName}`} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials(`${currentEmp.firstName} ${currentEmp.lastName}`)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                <h2 className="text-2xl font-bold">Special Duty for {currentEmp?.firstName} {currentEmp?.lastName}</h2>
              </div>

              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input
                  required
                  value={specialDutyForm.taskTitle}
                  onChange={(e) => setSpecialDutyForm((f) => ({ ...f, taskTitle: e.target.value }))}
                  placeholder="e.g., Inventory Check"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={specialDutyForm.description}
                  onChange={(e) => setSpecialDutyForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Task details (optional)"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select
                    value={specialDutyForm.priority}
                    onValueChange={(value) => setSpecialDutyForm((f) => ({ ...f, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Input
                    value={specialDutyForm.shift}
                    placeholder="e.g., Morning"
                    onChange={(e) => setSpecialDutyForm((f) => ({ ...f, shift: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  required
                  value={specialDutyForm.dueDate}
                  onChange={(e) => setSpecialDutyForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" onClick={() => setSpecialDutyOpen(false)} variant="outline" disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="btn-gradient-primary">
                  {submitting ? "Assigning..." : "Assign Special Duty"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Duty Dialog */}
      {dailyDutyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto"
          onClick={() => setDailyDutyOpen(false)}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl mx-auto w-full max-w-lg max-h-[90vh] my-8 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDailyDutyOpen(false)}
              className="absolute top-4 right-4 z-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <form className="flex flex-col gap-5 p-8 pt-6 overflow-y-auto" onSubmit={assignDailyDuty}>
              <div className="flex items-center gap-3 mb-2">
                {currentEmp && (
                  <Avatar className="h-10 w-10">
                    {currentEmp.profileImageUrl ? (
                      <AvatarImage src={currentEmp.profileImageUrl} alt={`${currentEmp.firstName} ${currentEmp.lastName}`} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials(`${currentEmp.firstName} ${currentEmp.lastName}`)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                <h2 className="text-2xl font-bold">Daily Duty for {currentEmp?.firstName} {currentEmp?.lastName}</h2>
              </div>

              <div className="space-y-2">
                <Label>Duty Date *</Label>
                <Input
                  type="date"
                  required
                  value={dailyDutyForm.dutyDate}
                  onChange={(e) => setDailyDutyForm((f) => ({ ...f, dutyDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Product *</Label>
                <Select
                  value={dailyDutyForm.productName}
                  onValueChange={(value) => setDailyDutyForm((f) => ({ ...f, productName: value, guns: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product: any) => (
                      <SelectItem key={product.id} value={product.productName}>
                        {product.productName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gun *</Label>
                <Select
                  value={dailyDutyForm.guns}
                  onValueChange={(value) => setDailyDutyForm((f) => ({ ...f, guns: value }))}
                  disabled={!dailyDutyForm.productName}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gun" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGuns.length === 0 ? (
                      <SelectItem value="no-guns-available" disabled>No guns available</SelectItem>
                    ) : (
                      filteredGuns.map((gun: any) => (
                        <SelectItem key={gun.id} value={gun.guns}>
                          {gun.guns} ({gun.serialNumber})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shift Start *</Label>
                  <Input
                    type="time"
                    required
                    value={dailyDutyForm.shiftStart}
                    onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftStart: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shift End *</Label>
                  <Input
                    type="time"
                    required
                    value={dailyDutyForm.shiftEnd}
                    onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" onClick={() => setDailyDutyOpen(false)} variant="outline" disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="btn-gradient-primary">
                  {submitting ? "Assigning..." : "Assign Daily Duty"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
