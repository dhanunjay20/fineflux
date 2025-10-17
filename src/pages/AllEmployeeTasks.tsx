import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // Add this import
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Timer, User, AlertTriangle, Clock, Calendar, ChevronLeft, ChevronRight, Users, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';
const ITEMS_PER_PAGE = 8;

export default function AllEmployeeTasks() {
  const navigate = useNavigate(); // Add this hook
  const orgId = localStorage.getItem('organizationId') || '';
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    axios.get(`${API_BASE}/api/organizations/${orgId}/tasks`)
      .then(res => setTasks(res.data || []))
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
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Employee Tasks</h1>
          <p className="text-muted-foreground">View and manage tasks for all employees in your organization</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/employee-set-duty')} // Use navigate instead
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Set Duty
        </Button>
      </div>

      {/* Stats Grid - 3 cards per row */}
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

      {/* Tasks Grid (Cards) */}
      {loading && (
        <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
      )}
      
      {!loading && filteredTasks.length === 0 && (
        <Card className="card-gradient">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No {statuses.find(s => s.key === selectedTab)?.label.toLowerCase()} tasks found.</p>
          </CardContent>
        </Card>
      )}

      {!loading && paginatedTasks.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedTasks.map(task => (
              <Card key={task.id} className="card-gradient hover-lift">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{task.taskTitle}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.priority === "High" && (
                          <Badge className="bg-destructive-soft text-destructive">High Priority</Badge>
                        )}
                        {isOverdue(task.dueDate) && task.status !== 'completed' && (
                          <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                            <AlertTriangle className="inline h-3 w-3 mr-1" /> Overdue
                          </Badge>
                        )}
                        <Badge className="bg-muted text-muted-foreground">
                          {task.status.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                  )}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assigned to:</span>
                      <span className="font-medium text-foreground">{task.assignedToName || task.assignedToEmpId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Shift:</span>
                      <span className="font-medium text-foreground">{task.shift}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className={`font-medium ${isOverdue(task.dueDate) ? 'text-destructive' : 'text-foreground'}`}>
                        {task.dueDate}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
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
        </>
      )}
    </div>
  );
}
