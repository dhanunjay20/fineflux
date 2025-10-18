import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  CheckCircle, 
  Timer, 
  User, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  ArrowLeft, 
  Search,
  Filter,
  Loader2,
  CalendarDays,
  Fuel,
  Target,
  Activity
} from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

export default function AllEmployeeTasks() {
  const navigate = useNavigate();
  const orgId = localStorage.getItem('organizationId') || '';
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [dailyDuties, setDailyDuties] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/employee-duties`)
    ])
      .then(([tasksRes, dutiesRes]) => {
        setTasks(tasksRes.data || []);
        setDailyDuties(dutiesRes.data || []);
      })
      .catch(err => console.error('Failed to load data:', err))
      .finally(() => setLoading(false));
  }, [orgId]);

  const stats = useMemo(() => {
    let pending = 0, inProgress = 0, completed = 0, overdue = 0;
    const uniqueEmployees = new Set();
    
    for (const t of tasks) {
      if (t.status === 'pending') pending++;
      if (t.status === 'in-progress') inProgress++;
      if (t.status === 'completed') completed++;
      if (t.assignedToEmpId) uniqueEmployees.add(t.assignedToEmpId);
      if (
        t.status !== 'completed' &&
        t.dueDate &&
        new Date(t.dueDate) < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
      ) {
        overdue++;
      }
    }

    // Daily duties stats
    const scheduledDuties = dailyDuties.filter(d => d.status === 'SCHEDULED').length;
    const activeDuties = dailyDuties.filter(d => d.status === 'ACTIVE').length;
    const completedDuties = dailyDuties.filter(d => d.status === 'COMPLETED').length;
    
    dailyDuties.forEach(d => {
      if (d.empId) uniqueEmployees.add(d.empId);
    });

    return { 
      pending, 
      inProgress, 
      completed, 
      overdue, 
      total: tasks.length, 
      employees: uniqueEmployees.size,
      dailyTotal: dailyDuties.length,
      dailyScheduled: scheduledDuties,
      dailyActive: activeDuties,
      dailyCompleted: completedDuties
    };
  }, [tasks, dailyDuties]);

  const statuses = [
    { key: 'all', label: 'All Tasks', color: 'text-foreground', bgColor: 'bg-muted', icon: FileText },
    { key: 'pending', label: 'Pending', color: 'text-warning', bgColor: 'bg-warning-soft', icon: Timer },
    { key: 'in-progress', label: 'In Progress', color: 'text-primary', bgColor: 'bg-primary-soft', icon: Activity },
    { key: 'completed', label: 'Completed', color: 'text-success', bgColor: 'bg-success-soft', icon: CheckCircle },
    { key: 'daily-duties', label: 'Daily Duties', color: 'text-blue-600', bgColor: 'bg-blue-500/10', icon: Fuel },
  ];

  const dateFilters = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const isInDateRange = (taskDate: string) => {
    if (!taskDate) return false;
    const task = new Date(taskDate);
    const now = new Date();
    
    switch (dateFilter) {
      case 'all':
        return true;
      case 'today':
        return task.toDateString() === now.toDateString();
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return task >= weekStart && task <= weekEnd;
      }
      case 'month': {
        return task.getMonth() === now.getMonth() && task.getFullYear() === now.getFullYear();
      }
      case 'custom': {
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return task >= start && task <= end;
      }
      default:
        return true;
    }
  };

  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return '0';
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    let hours = endHour - startHour;
    if (hours < 0) hours += 24;
    const minutes = endMin - startMin;
    return (hours + minutes / 60).toFixed(1);
  };

  // Filter by status, search, and date
  const filteredItems = useMemo(() => {
    let filtered: any[] = [];

    if (selectedTab === 'daily-duties') {
      filtered = dailyDuties;
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(duty => 
          duty.productId?.toLowerCase().includes(query) ||
          duty.empId?.toLowerCase().includes(query) ||
          duty.dutyDate?.toLowerCase().includes(query)
        );
      }

      filtered = filtered.filter(duty => isInDateRange(duty.dutyDate));
    } else {
      filtered = selectedTab === 'all' ? tasks : tasks.filter(t => t.status === selectedTab);
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(task => 
          task.taskTitle?.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.assignedToName?.toLowerCase().includes(query) ||
          task.assignedToEmpId?.toLowerCase().includes(query)
        );
      }

      filtered = filtered.filter(task => isInDateRange(task.dueDate));
    }
    
    return filtered;
  }, [tasks, dailyDuties, selectedTab, searchQuery, dateFilter, customStartDate, customEndDate]);

  const paginatedItems = filteredItems.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredItems.length / pageSize);

  useEffect(() => {
    setPage(0);
  }, [selectedTab, searchQuery, dateFilter, customStartDate, customEndDate, pageSize]);

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'scheduled':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'in-progress':
      case 'active':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderDailyDutyCard = (duty: any) => (
    <Card key={duty.id} className="card-gradient hover-lift group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Fuel className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Daily Pump Duty</CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`border ${getStatusColor(duty.status || 'SCHEDULED')}`}>
                {duty.status || 'SCHEDULED'}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2.5 pt-3 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Employee ID</p>
              <p className="font-medium text-foreground truncate">{duty.empId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Product</p>
              <p className="font-medium text-foreground">{duty.productId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success/10">
              <Calendar className="h-4 w-4 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Duty Date</p>
              <p className="font-medium text-foreground">{duty.dutyDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Shift Time</p>
              <p className="font-medium text-foreground">{duty.shiftStart} - {duty.shiftEnd}</p>
            </div>
          </div>

          {duty.totalHours && (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10">
                <Timer className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="font-medium text-foreground">
                  {duty.totalHours || calculateHours(duty.shiftStart, duty.shiftEnd)}h
                </p>
              </div>
            </div>
          )}

          {duty.gunIds && duty.gunIds.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10">
                <Fuel className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Guns Assigned</p>
                <p className="font-medium text-foreground">{duty.gunIds.length} gun(s)</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderTaskCard = (task: any) => (
    <Card key={task.id} className="card-gradient hover-lift group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">
              {task.taskTitle}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`border ${getStatusColor(task.status)}`}>
                {task.status.replace('-', ' ').toUpperCase()}
              </Badge>
              
              {task.priority && (
                <Badge className={`border ${getPriorityColor(task.priority)}`}>
                  {task.priority} Priority
                </Badge>
              )}
              
              {isOverdue(task.dueDate) && task.status !== 'completed' && (
                <Badge className="bg-destructive text-destructive-foreground animate-pulse border-destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {task.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="space-y-2.5 pt-3 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Assigned to</p>
              <p className="font-medium text-foreground truncate">
                {task.assignedToName || task.assignedToEmpId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
              <Clock className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Shift</p>
              <p className="font-medium text-foreground">{task.shift}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
              isOverdue(task.dueDate) && task.status !== 'completed'
                ? 'bg-destructive/10'
                : 'bg-success/10'
            }`}>
              <Calendar className={`h-4 w-4 ${
                isOverdue(task.dueDate) && task.status !== 'completed'
                  ? 'text-destructive'
                  : 'text-success'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className={`font-medium ${
                isOverdue(task.dueDate) && task.status !== 'completed'
                  ? 'text-destructive'
                  : 'text-foreground'
              }`}>
                {new Date(task.dueDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Employee Tasks & Duties</h1>
          <p className="text-muted-foreground">View and manage all tasks and duties for your organization</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/employee-set-duty')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Set Duty
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="stat-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Special Tasks</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <FileText className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Daily Duties</p>
                <p className="text-2xl font-bold text-foreground">{stats.dailyTotal}</p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <Fuel className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
              <div className="bg-warning-soft p-3 rounded-lg">
                <Timer className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
              </div>
              <div className="bg-primary-soft p-3 rounded-lg">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
              </div>
              <div className="bg-success-soft p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold text-foreground">{stats.employees}</p>
              </div>
              <div className="bg-accent-soft p-3 rounded-lg">
                <Users className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="card-gradient">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks, duties, or employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {statuses.map(stat => {
                const active = selectedTab === stat.key;
                const Icon = stat.icon;
                const count = stat.key === 'all' ? stats.total + stats.dailyTotal :
                             stat.key === 'pending' ? stats.pending :
                             stat.key === 'in-progress' ? stats.inProgress :
                             stat.key === 'completed' ? stats.completed :
                             stats.dailyTotal;
                return (
                  <Button
                    key={stat.key}
                    variant={active ? "default" : "outline"}
                    onClick={() => setSelectedTab(stat.key)}
                    className={active ? 'btn-gradient-primary' : ''}
                    size="sm"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{stat.label}</span>
                    <Badge variant="secondary" className="ml-2">{count}</Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Filter by Date
            </Label>
            <div className="flex flex-wrap gap-2">
              {dateFilters.map(filter => (
                <Button
                  key={filter.key}
                  variant={dateFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter(filter.key)}
                  className={dateFilter === filter.key ? 'btn-gradient-primary' : ''}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {(searchQuery || dateFilter !== 'all') && (
            <div className="pt-3 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
                {dateFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Date: {dateFilters.find(f => f.key === dateFilter)?.label}
                    <button onClick={() => setDateFilter('all')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="card-gradient">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <Card className="card-gradient">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-muted rounded-full">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || dateFilter !== 'all'
                    ? 'No items match your current filters' 
                    : `No items available.`}
                </p>
              </div>
              {(searchQuery || dateFilter !== 'all') && (
                <Button variant="outline" onClick={() => { setSearchQuery(''); setDateFilter('all'); }}>
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Grid */}
      {!loading && paginatedItems.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedItems.map(item => 
              selectedTab === 'daily-duties' || item.dutyDate
                ? renderDailyDutyCard(item)
                : renderTaskCard(item)
            )}
          </div>

          {/* Pagination */}
          {filteredItems.length > 10 && (
            <Card className="card-gradient">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
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
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{page * pageSize + 1}</span> to{' '}
                    <span className="font-semibold text-foreground">
                      {Math.min((page + 1) * pageSize, filteredItems.length)}
                    </span>{' '}
                    of <span className="font-semibold text-foreground">{filteredItems.length}</span>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i;
                          } else if (page <= 2) {
                            pageNum = i;
                          } else if (page >= totalPages - 3) {
                            pageNum = totalPages - 5 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className={`min-w-[40px] ${page === pageNum ? 'btn-gradient-primary' : ''}`}
                            >
                              {pageNum + 1}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page === totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
