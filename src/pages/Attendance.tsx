import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Timer,
  MapPin,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

export default function Attendance() {
  const todayAttendance = [
    { id: 'EMP001', name: 'Priya Singh', role: 'Manager',  checkIn: '08:45 AM', checkOut: null, shift: 'Morning (8:00 AM - 4:00 PM)', status: 'present', location: 'Main Office',   hoursWorked: '5.5' },
    { id: 'EMP002', name: 'Arjun Patel', role: 'Cashier',  checkIn: '08:30 AM', checkOut: null, shift: 'Morning (8:00 AM - 4:00 PM)', status: 'present', location: 'Counter 1',   hoursWorked: '6.0' },
    { id: 'EMP003', name: 'Sunita Sharma', role: 'Attendant', checkIn: '12:15 PM', checkOut: null, shift: 'Afternoon (12:00 PM - 8:00 PM)', status: 'present', location: 'Pump Station', hoursWorked: '2.0' },
    { id: 'EMP004', name: 'Ravi Kumar', role: 'Mechanic', checkIn: null, checkOut: null, shift: 'Morning (8:00 AM - 4:00 PM)', status: 'absent', location: null, hoursWorked: '0' },
  ];

  const weeklyStats = [
    { title: 'Present Today',   value: todayAttendance.filter(emp => emp.status === 'present').length.toString(), change: `${todayAttendance.length} total employees`, icon: CheckCircle, color: 'text-success',     bgColor: 'bg-success-soft' },
    { title: 'Absent Today',    value: todayAttendance.filter(emp => emp.status === 'absent').length.toString(),  change: 'Unplanned absence',                      icon: XCircle,      color: 'text-destructive', bgColor: 'bg-destructive-soft' },
    { title: 'Average Hours',   value: '7.8', change: 'This week', icon: Timer,       color: 'text-primary',  bgColor: 'bg-primary-soft' },
    { title: 'Attendance Rate', value: '94.2%', change: '+2.1% vs last week', icon: TrendingUp, color: 'text-success', bgColor: 'bg-success-soft' },
  ];

  const recentActivity = [
    { employee: 'Sunita Sharma', action: 'Check In',  time: '12:15 PM', location: 'Pump Station' },
    { employee: 'Arjun Patel',   action: 'Check In',  time: '08:30 AM', location: 'Counter 1' },
    { employee: 'Priya Singh',   action: 'Check In',  time: '08:45 AM', location: 'Main Office' },
    { employee: 'Maya Singh',    action: 'Check Out', time: '08:00 PM', location: 'Cleaning Area' },
  ];

  const getUserInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const getStatusBadge = (status: string) => {
    if (status === 'present') {
      return (
        <Badge className="bg-success-soft text-success">
          <CheckCircle className="mr-1 h-3 w-3" />
          Present
        </Badge>
      );
    }
    return (
      <Badge className="bg-destructive-soft text-destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Absent
      </Badge>
    );
  };

  const formatShift = (shift: string) => shift.split('(')[0].trim();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground leading-tight">Attendance Tracking</h1>
          <p className="text-muted-foreground">Monitor employee attendance and working hours</p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Button variant="outline" className="w-full">
            <Calendar className="mr-2 h-4 w-4" />
            View Calendar
          </Button>
          <Button className="btn-gradient-primary w-full">
            <Clock className="mr-2 h-4 w-4" />
            Mark Attendance
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
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <Button className="w-full btn-gradient-success">
              <CheckCircle className="mr-2 h-4 w-4" />
              Check In
            </Button>
            <Button className="w-full btn-gradient-warning">
              <XCircle className="mr-2 h-4 w-4" />
              Check Out
            </Button>
            <Button className="w-full btn-gradient-accent">
              <Timer className="mr-2 h-4 w-4" />
              Break Time
            </Button>
            <Button className="w-full" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              View My Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        activity.action === 'Check In' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                      }`}
                    >
                      {activity.action === 'Check In' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{activity.employee}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.action} at {activity.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-medium text-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Today&apos;s Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {todayAttendance.map((employee) => (
              <div
                key={employee.id}
                className="p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: identity */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getUserInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{employee.name}</h3>
                        <Badge className="bg-accent-soft text-accent">{employee.role}</Badge>
                        {getStatusBadge(employee.status)}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">ID: {employee.id}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{formatShift(employee.shift)}</p>
                      {employee.location && (
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{employee.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: times */}
                  <div className="sm:text-right space-y-1">
                    {employee.status === 'present' ? (
                      <>
                        <p className="font-medium text-success">
                          Check In: {employee.checkIn}
                        </p>
                        {employee.checkOut ? (
                          <p className="font-medium text-warning">
                            Check Out: {employee.checkOut}
                          </p>
                        ) : (
                          <p className="text-xs sm:text-sm text-muted-foreground">Still working</p>
                        )}
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Hours: {employee.hoursWorked}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Not checked in</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
