import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timer, CheckCircle, AlertCircle, FileText, ChevronLeft, ChevronRight, History, Clock, Calendar } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';
const ITEMS_PER_PAGE = 5;

export default function EmployeeDutyInfo() {
  const orgId = localStorage.getItem('organizationId') || '';
  const empId = localStorage.getItem('empId') || '';

  const [duties, setDuties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingPage, setPendingPage] = useState(0);
  const [inProgressPage, setInProgressPage] = useState(0);
  const [completedPage, setCompletedPage] = useState(0);

  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=`)
      .then((res) => setDuties(res.data || []))
      .finally(() => setLoading(false));
  }, [orgId, empId]);

  const stats = useMemo(() => {
    let pending = 0, inProgress = 0, completed = 0, overdue = 0;
    for (const d of duties) {
      if (d.status === 'pending') pending++;
      if (d.status === 'in-progress') inProgress++;
      if (d.status === 'completed') completed++;
      if (
        d.status !== 'completed' &&
        d.dueDate &&
        new Date(d.dueDate) < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
      ) {
        overdue++;
      }
    }
    return { pending, inProgress, completed, overdue, total: duties.length };
  }, [duties]);

  const pendingDuties = duties.filter(d => d.status === 'pending');
  const inProgressDuties = duties.filter(d => d.status === 'in-progress');
  const completedDuties = duties.filter(d => d.status === 'completed');

  const paginateDuties = (list: any[], page: number) => {
    const start = page * ITEMS_PER_PAGE;
    return list.slice(start, start + ITEMS_PER_PAGE);
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const handleTaskAction = async (taskId: string, newStatus: string) => {
    await axios.put(`${API_BASE}/api/organizations/${orgId}/tasks/${taskId}/status?status=${encodeURIComponent(newStatus)}`);
    setDuties(ds => ds.map(d => (d.id === taskId ? { ...d, status: newStatus } : d)));
  };

  const renderTaskCard = (duty: any, showActions = false) => (
    <div key={duty.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors border border-border/50">
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-foreground text-base">{duty.taskTitle}</h4>
          {duty.priority === 'High' && (
            <Badge className="bg-destructive-soft text-destructive">High Priority</Badge>
          )}
          {isOverdue(duty.dueDate) && duty.status !== 'completed' && (
            <Badge className="bg-destructive text-destructive-foreground animate-pulse">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              Overdue
            </Badge>
          )}
        </div>

        {duty.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{duty.description}</p>
        )}

        <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Shift: <span className="font-medium text-foreground">{duty.shift}</span></span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Due: <span className={`font-medium ${isOverdue(duty.dueDate) ? 'text-destructive' : 'text-foreground'}`}>{duty.dueDate}</span></span>
          </div>
          {duty.assignedToName && (
            <div className="flex items-center gap-1">
              <span>By: <span className="font-medium text-foreground">{duty.assignedToName}</span></span>
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2 ml-4">
          {duty.status === 'pending' && (
            <Button
              size="sm"
              className="btn-gradient-primary shrink-0"
              onClick={() => handleTaskAction(duty.id, 'in-progress')}
            >
              Start Task
            </Button>
          )}
          {duty.status === 'in-progress' && (
            <Button
              size="sm"
              className="btn-gradient-success shrink-0"
              onClick={() => handleTaskAction(duty.id, 'completed')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
        </div>
      )}
      
      {duty.status === 'completed' && (
        <Badge className="bg-success-soft text-success ml-4 shrink-0">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )}
    </div>
  );

  const renderPagination = (total: number, page: number, setPage: (p: number) => void) => {
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    return (
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
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Duties</h1>
          <p className="text-muted-foreground">Manage your assigned tasks and track progress</p>
        </div>
        <Button
          className="btn-gradient-primary"
          onClick={() => window.location.href = '/employee-task-history'}
        >
          <History className="mr-2 h-4 w-4" />
          View History
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

      {loading && <div className="text-center text-muted-foreground py-8">Loading duties...</div>}
      {!loading && duties.length === 0 && (
        <Card className="card-gradient">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No duties/tasks assigned yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Pending Tasks */}
      {!loading && pendingDuties.length > 0 && (
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-warning" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paginateDuties(pendingDuties, pendingPage).map(duty => renderTaskCard(duty, true))}
            {renderPagination(pendingDuties.length, pendingPage, setPendingPage)}
          </CardContent>
        </Card>
      )}

      {/* In Progress Tasks */}
      {!loading && inProgressDuties.length > 0 && (
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              In Progress Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paginateDuties(inProgressDuties, inProgressPage).map(duty => renderTaskCard(duty, true))}
            {renderPagination(inProgressDuties.length, inProgressPage, setInProgressPage)}
          </CardContent>
        </Card>
      )}

      {/* Completed Tasks */}
      {!loading && completedDuties.length > 0 && (
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Completed Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paginateDuties(completedDuties, completedPage).map(duty => renderTaskCard(duty, false))}
            {renderPagination(completedDuties.length, completedPage, setCompletedPage)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
