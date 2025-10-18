import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Timer, CheckCircle, AlertCircle, FileText, ChevronLeft, ChevronRight, 
  History, Clock, Calendar, Activity, Play, Fuel, MapPin, Target
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';
const ITEMS_PER_PAGE = 5;

export default function EmployeeDutyInfo() {
  const orgId = localStorage.getItem('organizationId') || '';
  const empId = localStorage.getItem('empId') || '';

  const [duties, setDuties] = useState<any[]>([]);
  const [dailyDuties, setDailyDuties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [pendingPage, setPendingPage] = useState(0);
  const [inProgressPage, setInProgressPage] = useState(0);
  const [completedPage, setCompletedPage] = useState(0);
  const [dailyDutyPage, setDailyDutyPage] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch special tasks
  useEffect(() => {
    if (!orgId || !empId) return;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        // Fetch special tasks
        const tasksRes = await axios.get(
          `${API_BASE}/api/organizations/${orgId}/tasks/employee/${empId}?status=`
        );
        setDuties(tasksRes.data || []);

        // Fetch daily duties by employee ID
        const dutiesRes = await axios.get(
          `${API_BASE}/api/organizations/${orgId}/employee-duties/employee/${empId}`
        );
        setDailyDuties(dutiesRes.data || []);
      } catch (error) {
        console.error('Error fetching duties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, empId]);

  const stats = useMemo(() => {
    let pending = 0, inProgress = 0, completed = 0, overdue = 0;
    
    // Count special tasks
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

    // Count daily duties by status
    const scheduledDuties = dailyDuties.filter(d => d.status === 'SCHEDULED').length;
    const activeDuties = dailyDuties.filter(d => d.status === 'ACTIVE').length;
    const completedDuties = dailyDuties.filter(d => d.status === 'COMPLETED').length;

    return { 
      pending, 
      inProgress, 
      completed, 
      overdue, 
      total: duties.length,
      dailyTotal: dailyDuties.length,
      dailyScheduled: scheduledDuties,
      dailyActive: activeDuties,
      dailyCompleted: completedDuties
    };
  }, [duties, dailyDuties]);

  const pendingDuties = duties.filter(d => d.status === 'pending');
  const inProgressDuties = duties.filter(d => d.status === 'in-progress');
  const completedDuties = duties.filter(d => d.status === 'completed');
  const scheduledDailyDuties = dailyDuties.filter(d => d.status === 'SCHEDULED' || !d.status);

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
    await axios.put(
      `${API_BASE}/api/organizations/${orgId}/tasks/${taskId}/status?status=${encodeURIComponent(newStatus)}`
    );
    setDuties(ds => ds.map(d => (d.id === taskId ? { ...d, status: newStatus } : d)));
  };

  const handleDailyDutyAction = async (dutyId: string, newStatus: string) => {
    try {
      await axios.put(
        `${API_BASE}/api/organizations/${orgId}/employee-duties/${dutyId}`,
        { status: newStatus }
      );
      setDailyDuties(ds => ds.map(d => (d.id === dutyId ? { ...d, status: newStatus } : d)));
    } catch (error) {
      console.error('Error updating daily duty:', error);
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

  const renderTaskCard = (duty: any, showActions = false) => (
    <div 
      key={duty.id} 
      className="p-5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-300 hover:shadow-md group space-y-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
              {duty.taskTitle}
            </h4>
            {duty.priority === 'High' && (
              <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                High Priority
              </Badge>
            )}
            {isOverdue(duty.dueDate) && duty.status !== 'completed' && (
              <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                <AlertCircle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>

          {duty.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{duty.description}</p>
          )}

          <div className="flex items-center gap-4 flex-wrap text-sm pt-2 border-t border-border/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-accent/10">
                <Clock className="h-3.5 w-3.5 text-accent" />
              </div>
              <span className="text-muted-foreground">Shift:</span>
              <span className="font-medium text-foreground">{duty.shift}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${isOverdue(duty.dueDate) ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                <Calendar className={`h-3.5 w-3.5 ${isOverdue(duty.dueDate) ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
              <span className="text-muted-foreground">Due:</span>
              <span className={`font-medium ${isOverdue(duty.dueDate) ? 'text-destructive' : 'text-foreground'}`}>
                {duty.dueDate}
              </span>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex flex-col gap-2 shrink-0">
            {duty.status === 'pending' && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-300"
                onClick={() => handleTaskAction(duty.id, 'in-progress')}
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            {duty.status === 'in-progress' && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
                onClick={() => handleTaskAction(duty.id, 'completed')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
          </div>
        )}
        
        {duty.status === 'completed' && (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 shrink-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )}
      </div>
    </div>
  );

  const renderDailyDutyCard = (duty: any) => (
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
            <Badge 
              className={
                duty.status === 'COMPLETED' 
                  ? 'bg-green-500/10 text-green-700 border-green-500/20'
                  : duty.status === 'ACTIVE'
                  ? 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                  : 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
              }
            >
              {duty.status || 'SCHEDULED'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{duty.dutyDate}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="text-muted-foreground">Product:</span>
              <span className="font-medium">{duty.productId}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-muted-foreground">Shift:</span>
              <span className="font-medium">{duty.shiftStart} - {duty.shiftEnd}</span>
            </div>

            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Hours:</span>
              <span className="font-medium">{duty.totalHours || calculateHours(duty.shiftStart, duty.shiftEnd)}h</span>
            </div>

            {duty.gunIds && duty.gunIds.length > 0 && (
              <div className="flex items-center gap-2 col-span-2">
                <Fuel className="h-4 w-4 text-red-600" />
                <span className="text-muted-foreground">Guns:</span>
                <span className="font-medium">{duty.gunIds.length} assigned</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {duty.status === 'SCHEDULED' && (
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
              onClick={() => handleDailyDutyAction(duty.id, 'ACTIVE')}
            >
              <Play className="h-4 w-4 mr-1" />
              Start Duty
            </Button>
          )}
          {duty.status === 'ACTIVE' && (
            <Button
              size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
              onClick={() => handleDailyDutyAction(duty.id, 'COMPLETED')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderPagination = (total: number, page: number, setPage: (p: number) => void) => {
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(0, page - 1))}
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
          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
          disabled={page === totalPages - 1}
          className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  };

  return (
    <div className={`space-y-6 -mt-6 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.5s ease-out forwards;
        }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 opacity-0 animate-slide-in">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            My Duties
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Manage your assigned tasks and track progress
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
          onClick={() => window.location.href = '/employee-task-history'}
        >
          <History className="mr-2 h-4 w-4" />
          View History
        </Button>
      </div>

      {/* Stats Grid - Extended with Daily Duties */}
           {/* Stats Grid - 4 Cards in a Row */}
      <div className="space-y-6">
        {/* First Row - Special Tasks Stats (4 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>

        {/* Second Row - Daily Duties & Overdue (4 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                  <p className="text-2xl font-bold text-foreground">{stats.dailyScheduled}</p>
                </div>
                <div className="bg-yellow-500/10 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Active Duties</p>
                  <p className="text-2xl font-bold text-foreground">{stats.dailyActive}</p>
                </div>
                <div className="bg-purple-500/10 p-3 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
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

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading duties...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && duties.length === 0 && dailyDuties.length === 0 && (
        <Card className="card-gradient border-border/50 opacity-0 animate-slide-in stagger-1">
          <CardContent className="p-16 text-center">
            <div className="p-4 rounded-full bg-muted inline-flex mb-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No duties assigned yet</h3>
            <p className="text-muted-foreground">Your tasks will appear here when assigned by your manager.</p>
          </CardContent>
        </Card>
      )}

      {/* Daily Duties Section */}
      {!loading && scheduledDailyDuties.length > 0 && (
        <Card className="border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 opacity-0 animate-slide-in stagger-1">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Fuel className="h-5 w-5 text-blue-600" />
              </div>
              Daily Pump Duties
              <Badge variant="secondary" className="ml-auto">{scheduledDailyDuties.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {paginateDuties(scheduledDailyDuties, dailyDutyPage).map(duty => renderDailyDutyCard(duty))}
            {renderPagination(scheduledDailyDuties.length, dailyDutyPage, setDailyDutyPage)}
          </CardContent>
        </Card>
      )}

      {/* Pending Tasks */}
      {!loading && pendingDuties.length > 0 && (
        <Card className="border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 opacity-0 animate-slide-in stagger-2">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 dark:from-orange-950/20 dark:to-yellow-950/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Timer className="h-5 w-5 text-warning" />
              </div>
              Pending Special Tasks
              <Badge variant="secondary" className="ml-auto">{pendingDuties.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {paginateDuties(pendingDuties, pendingPage).map(duty => renderTaskCard(duty, true))}
            {renderPagination(pendingDuties.length, pendingPage, setPendingPage)}
          </CardContent>
        </Card>
      )}

      {/* In Progress Tasks */}
      {!loading && inProgressDuties.length > 0 && (
        <Card className="border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 opacity-0 animate-slide-in stagger-3">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              In Progress Special Tasks
              <Badge variant="secondary" className="ml-auto">{inProgressDuties.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {paginateDuties(inProgressDuties, inProgressPage).map(duty => renderTaskCard(duty, true))}
            {renderPagination(inProgressDuties.length, inProgressPage, setInProgressPage)}
          </CardContent>
        </Card>
      )}

      {/* Completed Tasks */}
      {!loading && completedDuties.length > 0 && (
        <Card className="border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 opacity-0 animate-slide-in stagger-4">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              Completed Tasks
              <Badge variant="secondary" className="ml-auto">{completedDuties.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {paginateDuties(completedDuties, completedPage).map(duty => renderTaskCard(duty, false))}
            {renderPagination(completedDuties.length, completedPage, setCompletedPage)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
