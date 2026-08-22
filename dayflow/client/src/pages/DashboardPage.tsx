import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Calendar, DollarSign, Bell, ArrowRight, CheckCircle2,
  AlertCircle, User, Building2, TrendingUp, Users, FileText,
  Coffee, Search, Plane, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import { leaveService } from '../services/leaveService';
import { payrollService } from '../services/payrollService';
import { notificationService } from '../services/notificationService';
import { analyticsService } from '../services/analyticsService';
import { Card, Badge, Button, Skeleton, Input } from '../components/ui';
import type { Attendance, LeaveRequest, Payroll, Notification, DashboardKPIs, Employee } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Employee Dashboard
const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const fullName = user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email || 'User';
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchData = async () => {
    try {
      const [att, leavesRes, payrollRes, notifRes] = await Promise.allSettled([
        attendanceService.getTodayAttendance(),
        leaveService.getMyLeaves({ page: 1, limit: 5 }),
        payrollService.getMyPayroll({ page: 1, limit: 1 }),
        notificationService.getNotifications({ page: 1, limit: 5 }),
      ]);

      if (att.status === 'fulfilled') setAttendance(att.value);
      if (leavesRes.status === 'fulfilled') setLeaves(leavesRes.value.leaves || []);
      if (payrollRes.status === 'fulfilled') setPayroll(payrollRes.value.payroll?.[0] || null);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.notifications || []);
    } catch { /* handled */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.checkIn();
      setAttendance(record);
      toast.success('Checked in successfully!');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-in failed');
    } finally { setActionLoading(false); }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.startBreak();
      setAttendance(record);
      toast.success('Break started ☕');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start break');
    } finally { setActionLoading(false); }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.endBreak();
      setAttendance(record);
      toast.success('Break ended! Welcome back.');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to end break');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.checkOut();
      setAttendance(record);
      toast.success(`Checked out! Worked ${record.working_hours}h today.`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-out failed');
    } finally { setActionLoading(false); }
  };

  const pendingLeaves = leaves.filter((l: LeaveRequest) => l.status === 'PENDING').length;
  const unreadNotifications = notifications.filter((n: Notification) => !n.is_read).length;
  const isOnBreak = !!(attendance?.break_start && !attendance?.break_end);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{greeting()}, {fullName.split(' ')[0]}! 👋</h1>
          <p className="text-slate-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Badge variant="blue" className="text-sm px-3 py-1">{user?.role}</Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            {attendance?.status && (
              <Badge variant={attendance.status === 'PRESENT' ? 'green' : attendance.status === 'HALF_DAY' ? 'yellow' : 'slate'}>
                {isOnBreak ? 'ON BREAK' : attendance.status}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Today's Work Tracker</p>
          {isLoading ? <Skeleton className="h-5 w-24" /> : (
            <div className="space-y-1">
              <p className="text-sm text-slate-700">
                {attendance?.check_in
                  ? `In: ${format(new Date(attendance.check_in), 'hh:mm a')}`
                  : 'Not checked in'}
              </p>
              {attendance?.check_out && (
                <p className="text-sm text-slate-700">
                  Out: {format(new Date(attendance.check_out), 'hh:mm a')}
                </p>
              )}
              {attendance?.break_duration ? (
                <p className="text-xs text-amber-600">Break: {attendance.break_duration}h</p>
              ) : null}
              {attendance?.working_hours ? (
                <p className="text-xs text-slate-500">Net: {attendance.working_hours}h worked</p>
              ) : null}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {!attendance?.check_in && (
              <Button id="dashboard-check-in" size="sm" isLoading={actionLoading} onClick={handleCheckIn}>
                Check In
              </Button>
            )}

            {attendance?.check_in && !attendance?.check_out && (
              <>
                {!isOnBreak ? (
                  <Button
                    id="dashboard-start-break"
                    size="sm"
                    variant="outline"
                    leftIcon={<Coffee className="w-3.5 h-3.5 text-amber-500" />}
                    isLoading={actionLoading}
                    onClick={handleStartBreak}
                  >
                    Start Break
                  </Button>
                ) : (
                  <Button
                    id="dashboard-end-break"
                    size="sm"
                    variant="success"
                    isLoading={actionLoading}
                    onClick={handleEndBreak}
                  >
                    End Break
                  </Button>
                )}
                <Button
                  id="dashboard-check-out"
                  size="sm"
                  variant="secondary"
                  isLoading={actionLoading}
                  onClick={handleCheckOut}
                >
                  Check Out
                </Button>
              </>
            )}

            {attendance?.check_out && (
              <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Shift Completed
              </span>
            )}
          </div>
        </Card>

        {/* Time Off Card */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            {pendingLeaves > 0 && <Badge variant="yellow">{pendingLeaves} Pending</Badge>}
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Time Off Requests</p>
          {isLoading ? <Skeleton className="h-5 w-16" /> : (
            <p className="text-2xl font-bold text-slate-800">{leaves.length}</p>
          )}
          <p className="text-xs text-slate-500">Total requests submitted</p>
          <Button size="sm" variant="ghost" className="mt-3 -ml-2" onClick={() => navigate('/leave')}>
            Apply / View Time Off <ArrowRight className="w-3 h-3" />
          </Button>
        </Card>

        {/* Payroll Card */}
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            {payroll && <Badge variant="green">{payroll.pay_period}</Badge>}
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Latest Net Salary</p>
          {isLoading ? <Skeleton className="h-7 w-28" /> : (
            <p className="text-2xl font-bold text-slate-800">
              {payroll ? `₹${Number(payroll.net_salary).toLocaleString('en-IN')}` : '—'}
            </p>
          )}
          <p className="text-xs text-slate-500">Attendance-based calculation</p>
          <Button size="sm" variant="ghost" className="mt-3 -ml-2" onClick={() => navigate('/payroll')}>
            View Payslip <ArrowRight className="w-3 h-3" />
          </Button>
        </Card>

        {/* Notifications Card */}
        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            {unreadNotifications > 0 && <Badge variant="purple">{unreadNotifications} Unread</Badge>}
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Notifications</p>
          {isLoading ? <Skeleton className="h-7 w-16" /> : (
            <p className="text-2xl font-bold text-slate-800">{notifications.length}</p>
          )}
          <p className="text-xs text-slate-500">Alerts & updates</p>
          <Button size="sm" variant="ghost" className="mt-3 -ml-2" onClick={() => navigate('/notifications')}>
            View All <ArrowRight className="w-3 h-3" />
          </Button>
        </Card>
      </div>

      {/* Choose a Module (Employee Core Flow) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight">Choose a Module</h3>
            <p className="text-xs text-stone-500 font-medium">Select a core workspace module to manage your daily tasks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Profile */}
          <div
            id="employee-module-profile"
            onClick={() => navigate('/profile')}
            className="group cursor-pointer p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:shadow-md hover:border-stone-400/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-900 group-hover:bg-stone-900 group-hover:text-white transition-colors flex items-center justify-center mb-3 shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-stone-900 text-sm group-hover:text-black">Profile</h4>
              <p className="text-[11px] text-stone-500 font-medium mt-1 leading-snug">
                View & edit personal details, avatar, and employee profile
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-700 group-hover:text-black">
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Attendance */}
          <div
            id="employee-module-attendance"
            onClick={() => navigate('/attendance')}
            className="group cursor-pointer p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:shadow-md hover:border-blue-400/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center mb-3 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-stone-900 text-sm group-hover:text-blue-600">Attendance</h4>
              <p className="text-[11px] text-stone-500 font-medium mt-1 leading-snug">
                Check-in/out, live breaks, and complete monthly history
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
              <span>Check-in / History</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Leave / Time Off */}
          <div
            id="employee-module-leave"
            onClick={() => navigate('/leave')}
            className="group cursor-pointer p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:shadow-md hover:border-amber-400/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center mb-3 shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-stone-900 text-sm group-hover:text-amber-600">Leave</h4>
              <p className="text-[11px] text-stone-500 font-medium mt-1 leading-snug">
                Apply for multi-type leaves, view approval status & balances
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
              <span>Apply & Status</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Payroll */}
          <div
            id="employee-module-payroll"
            onClick={() => navigate('/payroll')}
            className="group cursor-pointer p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:shadow-md hover:border-emerald-400/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center mb-3 shadow-xs">
                <DollarSign className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-stone-900 text-sm group-hover:text-emerald-600">Payroll</h4>
              <p className="text-[11px] text-stone-500 font-medium mt-1 leading-snug">
                View salary structure breakdown & download PDF payslips
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
              <span>View Salary</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 5. Logout */}
          <div
            id="employee-module-logout"
            onClick={handleLogout}
            className="group cursor-pointer p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:shadow-md hover:border-rose-300/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors flex items-center justify-center mb-3 shadow-xs">
                <LogOut className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-stone-900 text-sm group-hover:text-rose-600">Logout</h4>
              <p className="text-[11px] text-stone-500 font-medium mt-1 leading-snug">
                Securely sign out and terminate active workspace session
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-rose-600 group-hover:text-rose-700">
              <span>Sign Out</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Time Off Requests */}
      {leaves.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Recent Time Off Requests</h3>
            <Button size="sm" variant="ghost" onClick={() => navigate('/leave')}>View all</Button>
          </div>
          <div className="space-y-2">
            {leaves.slice(0, 3).map((leave: LeaveRequest) => (
              <div key={leave.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{leave.leave_type} Time Off</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(leave.start_date), 'MMM d')} — {format(new Date(leave.end_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <Badge variant={leave.status === 'APPROVED' ? 'green' : leave.status === 'REJECTED' ? 'red' : 'yellow'}>
                  {leave.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// HR & Admin Dashboard
const HRDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cardFilter, setCardFilter] = useState<'ALL' | 'PRESENT' | 'ON_LEAVE' | 'ABSENT_UNAPPROVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fullName = user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'HR Officer';

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await analyticsService.getDashboard();
        setKpis(data);
      } catch { /* handled */ }
      finally { setIsLoading(false); }
    };
    fetch();
  }, []);

  const kpiCards = kpis ? [
    { label: 'Total Employees', value: kpis.totalEmployees, icon: <User className="w-5 h-5" />, color: 'blue', to: '/employees' },
    { label: 'Present Today', value: kpis.presentToday, icon: <CheckCircle2 className="w-5 h-5" />, color: 'green', to: '/attendance' },
    { label: 'Absent Today (Unapproved)', value: kpis.absentToday, icon: <AlertCircle className="w-5 h-5" />, color: 'yellow', to: '/attendance' },
    { label: 'On Time Off Today', value: kpis.onLeave, icon: <Plane className="w-5 h-5" />, color: 'purple', to: '/leave' },
    { label: 'Pending Time Off Requests', value: kpis.pendingLeaves, icon: <Clock className="w-5 h-5" />, color: 'orange', to: '/leave' },
    {
      label: 'Monthly Payroll', value: `₹${Number(kpis.currentMonthPayroll).toLocaleString('en-IN')}`,
      icon: <DollarSign className="w-5 h-5" />, color: 'indigo', to: '/payroll'
    },
  ] : [];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-l-blue-500',
    green: 'bg-emerald-50 text-emerald-600 border-l-emerald-500',
    yellow: 'bg-amber-50 text-amber-600 border-l-amber-500',
    purple: 'bg-purple-50 text-purple-600 border-l-purple-500',
    orange: 'bg-orange-50 text-orange-600 border-l-orange-500',
    indigo: 'bg-indigo-50 text-indigo-600 border-l-indigo-500',
  };

  // Filtered employee status cards
  const employeeCards = (kpis?.employeeCards || []).filter((emp: Employee) => {
    const matchesFilter =
      cardFilter === 'ALL' || emp.today_work_status === cardFilter;
    const matchesSearch =
      searchQuery === '' ||
      `${emp.first_name} ${emp.last_name} ${emp.employee_code} ${emp.department_name || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">HR & Admin Command Center</h1>
          <p className="text-slate-500 text-sm mt-1">
            Welcome, {fullName} — {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))
          : kpiCards.map((card) => (
            <Card
              key={card.label}
              className={`border-l-4 ${colorMap[card.color].split(' ')[2]} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => navigate(card.to)}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[card.color].split(' ').slice(0, 2).join(' ')}`}>
                {card.icon}
              </div>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
            </Card>
          ))
        }
      </div>

      {/* Employee Status Cards Grid */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Employee Work Status Today</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time attendance & time-off indicators across all employees</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Legend & Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setCardFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${cardFilter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                All ({kpis?.employeeCards?.length || 0})
              </button>
              <button
                onClick={() => setCardFilter('PRESENT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${cardFilter === 'PRESENT' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Present ({kpis?.presentToday || 0})
              </button>
              <button
                onClick={() => setCardFilter('ON_LEAVE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${cardFilter === 'ON_LEAVE' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <Plane className="w-3.5 h-3.5 text-blue-500" />
                On Leave ({kpis?.onLeave || 0})
              </button>
              <button
                onClick={() => setCardFilter('ABSENT_UNAPPROVED')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${cardFilter === 'ABSENT_UNAPPROVED' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Absent ({kpis?.absentToday || 0})
              </button>
            </div>

            {/* Quick search */}
            <div className="w-48">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="py-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Grid of Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : employeeCards.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No employees match the current filter or search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeCards.map((emp: Employee) => {
              const initials = `${emp.first_name[0]}${emp.last_name?.[0] || ''}`.toUpperCase();

              return (
                <div
                  key={emp.id}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white group relative"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with Status Badge */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-sm">
                        {emp.profile_image ? (
                          <img src={emp.profile_image} alt="" className="w-full h-full object-cover" />
                        ) : initials}
                      </div>

                      {/* Status indicator badge */}
                      {emp.today_work_status === 'PRESENT' && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm"
                          title="Present - Checked in"
                        />
                      )}
                      {emp.today_work_status === 'ON_LEAVE' && (
                        <span
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-sm text-white text-[10px]"
                          title="On Approved Time Off"
                        >
                          ✈️
                        </span>
                      )}
                      {emp.today_work_status === 'ABSENT_UNAPPROVED' && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow-sm"
                          title="Absent without approved time off"
                        />
                      )}
                    </div>

                    {/* Employee Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <span className="text-[11px] font-mono text-slate-400">{emp.employee_code}</span>
                      </div>

                      <p className="text-xs text-slate-600 truncate mt-0.5">{emp.designation || 'Staff Member'}</p>
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {emp.department_name || 'No Department'}
                      </p>

                      {/* Status text badge */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        {emp.today_work_status === 'PRESENT' && (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Present {emp.today_check_in ? `(${format(new Date(emp.today_check_in), 'hh:mm a')})` : ''}
                          </span>
                        )}
                        {emp.today_work_status === 'ON_LEAVE' && (
                          <span className="text-blue-700 font-medium flex items-center gap-1">
                            <span>✈️</span> On Approved Time Off
                          </span>
                        )}
                        {emp.today_work_status === 'ABSENT_UNAPPROVED' && (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Absent (No time off)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Time Off Requests */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Pending Time Off Requests</h3>
            <Button size="sm" variant="ghost" onClick={() => navigate('/leave')}>View all</Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : kpis?.recentLeaves && kpis.recentLeaves.length > 0 ? (
            <div className="space-y-2">
              {kpis.recentLeaves.filter((l: LeaveRequest) => l.status === 'PENDING').slice(0, 4).map((leave: LeaveRequest) => (
                <div key={leave.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {leave.first_name} {leave.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {leave.leave_type} Time Off · {format(new Date(leave.start_date), 'MMM d')} — {format(new Date(leave.end_date), 'MMM d')}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/leave')}>Review</Button>
                </div>
              ))}
              {kpis.recentLeaves.filter((l: LeaveRequest) => l.status === 'PENDING').length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No pending requests</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No pending time off requests</p>
          )}
        </Card>

        {/* Department Overview */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Department Distribution</h3>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {kpis?.departmentStats?.map((dept: { name: string; employee_count: number }) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-28 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (dept.employee_count / (kpis.totalEmployees || 1)) * 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right font-medium">{dept.employee_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Management Shortcuts</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/employees')}>
            <Users className="w-4 h-4" /> Manage Employees
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/attendance')}>
            <Clock className="w-4 h-4" /> Attendance Log
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/leave')}>
            <Calendar className="w-4 h-4" /> Time Off Requests
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/payroll')}>
            <DollarSign className="w-4 h-4" /> Payroll & Payslips
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/analytics')}>
            <TrendingUp className="w-4 h-4" /> Analytics
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/reports')}>
            <FileText className="w-4 h-4" /> Reports
          </Button>
        </div>
      </Card>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'EMPLOYEE') return <EmployeeDashboard />;
  return <HRDashboard />;
};
