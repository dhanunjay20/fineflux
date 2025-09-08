import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Calendar,
  DollarSign,
  CheckCircle,
  User,
  FileText,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function EmployeeDashboard() {
  const { user } = useAuth();

  const todayStats = [
    {
      title: 'Shift Status',
      value: 'Active',
      change: 'Started 08:00 AM',
      icon: Clock,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Hours Today',
      value: '6.5h',
      change: '1.5h remaining',
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'This Month',
      value: '162h',
      change: 'Target: 180h',
      icon: Calendar,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Performance',
      value: '92%',
      change: 'Above average',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
  ];

  const recentShifts = [
    { date: '2024-01-08', shift: 'Morning', hours: '8h', status: 'completed' },
    { date: '2024-01-07', shift: 'Morning', hours: '8h', status: 'completed' },
    { date: '2024-01-06', shift: 'Afternoon', hours: '8h', status: 'completed' },
    { date: '2024-01-05', shift: 'Morning', hours: '7.5h', status: 'completed' },
  ];

  const upcomingShifts = [
    { date: '2024-01-09', shift: 'Morning', time: '08:00 AM - 04:00 PM' },
    { date: '2024-01-10', shift: 'Morning', time: '08:00 AM - 04:00 PM' },
    { date: '2024-01-11', shift: 'Afternoon', time: '02:00 PM - 10:00 PM' },
    { date: '2024-01-12', shift: 'Morning', time: '08:00 AM - 04:00 PM' },
  ];

  const salaryInfo = {
    currentMonth: {
      basic: 25000,
      overtime: 3500,
      incentives: 2000,
      deductions: 1200,
      net: 29300,
    },
    lastPaid: '2023-12-31',
    nextPayday: '2024-01-31',
  };

  const todayTasks = [
    { id: 1, task: 'Check tank levels', completed: true, time: '08:30 AM' },
    { id: 2, task: 'Record morning sales', completed: true, time: '12:00 PM' },
    { id: 3, task: 'Customer service training', completed: false, time: '02:00 PM' },
    { id: 4, task: 'End of shift report', completed: false, time: '04:00 PM' },
  ];

  const getShiftStatusBadge = (status: string) => {
    return status === 'completed' ? (
      <Badge className="bg-success-soft text-success">Completed</Badge>
    ) : (
      <Badge className="bg-warning-soft text-warning">Pending</Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">Track your shifts, attendance, and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <User className="mr-2 h-4 w-4" />
            My Profile
          </Button>
          <Button className="btn-gradient-success">
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {todayStats.map((stat) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Today's Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  task.completed 
                    ? 'bg-success border-success' 
                    : 'border-muted-foreground'
                }`}>
                  {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p className={`font-medium ${
                    task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}>
                    {task.task}
                  </p>
                  <p className="text-sm text-muted-foreground">{task.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Salary Information */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic Salary</span>
                <span className="font-medium">₹{salaryInfo.currentMonth.basic.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overtime</span>
                <span className="font-medium text-success">₹{salaryInfo.currentMonth.overtime.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Incentives</span>
                <span className="font-medium text-accent">₹{salaryInfo.currentMonth.incentives.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deductions</span>
                <span className="font-medium text-destructive">₹{salaryInfo.currentMonth.deductions.toLocaleString()}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Net Salary</span>
                <span className="text-primary">₹{salaryInfo.currentMonth.net.toLocaleString()}</span>
              </div>
            </div>
            <div className="pt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Last paid: {salaryInfo.lastPaid}
              </p>
              <p className="text-sm text-muted-foreground">
                Next payday: {salaryInfo.nextPayday}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shifts */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Shifts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentShifts.map((shift, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{shift.date}</p>
                  <p className="text-sm text-muted-foreground">{shift.shift} Shift</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold text-foreground">{shift.hours}</p>
                  {getShiftStatusBadge(shift.status)}
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              View All Shifts
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Shifts */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Shifts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingShifts.map((shift, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{shift.date}</p>
                  <p className="text-sm text-muted-foreground">{shift.shift} Shift</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{shift.time}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              View Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}