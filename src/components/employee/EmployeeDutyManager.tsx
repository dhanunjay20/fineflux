import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  Clock,
  Calendar,
  Plus,
  Edit,
  CheckCircle,
  AlertCircle,
  UserCheck,
  ClipboardList,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  dueDate: string;
  shift: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  shift: string;
  status: 'active' | 'on-leave' | 'inactive';
}

export function EmployeeDutyManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  const employees: Employee[] = [
    { id: '1', name: 'Arjun Patel', role: 'Pump Operator', shift: 'Morning', status: 'active' },
    { id: '2', name: 'Sunita Sharma', role: 'Cashier', shift: 'Morning', status: 'active' },
    { id: '3', name: 'Ravi Kumar', role: 'Supervisor', shift: 'Afternoon', status: 'active' },
    { id: '4', name: 'Maya Singh', role: 'Pump Operator', shift: 'Night', status: 'on-leave' },
    { id: '5', name: 'Deepak Yadav', role: 'Mechanic', shift: 'Morning', status: 'active' },
  ];

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Check fuel levels',
      description: 'Monitor and record fuel tank levels for all pumps',
      priority: 'high',
      status: 'pending',
      assignedTo: '1',
      dueDate: '2024-01-09',
      shift: 'Morning',
    },
    {
      id: '2',
      title: 'Clean pump area',
      description: 'Daily cleaning of pump stations and surrounding area',
      priority: 'medium',
      status: 'in-progress',
      assignedTo: '2',
      dueDate: '2024-01-09',
      shift: 'Morning',
    },
    {
      id: '3',
      title: 'Equipment maintenance',
      description: 'Routine check of pump equipment and report any issues',
      priority: 'high',
      status: 'completed',
      assignedTo: '5',
      dueDate: '2024-01-08',
      shift: 'Morning',
    },
  ]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    assignedTo: '',
    dueDate: '',
    shift: '',
  });

  const getEmployeeName = (employeeId: string) => {
    return employees.find(emp => emp.id === employeeId)?.name || 'Unknown';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-warning-soft text-warning',
      'in-progress': 'bg-primary-soft text-primary',
      completed: 'bg-success-soft text-success',
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'bg-destructive-soft text-destructive',
      medium: 'bg-warning-soft text-warning',
      low: 'bg-muted text-muted-foreground',
    };
    return <Badge className={variants[priority as keyof typeof variants]}>{priority}</Badge>;
  };

  const getEmployeeStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-success-soft text-success',
      'on-leave': 'bg-warning-soft text-warning',
      inactive: 'bg-muted text-muted-foreground',
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.assignedTo) return;

    const task: Task = {
      id: Date.now().toString(),
      ...newTask,
      status: 'pending',
    };

    setTasks([...tasks, task]);
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: '',
      dueDate: '',
      shift: '',
    });
    setIsDialogOpen(false);
  };

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const taskStats = [
    {
      title: 'Total Tasks',
      value: tasks.length.toString(),
      change: 'All time',
      icon: ClipboardList,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Pending',
      value: tasks.filter(t => t.status === 'pending').length.toString(),
      change: 'Need attention',
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      title: 'In Progress',
      value: tasks.filter(t => t.status === 'in-progress').length.toString(),
      change: 'Active work',
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Completed',
      value: tasks.filter(t => t.status === 'completed').length.toString(),
      change: 'Done today',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Duty Management</h1>
          <p className="text-muted-foreground">Assign tasks and manage employee shifts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Assign New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="shift">Shift</Label>
                  <Select value={newTask.shift} onValueChange={(value) => setNewTask({ ...newTask, shift: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Afternoon">Afternoon</SelectItem>
                      <SelectItem value="Night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select value={newTask.assignedTo} onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(emp => emp.status === 'active').map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} - {employee.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateTask} className="w-full btn-gradient-primary">
                Assign Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {taskStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className="space-y-1">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{employee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {employee.role} • {employee.shift}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  {getEmployeeStatusBadge(employee.status)}
                  <p className="text-xs text-muted-foreground">
                    {tasks.filter(t => t.assignedTo === employee.id && t.status !== 'completed').length} active tasks
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Tasks */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Task Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getEmployeeName(task.assignedTo)}</p>
                        <p className="text-sm text-muted-foreground">{task.shift} Shift</p>
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>{task.dueDate}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {task.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTaskStatus(task.id, 'in-progress')}
                          >
                            Start
                          </Button>
                        )}
                        {task.status === 'in-progress' && (
                          <Button
                            size="sm"
                            className="btn-gradient-success"
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}