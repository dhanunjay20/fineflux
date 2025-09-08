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
    {
      id: 'EMP001',
      name: 'Priya Singh',
      role: 'Manager',
      checkIn: '08:45 AM',
      checkOut: null,
      shift: 'Morning (8:00 AM - 4:00 PM)',
      status: 'present',
      location: 'Main Office',
      hoursWorked: '5.5',
    },
    {
      id: 'EMP002',
      name: 'Arjun Patel',
      role: 'Cashier',
      checkIn: '08:30 AM',
      checkOut: null,
      shift: 'Morning (8:00 AM - 4:00 PM)',
      status: 'present',
      location: 'Counter 1',
      hoursWorked: '6.0',
    },
    {
      id: 'EMP003',
      name: 'Sunita Sharma',
      role: 'Attendant',
      checkIn: '12:15 PM',
      checkOut: null,
      shift: 'Afternoon (12:00 PM - 8:00 PM)',
      status: 'present',
      location: 'Pump Station',
      hoursWorked: '2.0',
    },
    {
      id: 'EMP004',
      name: 'Ravi Kumar',
      role: 'Mechanic',
      checkIn: null,
      checkOut: null,
      shift: 'Morning (8:00 AM - 4:00 PM)',
      status: 'absent',
      location: null,
      hoursWorked: '0',
    },
  ];

  const weeklyStats = [
    {
      title: 'Present Today',
      value: todayAttendance.filter(emp => emp.status === 'present').length.toString(),
      change: `${todayAttendance.length} total employees`,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Absent Today',
      value: todayAttendance.filter(emp => emp.status === 'absent').length.toString(),
      change: 'Unplanned absence',
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive-soft',
    },
    {
      title: 'Average Hours',
      value: '7.8',
      change: 'This week',
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Attendance Rate',
      value: '94.2%',
      change: '+2.1% vs last week',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
  ];

  const recentActivity = [
    { employee: 'Sunita Sharma', action: 'Check In', time: '12:15 PM', location: 'Pump Station' },
    { employee: 'Arjun Patel', action: 'Check In', time: '08:30 AM', location: 'Counter 1' },
    { employee: 'Priya Singh', action: 'Check In', time: '08:45 AM', location: 'Main Office' },
    { employee: 'Maya Singh', action: 'Check Out', time: '08:00 PM', location: 'Cleaning Area' },
  ];

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

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

  const formatShift = (shift: string) => {
    return shift.split('(')[0].trim();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance Tracking</h1>
          <p className="text-muted-foreground">Monitor employee attendance and working hours</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            View Calendar
          </Button>
          <Button className="btn-gradient-primary">
            <Clock className="mr-2 h-4 w-4" />
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {weeklyStats.map((stat) => {
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
        {/* Quick Actions */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      activity.action === 'Check In' 
                        ? 'bg-success-soft text-success' 
                        : 'bg-warning-soft text-warning'
                    }`}>
                      {activity.action === 'Check In' ? 
                        <CheckCircle className="h-4 w-4" /> : 
                        <XCircle className="h-4 w-4" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{activity.employee}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.action} at {activity.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
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
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayAttendance.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getUserInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{employee.name}</h3>
                      <Badge className="bg-accent-soft text-accent">{employee.role}</Badge>
                      {getStatusBadge(employee.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">ID: {employee.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatShift(employee.shift)}
                    </p>
                    {employee.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {employee.location}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  {employee.status === 'present' ? (
                    <>
                      <p className="font-medium text-success">Check In: {employee.checkIn}</p>
                      {employee.checkOut ? (
                        <p className="font-medium text-warning">Check Out: {employee.checkOut}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Still working</p>
                      )}
                      <p className="text-sm text-muted-foreground">
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}