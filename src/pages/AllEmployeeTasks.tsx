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
  CalendarDays
} from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

export default function AllEmployeeTasks() {
  const navigate = useNavigate();
  const orgId = localStorage.getItem('organizationId') || '';
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('pending');
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
    axios.get(`${API_BASE}/api/organizations/${orgId}/tasks`)
      .then(res => setTasks(res.data || []))
      .catch(err => console.error('Failed to load tasks:', err))
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
    return { pending, inProgress, completed, overdue, total: tasks.length, employees: uniqueEmployees.size };
  }, [tasks]);

  const statuses = [
    { key: 'pending', label: 'Pending', color: 'text-warning', bgColor: 'bg-warning-soft', icon: Timer },
    { key: 'in-progress', label: 'In Progress', color: 'text-primary', bgColor: 'bg-primary-soft', icon: FileText },
    { key: 'completed', label: 'Completed', color: 'text-success', bgColor: 'bg-success-soft', icon: CheckCircle },
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

  // Filter by status, search, and date
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.status === selectedTab);
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.taskTitle?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assignedToName?.toLowerCase().includes(query) ||
        task.assignedToEmpId?.toLowerCase().includes(query)
      );
    }

    // Date filter
    filtered = filtered.filter(task => isInDateRange(task.dueDate));
    
    return filtered;
  }, [tasks, selectedTab, searchQuery, dateFilter, customStartDate, customEndDate]);

  const paginatedTasks = filteredTasks.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredTasks.length / pageSize);

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
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'in-progress': return 'bg-primary/10 text-primary border-primary/20';
      case 'completed': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Employee Tasks</h1>
          <p className="text-muted-foreground">View and manage tasks for all employees in your organization</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
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
                <FileText className="h-6 w-6 text-primary" />
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
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-foreground">{stats.overdue}</p>
              </div>
              <div className="bg-destructive-soft p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-destructive" />
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
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks by title, description, or employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
              {statuses.map(stat => {
                const active = selectedTab === stat.key;
                const Icon = stat.icon;
                return (
                  <Button
                    key={stat.key}
                    variant={active ? "default" : "outline"}
                    onClick={() => setSelectedTab(stat.key)}
                    className={active ? 'btn-gradient-primary' : ''}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{stat.label}</span>
                    <span className="sm:hidden">{stat.label.split(' ')[0]}</span>
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

            {/* Custom Date Range Inputs */}
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

          {/* Active Filters Display */}
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

      {/* Loading State */}
      {loading && (
        <Card className="card-gradient">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading tasks...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredTasks.length === 0 && (
        <Card className="card-gradient">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-muted rounded-full">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No Tasks Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || dateFilter !== 'all'
                    ? 'No tasks match your current filters' 
                    : `No ${statuses.find(s => s.key === selectedTab)?.label.toLowerCase()} tasks available.`}
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

      {/* Tasks Grid */}
      {!loading && paginatedTasks.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedTasks.map(task => (
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
            ))}
          </div>

          {/* Enhanced Pagination with Page Size Selector */}
          {filteredTasks.length > 10 && (
            <Card className="card-gradient">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  {/* Page Size Selector */}
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

                  {/* Results Counter */}
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{page * pageSize + 1}</span> to{' '}
                    <span className="font-semibold text-foreground">
                      {Math.min((page + 1) * pageSize, filteredTasks.length)}
                    </span>{' '}
                    of <span className="font-semibold text-foreground">{filteredTasks.length}</span> tasks
                  </div>

                  {/* Pagination Controls */}
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
