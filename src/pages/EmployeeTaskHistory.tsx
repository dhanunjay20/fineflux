import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Timer, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';
const ITEMS_PER_PAGE = 5;

export default function EmployeeTaskHistory() {
  const orgId = localStorage.getItem('organizationId') || '';
  const empId = localStorage.getItem('empId') || '';
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=pending`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=in-progress`),
      axios.get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=completed`),
    ]).then(([pending, inprogress, completed]) => {
      setTasks([
        ...pending.data.map((t: any) => ({ ...t, status: 'pending' })),
        ...inprogress.data.map((t: any) => ({ ...t, status: 'in-progress' })),
        ...completed.data.map((t: any) => ({ ...t, status: 'completed' })),
      ]);
      setLoading(false);
    });
  }, [orgId, empId]);

  const stats = useMemo(() => {
    let pending = 0, inProgress = 0, completed = 0, overdue = 0;
    for (const t of tasks) {
      if (t.status === 'pending') pending++;
      if (t.status === 'in-progress') inProgress++;
      if (t.status === 'completed') completed++;
      if (
        t.status !== 'completed' &&
        t.dueDate &&
        new Date(t.dueDate) < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
      ) {
        overdue++;
      }
    }
    return { pending, inProgress, completed, overdue, total: tasks.length };
  }, [tasks]);

  const statuses = [
    { key: 'pending', label: 'Pending', color: 'text-warning', icon: Timer },
    { key: 'in-progress', label: 'In Progress', color: 'text-primary', icon: FileText },
    { key: 'completed', label: 'Completed', color: 'text-success', icon: CheckCircle },
  ];

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const filteredTasks = tasks.filter(t => t.status === selectedTab);
  const paginatedTasks = filteredTasks.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(0);
  }, [selectedTab]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Task History</h1>
          <p className="text-muted-foreground">View all your assigned tasks organized by status</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/employee-duty-info'}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Duties
        </Button>
      </div>

      {/* Stats Grid - 3+2 Layout */}
      <div className="space-y-6">
        {/* First Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="stat-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
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
        </div>

        {/* Second Row - 2 Cards Centered */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-3xl mx-auto">
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
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6">
        {statuses.map(stat => {
          const active = selectedTab === stat.key;
          return (
            <Button
              key={stat.key}
              variant={active ? "default" : "outline"}
              onClick={() => setSelectedTab(stat.key)}
              className={active ? "" : "text-muted-foreground"}
            >
              <stat.icon className={`h-4 w-4 mr-2 ${active ? '' : stat.color}`} />
              {stat.label}
            </Button>
          );
        })}
      </div>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>{statuses.find(s => s.key === selectedTab)?.label} Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <div className="text-muted-foreground py-8 text-center">Loading...</div>}
          {!loading && filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No {statuses.find(s => s.key === selectedTab)?.label.toLowerCase()} tasks found.</p>
            </div>
          )}
          {!loading && paginatedTasks.map(task => (
            <div key={task.id} className="p-4 bg-muted/30 hover:bg-muted/40 transition-colors rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-foreground">{task.taskTitle}</h4>
                {task.priority === "High" && (
                  <Badge className="bg-destructive-soft text-destructive">High Priority</Badge>
                )}
                {isOverdue(task.dueDate) && task.status !== 'completed' && (
                  <Badge className="bg-destructive text-destructive-foreground">
                    <AlertCircle className="inline h-3 w-3 mr-1" /> Overdue
                  </Badge>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Shift: <span className="font-medium text-foreground">{task.shift}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Due: <span className={`font-medium ${isOverdue(task.dueDate) ? 'text-destructive' : 'text-foreground'}`}>{task.dueDate}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Status: <span className="font-medium text-foreground">{task.status.replace('-', ' ')}</span></span>
                </div>
              </div>
            </div>
          ))}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
