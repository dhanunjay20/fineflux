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
import { Search, Eye, Users, UserCheck, Briefcase, ClipboardList, Star, Calendar, X, Mail, Phone, Clock, Filter, Fuel, CheckCircle2, AlertCircle, Target, Loader2 } from "lucide-react";
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
  const [productGuns, setProductGuns] = useState<Record<string, string[]>>({});
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
    setProductGuns({});
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
    setProductGuns({});
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
    
    // Collect all guns from all selected products
    const allGuns = selectedProducts.flatMap(product => productGuns[product] || []);
    
    if (allGuns.length === 0) {
      setValidationErr("At least one gun is required");
      return;
    }
    if (!dailyDutyForm.shiftStart || !dailyDutyForm.shiftEnd) {
      setValidationErr("Shift start and end times are required");
      return;
    }

    setValidationErr(null);
    
    // Format date properly for backend (LocalDate expects YYYY-MM-DD)
    const dutyDateFormatted = dayjs(dailyDutyForm.dutyDate).format("YYYY-MM-DD");

    createDutyMutation.mutate({
      orgId,
      empId: dailyDutyForm.empId,
      dutyDate: dutyDateFormatted,
      products: selectedProducts,
      guns: allGuns,
      shiftStart: dailyDutyForm.shiftStart,
      shiftEnd: dailyDutyForm.shiftEnd,
      status: dailyDutyForm.status || "SCHEDULED"
    });
  }

  const toggleProductSelection = (productName: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productName)) {
        // When deselecting a product, remove its guns
        setProductGuns(prevGuns => {
          const newGuns = { ...prevGuns };
          delete newGuns[productName];
          return newGuns;
        });
        
        return prev.filter(p => p !== productName);
      }
      // When selecting a product, initialize empty gun array for it
      setProductGuns(prevGuns => ({
        ...prevGuns,
        [productName]: []
      }));
      return [...prev, productName];
    });
  };

  const toggleGunSelection = (productName: string, gunName: string) => {
    setProductGuns(prev => {
      const currentGuns = prev[productName] || [];
      const newGuns = currentGuns.includes(gunName)
        ? currentGuns.filter(g => g !== gunName)
        : [...currentGuns, gunName];
      
      return {
        ...prev,
        [productName]: newGuns
      };
    });
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
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={closeModal}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-lg"
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
                    <SelectContent className='z-[10000]'>
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
      {/* DAILY DUTY MODAL - MODERNIZED WITH STICKY HEADER/FOOTER */}
      {dailyDutyOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDailyDutyOpen(false);
              setValidationErr(null);
            }
          }}
        >
          <div
            className="relative bg-background shadow-2xl rounded-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setDailyDutyOpen(false);
                  setValidationErr(null);
                }}
                className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 pr-12">
                {currentEmp && (
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    {currentEmp.profileImageUrl ? (
                      <AvatarImage src={currentEmp.profileImageUrl} alt={`${currentEmp.firstName} ${currentEmp.lastName}`} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                        {getUserInitials(`${currentEmp.firstName} ${currentEmp.lastName}`)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-5 w-5 text-primary shrink-0" />
                    <h2 className="text-xl font-bold truncate">Daily Pump Duty</h2>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {currentEmp?.firstName} {currentEmp?.lastName} • {currentEmp?.empId}
                  </p>
                </div>
              </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <form onSubmit={assignDailyDuty} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Duty Date */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label htmlFor="dutyDate" className="font-semibold">Duty Date *</Label>
                  </div>
                  <Input
                    id="dutyDate"
                    type="date"
                    required
                    min={getTodayIST()}
                    value={dailyDutyForm.dutyDate}
                    onChange={(e) => setDailyDutyForm((f) => ({ ...f, dutyDate: e.target.value }))}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Minimum date: {dayjs().tz(IST_TIMEZONE).format("DD MMM YYYY")} (IST)
                  </p>
                </div>

                {/* Products Section - Card Based */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-primary" />
                      <Label className="font-semibold">Products *</Label>
                    </div>
                    {selectedProducts.length > 0 && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {selectedProducts.length} selected
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.length === 0 ? (
                      <div className="col-span-2 text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                        <Fuel className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No products available</p>
                      </div>
                    ) : (
                      products.map((product: any) => {
                        const isSelected = selectedProducts.includes(product.productName);
                        return (
                          <div
                            key={product.productName}
                            onClick={() => toggleProductSelection(product.productName)}
                            className={`
                        relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${isSelected
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                              }
                      `}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                }`}>
                                {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{product.productName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.productType || 'Fuel Product'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedProducts.length === 0 && products.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Please select at least one product to continue</span>
                    </div>
                  )}
                </div>

                {/* Guns Section - Card Based */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <Label className="font-semibold">Guns *</Label>
                    </div>
                    {Object.values(productGuns).flat().length > 0 && (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {Object.values(productGuns).flat().length} selected
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedProducts.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                        <Target className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Select products first to enable guns</p>
                      </div>
                    ) : (
                      selectedProducts.map(productName => {
                        const productGunList = guns.filter((gun: any) => gun.productName === productName);
                        
                        if (productGunList.length === 0) return null;
                        
                        return (
                          <div key={productName} className="space-y-2">
                            <div className="flex items-center justify-between px-2">
                              <Label className="text-sm font-medium text-muted-foreground">{productName}</Label>
                              {productGuns[productName]?.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {productGuns[productName].length} selected
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {productGunList.map((gun: any) => {
                                const isSelected = productGuns[productName]?.includes(gun.guns);
                                return (
                                  <div
                                    key={gun.guns}
                                    onClick={() => toggleGunSelection(productName, gun.guns)}
                                    className={`
                                      relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                                      ${isSelected
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }
                                    `}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                      }`}>
                                        {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{gun.guns}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {gun.serialNumber || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {Object.values(productGuns).flat().length === 0 && filteredGuns.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Please select at least one gun to continue</span>
                    </div>
                  )}
                </div>

                {/* Shift Times */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <Label className="font-semibold">Shift Timing *</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shiftStart" className="text-xs text-muted-foreground">Start Time</Label>
                      <Input
                        id="shiftStart"
                        type="time"
                        required
                        value={dailyDutyForm.shiftStart}
                        onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftStart: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shiftEnd" className="text-xs text-muted-foreground">End Time</Label>
                      <Input
                        id="shiftEnd"
                        type="time"
                        required
                        value={dailyDutyForm.shiftEnd}
                        onChange={(e) => setDailyDutyForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Error */}
                {validationErr && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-destructive">{validationErr}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* STICKY FOOTER */}
              <div className="sticky bottom-0 z-10 bg-background border-t px-6 py-4">
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setDailyDutyOpen(false);
                      setValidationErr(null);
                    }}
                    variant="outline"
                    disabled={createDutyMutation.isPending}
                    className="h-11 flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDutyMutation.isPending}
                    className="btn-gradient-primary h-11 flex-1 sm:flex-none"
                  >
                    {createDutyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Assign Daily Duty
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
