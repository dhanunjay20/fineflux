import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Calendar,
  User,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Fuel,
  TrendingUp,
} from 'lucide-react';
import dayjs from 'dayjs';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://finflux-64307221061.asia-south1.run.app';

interface EmployeeDuty {
  id: string;
  organizationId: string;
  empId: string;
  dutyDate: string; // LocalDate from backend
  productId: string;
  gunIds: string[];
  shiftStart: string; // Time format HH:mm
  shiftEnd: string; // Time format HH:mm
  totalHours: number;
  status: string; // SCHEDULED, ACTIVE, COMPLETED, CANCELLED
  createdAt: string;
  updatedAt: string;
}

interface DutyFormData {
  empId: string;
  dutyDate: string;
  productId: string;
  gunIds: string[];
  shiftStart: string;
  shiftEnd: string;
  status: string;
}

const initialFormData: DutyFormData = {
  empId: '',
  dutyDate: dayjs().format('YYYY-MM-DD'),
  productId: '',
  gunIds: [],
  shiftStart: '09:00',
  shiftEnd: '17:00',
  status: 'SCHEDULED',
};

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-blue-500' },
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-500' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-gray-500' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500' },
];

export default function EmployeeDutyManagement() {
  const orgId = localStorage.getItem('organizationId');
  const currentEmpId = localStorage.getItem('empId');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<EmployeeDuty | null>(null);
  const [formData, setFormData] = useState<DutyFormData>(initialFormData);
  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Fetch employees
  const { data: employeesData } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/api/organizations/${orgId}/employees`);
      return response.data;
    },
    enabled: !!orgId,
  });

  const employees = useMemo(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData;
    if (employeesData.employees && Array.isArray(employeesData.employees)) return employeesData.employees;
    return [];
  }, [employeesData]);

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products', orgId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/api/organizations/${orgId}/products`);
      return response.data;
    },
    enabled: !!orgId,
  });

  const products = useMemo(() => {
    if (!productsData) return [];
    if (Array.isArray(productsData)) return productsData;
    return [];
  }, [productsData]);

  // Fetch guns
  const { data: gunsData } = useQuery({
    queryKey: ['guns', orgId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/api/organizations/${orgId}/guninfo`);
      return response.data;
    },
    enabled: !!orgId,
  });

  const guns = useMemo(() => {
    if (!gunsData) return [];
    if (Array.isArray(gunsData)) return gunsData;
    return [];
  }, [gunsData]);

  // Fetch duties
  const { data: dutiesData, isLoading } = useQuery({
    queryKey: ['duties', orgId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/api/organizations/${orgId}/employee-duties`);
      return response.data;
    },
    enabled: !!orgId,
  });

  const duties = useMemo(() => {
    if (!dutiesData) return [];
    if (Array.isArray(dutiesData)) return dutiesData;
    return [];
  }, [dutiesData]);

  // Create duty mutation
  const createMutation = useMutation({
    mutationFn: async (data: DutyFormData) => {
      const payload = {
        organizationId: orgId,
        empId: data.empId,
        dutyDate: data.dutyDate,
        productId: data.productId,
        gunIds: data.gunIds,
        shiftStart: data.shiftStart,
        shiftEnd: data.shiftEnd,
        status: data.status,
      };
      const response = await axios.post(
        `${API_BASE}/api/organizations/${orgId}/employee-duties`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duties', orgId] });
      toast({
        title: '✅ Success',
        description: 'Duty assigned successfully',
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: '❌ Error',
        description: error.response?.data?.message || 'Failed to assign duty',
        variant: 'destructive',
      });
    },
  });

  // Update duty mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DutyFormData> }) => {
      const response = await axios.put(
        `${API_BASE}/api/organizations/${orgId}/employee-duties/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duties', orgId] });
      toast({
        title: '✅ Updated',
        description: 'Duty updated successfully',
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: '❌ Error',
        description: error.response?.data?.message || 'Failed to update duty',
        variant: 'destructive',
      });
    },
  });

  // Delete duty mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_BASE}/api/organizations/${orgId}/employee-duties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duties', orgId] });
      toast({
        title: '✅ Deleted',
        description: 'Duty deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Error',
        description: error.response?.data?.message || 'Failed to delete duty',
        variant: 'destructive',
      });
    },
  });
  // Filter duties by date and status
  const filteredDuties = useMemo(() => {
    let filtered = duties;

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter((duty: EmployeeDuty) =>
        dayjs(duty.dutyDate).format('YYYY-MM-DD') === filterDate
      );
    }

    // Filter by status
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter((duty: EmployeeDuty) => duty.status === filterStatus);
    }

    return filtered;
  }, [duties, filterDate, filterStatus]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const todayDuties = duties.filter((d: EmployeeDuty) =>
      dayjs(d.dutyDate).format('YYYY-MM-DD') === today
    );

    const scheduled = todayDuties.filter((d: EmployeeDuty) => d.status === 'SCHEDULED').length;
    const active = todayDuties.filter((d: EmployeeDuty) => d.status === 'ACTIVE').length;
    const completed = todayDuties.filter((d: EmployeeDuty) => d.status === 'COMPLETED').length;

    const totalHours = todayDuties.reduce((sum: number, d: EmployeeDuty) =>
      sum + (d.totalHours || 0), 0
    );
    const avgHours = todayDuties.length > 0 ? (totalHours / todayDuties.length).toFixed(1) : '0.0';

    return {
      scheduled,
      active,
      completed,
      totalEmployees: employees.length,
      avgHours,
    };
  }, [duties, employees]);

  // Handlers
  const handleOpenDialog = (duty?: EmployeeDuty) => {
    if (duty) {
      setEditingDuty(duty);
      setFormData({
        empId: duty.empId,
        dutyDate: dayjs(duty.dutyDate).format('YYYY-MM-DD'),
        productId: duty.productId,
        gunIds: duty.gunIds,
        shiftStart: duty.shiftStart,
        shiftEnd: duty.shiftEnd,
        status: duty.status,
      });
    } else {
      setEditingDuty(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDuty(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.empId || !formData.productId || formData.gunIds.length === 0) {
      toast({
        title: '❌ Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (editingDuty) {
      updateMutation.mutate({ id: editingDuty.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this duty assignment?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleGunSelection = (gunId: string) => {
    setFormData((prev) => {
      const gunIds = prev.gunIds.includes(gunId)
        ? prev.gunIds.filter((id) => id !== gunId)
        : [...prev.gunIds, gunId];
      return { ...prev, gunIds };
    });
  };

  // Helper functions
  const getUserInitials = (empId: string) => {
    const employee = employees.find((e: any) => e.empId === empId);
    const name = employee?.username || employee?.name || empId;
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getEmployeeName = (empId: string) => {
    const employee = employees.find((e: any) => e.empId === empId);
    return employee?.username || employee?.name || empId;
  };

  const getProductName = (productId: string) => {
    const product = products.find((p: any) => p.id === productId || p.productId === productId);
    return product?.productName || productId;
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    if (!statusOption) return null;

    const icons = {
      SCHEDULED: Clock,
      ACTIVE: CheckCircle,
      COMPLETED: CheckCircle,
      CANCELLED: XCircle,
    };

    const Icon = icons[status as keyof typeof icons] || AlertCircle;

    return (
      <Badge className={`${statusOption.color} text-white`}>
        <Icon className="mr-1 h-3 w-3" />
        {statusOption.label}
      </Badge>
    );
  };

  const weeklyStats = [
    {
      title: 'Scheduled',
      value: stats.scheduled.toString(),
      change: 'Today',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active',
      value: stats.active.toString(),
      change: 'In progress',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Completed',
      value: stats.completed.toString(),
      change: 'Today',
      icon: CheckCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    {
      title: 'Avg Hours',
      value: stats.avgHours,
      change: 'Per duty',
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
  ];
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Duty Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {editingDuty ? 'Edit Duty Assignment' : 'Assign New Duty'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Employee Selection */}
              <div className="space-y-2">
                <Label htmlFor="employee">Employee *</Label>
                <Select
                  value={formData.empId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, empId: value }))
                  }
                  disabled={!!editingDuty}
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.empId} value={emp.empId}>
                        {emp.username || emp.name || emp.empId} ({emp.empId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duty Date */}
              <div className="space-y-2">
                <Label htmlFor="dutyDate">Duty Date *</Label>
                <Input
                  id="dutyDate"
                  type="date"
                  value={formData.dutyDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, dutyDate: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Product Selection */}
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, productId: value }))
                  }
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product: any) => (
                      <SelectItem
                        key={product.id || product.productId}
                        value={product.id || product.productId}
                      >
                        {product.productName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gun Selection */}
              <div className="space-y-2">
                <Label>Guns * (Select at least one)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                  {guns.map((gun: any) => (
                    <label
                      key={gun.id || gun._id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.gunIds.includes(gun.id || gun._id)}
                        onChange={() => handleGunSelection(gun.id || gun._id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{gun.guns}</span>
                    </label>
                  ))}
                </div>
                {formData.gunIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {formData.gunIds.length} gun(s)
                  </p>
                )}
              </div>

              {/* Shift Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shiftStart">Shift Start *</Label>
                  <Input
                    id="shiftStart"
                    type="time"
                    value={formData.shiftStart}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, shiftStart: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shiftEnd">Shift End *</Label>
                  <Input
                    id="shiftEnd"
                    type="time"
                    value={formData.shiftEnd}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, shiftEnd: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingDuty ? 'Update Duty' : 'Assign Duty'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground leading-tight">
            Employee Duty Management
          </h1>
          <p className="text-muted-foreground">
            Manage shift assignments and duty roster
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-auto"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="btn-gradient-primary"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Assign Duty
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {weeklyStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
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
      {/* Duties List */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Duty Assignments
            <Badge className="ml-2">
              {dayjs(filterDate).format('DD MMM YYYY')}
            </Badge>
            {filterStatus !== 'ALL' && (
              <Badge variant="outline">{filterStatus}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading duty assignments...</p>
            </div>
          ) : filteredDuties.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                No duty assignments found
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {filterStatus !== 'ALL'
                  ? `No duties with status "${filterStatus}"`
                  : 'Assign duties to see them here'}
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Assign Duty
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredDuties.map((duty: EmployeeDuty) => (
                <div
                  key={duty.id}
                  className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/30 transition-all duration-300 border border-border hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Employee Info */}
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {getUserInitials(duty.empId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {getEmployeeName(duty.empId)}
                          </h3>
                          {getStatusBadge(duty.status)}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          ID: {duty.empId}
                        </p>

                        {/* Duty Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          {/* Date */}
                          <div className="flex items-start gap-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Date</p>
                              <p className="font-medium text-sm">
                                {dayjs(duty.dutyDate).format('DD MMM YYYY')}
                              </p>
                            </div>
                          </div>

                          {/* Product */}
                          <div className="flex items-start gap-2">
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <Fuel className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Product</p>
                              <p className="font-medium text-sm truncate">
                                {getProductName(duty.productId)}
                              </p>
                            </div>
                          </div>

                          {/* Shift Time */}
                          <div className="flex items-start gap-2">
                            <div className="p-2 bg-green-50 rounded-lg">
                              <Clock className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Shift Time</p>
                              <p className="font-medium text-sm">
                                {duty.shiftStart} - {duty.shiftEnd}
                              </p>
                            </div>
                          </div>

                          {/* Total Hours */}
                          <div className="flex items-start gap-2">
                            <div className="p-2 bg-orange-50 rounded-lg">
                              <Timer className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Total Hours</p>
                              <p className="font-bold text-sm text-orange-600">
                                {duty.totalHours.toFixed(2)} hrs
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Assigned Guns */}
                        {/* Assigned Guns */}
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">
                            Assigned Guns:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {duty.gunIds.map((gunId) => {
                              const gun = guns.find(
                                (g: any) => (g.id || g._id) === gunId
                              );
                              return (
                                <Badge
                                  key={gunId}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {gun?.guns || gunId}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex gap-2 sm:flex-col shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(duty)}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4 sm:mr-0 mr-2" />
                        <span className="sm:hidden">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive flex-1 sm:flex-none"
                        onClick={() => handleDelete(duty.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Delete</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
