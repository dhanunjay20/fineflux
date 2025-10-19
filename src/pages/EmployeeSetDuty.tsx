import { useMemo, useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Search, Eye, Users, UserCheck, Briefcase, ClipboardList, Star, Calendar, X, Mail, Phone, Clock, Filter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

// Enable timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const IST_TIMEZONE = "Asia/Kolkata";

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
  orgId: string;
  taskTitle: string;
  description: string;
  priority: "high" | "medium" | "low";
  shift: string;
  assignedToEmpId: string;
  dueDate: string;
};

type DailyDutyCreate = {
  orgId: string;
  empId: string;
  dutyDate: string;
  products: string[];
  guns: string[];
  shiftStart: string;
  shiftEnd: string;
  status?: string;
};

function formatTime(time?: string) {
  return time || "";
}

// Get current IST date
const getTodayIST = () => dayjs().tz(IST_TIMEZONE).format("YYYY-MM-DD");

export default function EmployeeSetDuty() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orgId = typeof window !== "undefined" ? localStorage.getItem("organizationId") || "" : "";

  if (!orgId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading organization context…
      </div>
    );
  }

  const [search, setSearch] = useState("");

  // Fetch employees
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

  // Fetch products
  const { data: productsRaw = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/products`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  // Fetch guns
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

  // Special Duty State
  const [specialDutyOpen, setSpecialDutyOpen] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  const [specialDutyForm, setSpecialDutyForm] = useState<TaskCreate>({
    orgId,
    taskTitle: "",
    description: "",
    priority: "medium",
    shift: "",
    assignedToEmpId: "",
    dueDate: dayjs().tz(IST_TIMEZONE).add(1, "day").format("YYYY-MM-DD"),
  });

  // Daily Duty State
  const [dailyDutyOpen, setDailyDutyOpen] = useState(false);
  const [dailyDutyForm, setDailyDutyForm] = useState<Omit<DailyDutyCreate, 'orgId' | 'products' | 'guns'>>({
    empId: "",
    dutyDate: getTodayIST(),
    shiftStart: "",
    shiftEnd: "",
    status: "SCHEDULED",
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedGuns, setSelectedGuns] = useState<string[]>([]);
  const [validationErr, setValidationErr] = useState<string | null>(null);

  // Mutation for creating daily duty
  const createDutyMutation = useMutation({
    mutationFn: async (data: DailyDutyCreate) => {
      const response = await axios.post(
        `${API_BASE}/api/organizations/${orgId}/employee-duties`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Daily duty assigned to ${currentEmp?.firstName} ${currentEmp?.lastName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["employee-duties", orgId] });
      setDailyDutyOpen(false);
      resetDailyForm();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || "Could not assign daily duty.";
      toast({
        title: "Assignment Failed",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  // Mutation for creating special task
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskCreate) => {
      const response = await axios.post(
        `${API_BASE}/api/organizations/${orgId}/tasks`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Special duty "${specialDutyForm.taskTitle}" assigned to ${currentEmp?.firstName} ${currentEmp?.lastName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      setSpecialDutyOpen(false);
      resetSpecialForm();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || "Could not assign special duty.";
      toast({
        title: "Assignment Failed",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  function resetDailyForm() {
    setDailyDutyForm({
      empId: "",
      dutyDate: getTodayIST(),
      shiftStart: "",
      shiftEnd: "",
      status: "SCHEDULED",
    });
    setSelectedProducts([]);
    setSelectedGuns([]);
    setValidationErr(null);
  }

  function resetSpecialForm() {
    setSpecialDutyForm({
      orgId,
      taskTitle: "",
      description: "",
      priority: "medium",
      shift: "",
      assignedToEmpId: "",
      dueDate: dayjs().tz(IST_TIMEZONE).add(1, "day").format("YYYY-MM-DD"),
    });
  }

  function openSpecialDutyDialog(emp: Employee) {
    setCurrentEmp(emp);
    setSpecialDutyForm({
      orgId,
      assignedToEmpId: emp.empId,
      taskTitle: "",
      description: "",
      priority: "medium",
      shift: "",
      dueDate: dayjs().tz(IST_TIMEZONE).add(1, "day").format("YYYY-MM-DD"),
    });
    setSpecialDutyOpen(true);
    setDailyDutyOpen(false);
  }

  function openDailyDutyDialog(emp: Employee) {
    setCurrentEmp(emp);
    setDailyDutyForm({
      empId: emp.empId,
      dutyDate: getTodayIST(),
      shiftStart: emp.shiftTiming?.start || "06:00",
      shiftEnd: emp.shiftTiming?.end || "18:00",
      status: "SCHEDULED",
    });
    setSelectedProducts([]);
    setSelectedGuns([]);
    setDailyDutyOpen(true);
    setSpecialDutyOpen(false);
    setValidationErr(null);
  }

  async function assignSpecialDuty(e: React.FormEvent) {
    e.preventDefault();
    if (!specialDutyForm.taskTitle || !specialDutyForm.assignedToEmpId || !specialDutyForm.priority) {
      toast({
        title: "Validation Error",
        description: "Title, priority, and assignee required.",
        variant: "destructive"
      });
      return;
    }
    createTaskMutation.mutate(specialDutyForm);
  }

  async function assignDailyDuty(e: React.FormEvent) {
    e.preventDefault();

    if (!dailyDutyForm.empId) {
      setValidationErr("Employee is required");
      return;
    }
    if (selectedProducts.length === 0) {
      setValidationErr("At least one product is required");
      return;
    }
    if (selectedGuns.length === 0) {
      setValidationErr("At least one gun is required");
      return;
    }
    if (!dailyDutyForm.shiftStart || !dailyDutyForm.shiftEnd) {
      setValidationErr("Shift start and end times are required");
      return;
    }

    setValidationErr(null);
    createDutyMutation.mutate({
      orgId,
      ...dailyDutyForm,
      products: selectedProducts,
      guns: selectedGuns
    });
  }

  const toggleProductSelection = (productName: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productName)) {
        const gunsToRemove = guns.filter((g: any) => g.productName === productName).map((g: any) => g.guns);
        setSelectedGuns(prevGuns => prevGuns.filter(g => !gunsToRemove.includes(g)));
        return prev.filter(p => p !== productName);
      }
      return [...prev, productName];
    });
  };

  const toggleGunSelection = (gunName: string) => {
    setSelectedGuns(prev =>
      prev.includes(gunName) ? prev.filter(g => g !== gunName) : [...prev, gunName]
    );
  };

  const getUserInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const filteredGuns = guns.filter((gun: any) =>
    selectedProducts.includes(gun.productName)
  );

  function closeModal(event: React.MouseEvent<HTMLDivElement>): void {
    if (event.currentTarget === event.target) {
      setSpecialDutyOpen(false);
      setDailyDutyOpen(false);
      setValidationErr(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Set Employee Duty</h1>
          <p className="text-muted-foreground">
            Assign special tasks or daily pump duties to team members
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Current IST Time: {dayjs().tz(IST_TIMEZONE).format("DD MMM YYYY, hh:mm A")}
          </p>
        </div>
        <Button className="btn-gradient-primary" onClick={() => navigate('/all-employee-tasks')}>
          <Eye className="mr-2 h-4 w-4" />
          View All Duties
        </Button>
      </div>

      {/* Stats Cards */}
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

      {/* Search Bar */}
      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees by name, email, role..."
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

      {/* Employee List */}
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

      {/* SPECIAL DUTY MODAL */}
      {specialDutyOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={closeModal}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl mx-auto w-full max-w-lg my-auto"
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
            <form className="flex flex-col gap-5 p-8 pt-6" onSubmit={assignSpecialDuty}>
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
                <h2 className="text-2xl font-bold">Special Duty - {currentEmp?.firstName} {currentEmp?.lastName}</h2>
              </div>

              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input
                  required
                  value={specialDutyForm.taskTitle}
                  onChange={(e) => setSpecialDutyForm((f) => ({ ...f, taskTitle: e.target.value }))}
                  placeholder="e.g., Inventory Check"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={specialDutyForm.description}
                  onChange={(e) => setSpecialDutyForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Task details (optional)"
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select
                    value={specialDutyForm.priority}
                    onValueChange={(value) => setSpecialDutyForm((f) => ({ ...f, priority: value as TaskCreate["priority"] }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
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
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  required
                  min={getTodayIST()}
                  value={specialDutyForm.dueDate}
                  onChange={(e) => setSpecialDutyForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <Button
                  type="button"
                  onClick={() => setSpecialDutyOpen(false)}
                  variant="outline"
                  disabled={createTaskMutation.isPending}
                  className="h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="btn-gradient-primary h-11"
                >
                  {createTaskMutation.isPending ? "Assigning..." : "Assign Special Duty"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAILY DUTY MODAL */}
      {dailyDutyOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={closeModal}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl mx-auto w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { setDailyDutyOpen(false); setValidationErr(null); }}
              className="absolute top-4 right-4 z-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <form className="flex flex-col gap-5 p-8 pt-6" onSubmit={assignDailyDuty}>
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
                <h2 className="text-2xl font-bold">Daily Duty - {currentEmp?.firstName} {currentEmp?.lastName}</h2>
              </div>

              <div className="space-y-2">
                <Label>Duty Date *</Label>
                <Input
                  type="date"
                  required
                  min={getTodayIST()}
                  value={dailyDutyForm.dutyDate}
                  onChange={(e) => setDailyDutyForm((f) => ({ ...f, dutyDate: e.target.value }))}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum date: {dayjs().tz(IST_TIMEZONE).format("DD MMM YYYY")} (IST)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Products * (Select one or more)</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-muted/20">
                  {products.length === 0
                    ? <p className="text-sm text-muted-foreground">No products available</p>
                    : products.map((product: any) => (
                      <div key={product.productName} className="flex items-center gap-2">
                        <Checkbox
                          id={`prod-${product.productName}`}
                          checked={selectedProducts.includes(product.productName)}
                          onCheckedChange={() => toggleProductSelection(product.productName)}
                        />
                        <label htmlFor={`prod-${product.productName}`} className="text-sm font-medium cursor-pointer">
                          {product.productName}
                        </label>
                      </div>
                    ))}
                </div>
                {selectedProducts.length > 0 && (
                  <p className="text-xs text-muted-foreground">✓ {selectedProducts.length} product(s) selected</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Guns * (Select one or more)</Label>
                <div className="border rounded-lg p-3 max-h-44 overflow-y-auto space-y-2 bg-muted/20">
                  {selectedProducts.length === 0
                    ? <p className="text-sm text-muted-foreground">Select products to enable guns</p>
                    : filteredGuns.length === 0
                      ? <p className="text-sm text-muted-foreground">No guns for selected product(s)</p>
                      : filteredGuns.map((gun: any) => (
                        <div key={gun.guns} className="flex items-center gap-2">
                          <Checkbox
                            id={`gun-${gun.guns}`}
                            checked={selectedGuns.includes(gun.guns)}
                            onCheckedChange={() => toggleGunSelection(gun.guns)}
                          />
                          <label htmlFor={`gun-${gun.guns}`} className="text-sm font-medium cursor-pointer">
                            {gun.guns} — {gun.productName} — {gun.serialNumber || "N/A"}
                          </label>
                        </div>
                      ))}
                </div>
                {selectedGuns.length > 0 && (
                  <p className="text-xs text-muted-foreground">✓ {selectedGuns.length} gun(s) selected</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shift Start *</Label>
                  <Input
                    type="time"
                    required
                    value={dailyDutyForm.shiftStart}
                    onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftStart: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shift End *</Label>
                  <Input
                    type="time"
                    required
                    value={dailyDutyForm.shiftEnd}
                    onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                    className="h-11"
                  />
                </div>
              </div>

              {validationErr && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-semibold">{validationErr}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-2">
                <Button
                  type="button"
                  onClick={() => { setDailyDutyOpen(false); setValidationErr(null); }}
                  variant="outline"
                  disabled={createDutyMutation.isPending}
                  className="h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createDutyMutation.isPending}
                  className="btn-gradient-primary h-11"
                >
                  {createDutyMutation.isPending ? "Assigning..." : "Assign Daily Duty"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
