import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Timer, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import React from "react";

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
    { key: 'pending', label: 'Pending', color: 'text-warning', bgColor: 'bg-yellow-500', icon: Timer },
    { key: 'in-progress', label: 'In Progress', color: 'text-primary', bgColor: 'bg-blue-500', icon: FileText },
    { key: 'completed', label: 'Completed', color: 'text-success', bgColor: 'bg-green-500', icon: CheckCircle },
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
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Task History</h1>
          <p className="text-muted-foreground">View all your assigned tasks organized by status</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/employee-duty-info'}
          className="shadow-sm hover:shadow-md transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Duties
        </Button>
      </motion.div>

      {/* Stats Cards - Original Design with 3+2 Layout */}
      <div className="space-y-6">
        {/* First Row - 3 Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <Card className="hover:shadow-lg transition-all">
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
          <Card className="hover:shadow-lg transition-all">
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
          <Card className="hover:shadow-lg transition-all">
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
        </motion.div>

        {/* Second Row - 2 Cards Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-3xl mx-auto"
        >
          <Card className="hover:shadow-lg transition-all">
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
          <Card className="hover:shadow-lg transition-all">
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
        </motion.div>
      </div>

      {/* Modern Tab Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-3 p-1 bg-muted/30 rounded-xl border shadow-sm"
      >
        {statuses.map(stat => {
          const active = selectedTab === stat.key;
          return (
            <Button
              key={stat.key}
              variant={active ? "default" : "ghost"}
              onClick={() => setSelectedTab(stat.key)}
              className={`flex-1 transition-all duration-300 ${
                active ? 'shadow-md' : ''
              }`}
            >
              <div className={`p-1.5 rounded-lg mr-2 ${active ? 'bg-white/20 dark:bg-slate-800/50' : 'bg-muted'}`}>
                <stat.icon className={`h-4 w-4 ${active ? '' : stat.color}`} />
              </div>
              <span className={active ? 'font-semibold' : ''}>{stat.label}</span>
              <Badge 
                variant={active ? "secondary" : "outline"}
                className={`ml-2 ${active ? '' : ''}`}
              >
                {stat.key === 'pending' && stats.pending}
                {stat.key === 'in-progress' && stats.inProgress}
                {stat.key === 'completed' && stats.completed}
              </Badge>
            </Button>
          );
        })}
      </motion.div>

      {/* Modern Task Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                {statuses.find(s => s.key === selectedTab)?.icon && 
                  React.createElement(statuses.find(s => s.key === selectedTab)!.icon, { className: "h-5 w-5" })
                }
              </div>
              {statuses.find(s => s.key === selectedTab)?.label} Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading tasks...</p>
                </motion.div>
              )}

              {!loading && filteredTasks.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center py-12"
                >
                  <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Tasks Found</h3>
                  <p className="text-muted-foreground">
                    You don't have any {statuses.find(s => s.key === selectedTab)?.label.toLowerCase()} tasks at the moment.
                  </p>
                </motion.div>
              )}

              {!loading && filteredTasks.length > 0 && (
                <div className="space-y-4">
                  {paginatedTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative p-5 rounded-xl bg-muted/30 border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all duration-300"
                    >
                      {/* Colored Left Border Indicator */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
                        selectedTab === 'pending' ? 'bg-yellow-500' :
                        selectedTab === 'in-progress' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`} />

                      <div className="space-y-3 ml-3">
                        {/* Task Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-lg text-foreground">{task.taskTitle}</h4>
                              {task.priority === "High" && (
                                <Badge className="bg-destructive text-destructive-foreground shadow-md">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  High Priority
                                </Badge>
                              )}
                              {isOverdue(task.dueDate) && task.status !== 'completed' && (
                                <Badge className="bg-orange-500 text-white shadow-md animate-pulse">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Task Metadata */}
                        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Shift:</span>
                            <span className="text-sm font-semibold text-foreground">{task.shift}</span>
                          </div>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                            isOverdue(task.dueDate) ? 'bg-destructive/10' : 'bg-muted'
                          }`}>
                            <Calendar className={`h-4 w-4 ${
                              isOverdue(task.dueDate) ? 'text-destructive' : 'text-muted-foreground'
                            }`} />
                            <span className="text-sm text-muted-foreground">Due:</span>
                            <span className={`text-sm font-semibold ${
                              isOverdue(task.dueDate) ? 'text-destructive' : 'text-foreground'
                            }`}>
                              {task.dueDate}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                            <div className={`h-2 w-2 rounded-full ${
                              selectedTab === 'pending' ? 'bg-yellow-500 animate-pulse' :
                              selectedTab === 'in-progress' ? 'bg-blue-500 animate-pulse' :
                              'bg-green-500'
                            }`} />
                            <span className="text-sm font-semibold text-foreground capitalize">
                              {task.status.replace('-', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* Modern Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-between mt-6 pt-6 border-t border-border"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="hover:bg-muted transition-all"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                        className={`w-10 h-10 ${
                          page === pageNum ? 'shadow-md' : 'hover:bg-muted'
                        }`}
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
                  className="hover:bg-muted transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
