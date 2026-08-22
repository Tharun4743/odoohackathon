import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Coffee, Plane } from 'lucide-react';
import { attendanceService } from '../services/attendanceService';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Loader, EmptyState, Select, Input } from '../components/ui';
import type { Attendance, Employee } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const statusColor = (status?: string) => {
  switch (status) {
    case 'PRESENT': return 'green';
    case 'ABSENT': return 'red';
    case 'HALF_DAY': return 'yellow';
    case 'LEAVE': return 'blue';
    default: return 'slate';
  }
};

const StatusIcon = ({ status }: { status?: string }) => {
  switch (status) {
    case 'PRESENT': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'ABSENT': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'HALF_DAY': return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case 'LEAVE': return <Plane className="w-4 h-4 text-blue-500" />;
    default: return <Clock className="w-4 h-4 text-slate-400" />;
  }
};

interface DayAttendanceRecord {
  date: string;
  day: number;
  check_in: string | null;
  check_out: string | null;
  break_duration: number;
  working_hours: number;
  status: string;
}

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  // Current month string "YYYY-MM"
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [monthData, setMonthData] = useState<{
    month: string;
    totalDays: number;
    summary: { present: number; halfDay: number; leave: number; absent: number };
    days: DayAttendanceRecord[];
  } | null>(null);

  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [liveEmployees, setLiveEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'TODAY_LIVE' | 'HISTORY'>('TODAY_LIVE');
  const [employeeViewMode, setEmployeeViewMode] = useState<'MONTHLY' | 'WEEKLY' | 'DAILY'>('MONTHLY');

  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!isHR) {
        const [today, monthRes] = await Promise.allSettled([
          attendanceService.getTodayAttendance(),
          attendanceService.getMonthAttendance(selectedMonth),
        ]);
        if (today.status === 'fulfilled') setTodayAttendance(today.value);
        if (monthRes.status === 'fulfilled') setMonthData(monthRes.value);
      } else {
        const [liveRes, allRes] = await Promise.allSettled([
          attendanceService.getLiveStatusToday(),
          attendanceService.getAllAttendance({
            status: statusFilter as 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | undefined,
            page,
            limit: 20,
          }),
        ]);
        if (liveRes.status === 'fulfilled') setLiveEmployees(liveRes.value || []);
        if (allRes.status === 'fulfilled') {
          setAllAttendance(allRes.value.attendance || []);
          setTotalPages(allRes.value.totalPages || 1);
        }
      }
    } catch { toast.error('Failed to load attendance records'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedMonth, page, statusFilter, isHR]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.checkIn();
      setTodayAttendance(record);
      toast.success('Checked in! Have a productive day 🎉');
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-in failed');
    } finally { setActionLoading(false); }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.startBreak();
      setTodayAttendance(record);
      toast.success('Break started ☕');
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start break');
    } finally { setActionLoading(false); }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.endBreak();
      setTodayAttendance(record);
      toast.success('Break ended! Welcome back.');
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to end break');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.checkOut();
      setTodayAttendance(record);
      toast.success(`Checked out! Total working time: ${record.working_hours}h.`);
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-out failed');
    } finally { setActionLoading(false); }
  };

  const isOnBreak = !!(todayAttendance?.break_start && !todayAttendance?.break_end);

  if (isHR) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Attendance Monitoring</h2>
            <p className="text-sm text-slate-500">Live check-in and attendance history for all employees</p>
          </div>

          {/* Toggle between live today & full history */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('TODAY_LIVE')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'TODAY_LIVE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              Today's Live Present ({liveEmployees.filter(e => e.today_work_status === 'PRESENT').length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'HISTORY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              All Attendance Log
            </button>
          </div>
        </div>

        {activeTab === 'TODAY_LIVE' ? (
          <Card>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Employees Present & Active Today — {format(new Date(), 'MMMM d, yyyy')}</h3>
              <p className="text-xs text-slate-500">Real-time attendance input for daily operations and payroll</p>
            </div>

            {isLoading ? <Loader className="h-32" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="text-left py-3 px-3">Employee</th>
                      <th className="text-left py-3 px-3">Department</th>
                      <th className="text-left py-3 px-3">Check In</th>
                      <th className="text-left py-3 px-3">Break Time</th>
                      <th className="text-left py-3 px-3">Check Out</th>
                      <th className="text-left py-3 px-3">Hours Worked</th>
                      <th className="text-left py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveEmployees.map(emp => (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {emp.profile_image ? (
                                <img src={emp.profile_image} alt="" className="w-full h-full object-cover" />
                              ) : `${emp.first_name[0]}${emp.last_name?.[0] || ''}`}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-slate-400">{emp.employee_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{emp.department_name || '—'}</td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {emp.today_check_in ? format(new Date(emp.today_check_in), 'hh:mm a') : '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {emp.today_check_in ? `${parseFloat(String(emp.break_duration || '0'))}h` : '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {emp.today_check_out ? format(new Date(emp.today_check_out), 'hh:mm a') : '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-semibold">
                          {emp.working_hours ? `${emp.working_hours}h` : '—'}
                        </td>
                        <td className="py-3 px-3">
                          {emp.today_work_status === 'PRESENT' && (
                            <Badge variant="green" className="gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Present
                            </Badge>
                          )}
                          {emp.today_work_status === 'ON_LEAVE' && (
                            <Badge variant="blue" className="gap-1">
                              ✈️ On Leave
                            </Badge>
                          )}
                          {emp.today_work_status === 'ABSENT_UNAPPROVED' && (
                            <Badge variant="yellow" className="gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Absent (No Time Off)
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Select
                id="attendance-status-filter"
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setStatusFilter(e.target.value); setPage(1); }}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'PRESENT', label: 'Present' },
                  { value: 'ABSENT', label: 'Absent' },
                  { value: 'HALF_DAY', label: 'Half Day' },
                  { value: 'LEAVE', label: 'Time Off' },
                ]}
                className="w-44"
              />
            </div>

            {isLoading ? <Loader className="h-32" /> : allAttendance.length === 0 ? (
              <EmptyState title="No attendance records found" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Employee</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Department</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Date</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Check In</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Break</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Check Out</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Net Hours</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAttendance.map(att => (
                      <tr key={att.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-700">{att.first_name} {att.last_name}</p>
                          <p className="text-xs text-slate-500">{att.employee_code}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{att.department_name || '—'}</td>
                        <td className="py-3 px-3 text-slate-600">{format(new Date(att.attendance_date), 'MMM d, yyyy')}</td>
                        <td className="py-3 px-3 text-slate-600">{att.check_in ? format(new Date(att.check_in), 'hh:mm a') : '—'}</td>
                        <td className="py-3 px-3 text-slate-600">{att.break_duration ? `${att.break_duration}h` : '—'}</td>
                        <td className="py-3 px-3 text-slate-600">{att.check_out ? format(new Date(att.check_out), 'hh:mm a') : '—'}</td>
                        <td className="py-3 px-3 text-slate-600 font-semibold">{att.working_hours ? `${att.working_hours}h` : '—'}</td>
                        <td className="py-3 px-3">
                          <Badge variant={statusColor(att.status) as 'green' | 'red' | 'yellow' | 'blue' | 'slate'}>{att.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // Employee View: Day-wise attendance for ongoing/current month by default + break tracking
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Today's Action Card */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Today's Live Punch & Breaks</h3>
            <p className="text-sm text-slate-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          {todayAttendance?.status && (
            <Badge variant={todayAttendance.status === 'PRESENT' ? 'green' : 'yellow'}>
              {isOnBreak ? '☕ ON BREAK' : todayAttendance.status}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div className="text-center p-3.5 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Check In</p>
            <p className="text-base font-bold text-slate-800">
              {todayAttendance?.check_in ? format(new Date(todayAttendance.check_in), 'hh:mm a') : '—'}
            </p>
          </div>
          <div className="text-center p-3.5 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Break Time</p>
            <p className="text-base font-bold text-amber-600">
              {todayAttendance?.break_duration ? `${todayAttendance.break_duration}h` : isOnBreak ? 'In Progress' : '0.00h'}
            </p>
          </div>
          <div className="text-center p-3.5 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Check Out</p>
            <p className="text-base font-bold text-slate-800">
              {todayAttendance?.check_out ? format(new Date(todayAttendance.check_out), 'hh:mm a') : '—'}
            </p>
          </div>
          <div className="text-center p-3.5 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Net Working Hours</p>
            <p className="text-base font-bold text-blue-700">
              {todayAttendance?.working_hours ? `${todayAttendance.working_hours}h` : '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            id="check-in-btn"
            variant="primary"
            leftIcon={<Clock className="w-4 h-4" />}
            isLoading={actionLoading}
            onClick={handleCheckIn}
            disabled={!!todayAttendance?.check_in}
          >
            {todayAttendance?.check_in ? 'Checked In ✓' : 'Check In'}
          </Button>

          {todayAttendance?.check_in && !todayAttendance?.check_out && (
            <>
              {!isOnBreak ? (
                <Button
                  id="start-break-btn"
                  variant="outline"
                  leftIcon={<Coffee className="w-4 h-4 text-amber-500" />}
                  isLoading={actionLoading}
                  onClick={handleStartBreak}
                >
                  Start Break
                </Button>
              ) : (
                <Button
                  id="end-break-btn"
                  variant="success"
                  isLoading={actionLoading}
                  onClick={handleEndBreak}
                >
                  End Break
                </Button>
              )}

              <Button
                id="check-out-btn"
                variant="secondary"
                leftIcon={<Clock className="w-4 h-4" />}
                isLoading={actionLoading}
                onClick={handleCheckOut}
              >
                Check Out
              </Button>
            </>
          )}

          {todayAttendance?.check_out && (
            <div className="flex items-center text-sm font-medium text-emerald-600 gap-1.5 ml-2">
              <CheckCircle2 className="w-4 h-4" /> Shift completed for today
            </div>
          )}
        </div>
      </Card>

      {/* Attendance History (Daily / Weekly / Monthly View) */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {employeeViewMode === 'DAILY'
                ? `Today's Attendance Breakdown — ${format(new Date(), 'MMMM d, yyyy')}`
                : employeeViewMode === 'WEEKLY'
                ? `Current Week Attendance Summary`
                : `Day-Wise Attendance — ${format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified punch records, net hours worked, and status classification (Inputs into Payroll)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Daily / Weekly / Monthly */}
            <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold">
              <button
                id="view-mode-daily"
                type="button"
                onClick={() => setEmployeeViewMode('DAILY')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  employeeViewMode === 'DAILY' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Daily View
              </button>
              <button
                id="view-mode-weekly"
                type="button"
                onClick={() => setEmployeeViewMode('WEEKLY')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  employeeViewMode === 'WEEKLY' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Weekly View
              </button>
              <button
                id="view-mode-monthly"
                type="button"
                onClick={() => setEmployeeViewMode('MONTHLY')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  employeeViewMode === 'MONTHLY' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Monthly View
              </button>
            </div>

            {employeeViewMode === 'MONTHLY' && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="py-1 text-xs w-36"
                />
              </div>
            )}
          </div>
        </div>

        {/* Month Summary KPI Bar */}
        {monthData?.summary && employeeViewMode !== 'DAILY' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-xs font-semibold text-emerald-700">Present Days</p>
              <p className="text-xl font-bold text-emerald-800 mt-1">{monthData.summary.present}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs font-semibold text-amber-700">Half Days (0.5x)</p>
              <p className="text-xl font-bold text-amber-800 mt-1">{monthData.summary.halfDay}</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs font-semibold text-blue-700">Approved Time Off</p>
              <p className="text-xl font-bold text-blue-800 mt-1">{monthData.summary.leave}</p>
            </div>
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs font-semibold text-red-700">Absent Days</p>
              <p className="text-xl font-bold text-red-800 mt-1">{monthData.summary.absent}</p>
            </div>
          </div>
        )}

        {/* Dynamic Display based on Daily / Weekly / Monthly View */}
        {isLoading ? (
          <Loader className="h-40" />
        ) : employeeViewMode === 'DAILY' ? (
          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-stone-900 text-sm">Today's Shift Status</h4>
                <p className="text-xs text-stone-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <Badge variant={statusColor(todayAttendance?.status || 'NOT_STARTED') as 'green' | 'red' | 'yellow' | 'blue' | 'slate'}>
                {isOnBreak ? '☕ ON BREAK' : todayAttendance?.status || 'NOT PUNCHED'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-white border border-stone-200 rounded-xl">
                <p className="text-[11px] font-bold text-stone-400 uppercase">Check-In Timestamp</p>
                <p className="text-sm font-bold text-stone-900 mt-1">
                  {todayAttendance?.check_in ? format(new Date(todayAttendance.check_in), 'hh:mm:ss a') : 'Pending Punch'}
                </p>
              </div>
              <div className="p-3 bg-white border border-stone-200 rounded-xl">
                <p className="text-[11px] font-bold text-stone-400 uppercase">Break Duration</p>
                <p className="text-sm font-bold text-amber-600 mt-1">
                  {todayAttendance?.break_duration ? `${todayAttendance.break_duration} hours` : isOnBreak ? 'In Progress' : '0.00 hours'}
                </p>
              </div>
              <div className="p-3 bg-white border border-stone-200 rounded-xl">
                <p className="text-[11px] font-bold text-stone-400 uppercase">Check-Out Timestamp</p>
                <p className="text-sm font-bold text-stone-900 mt-1">
                  {todayAttendance?.check_out ? format(new Date(todayAttendance.check_out), 'hh:mm:ss a') : 'On Duty'}
                </p>
              </div>
              <div className="p-3 bg-white border border-stone-200 rounded-xl">
                <p className="text-[11px] font-bold text-stone-400 uppercase">Net Working Hours</p>
                <p className="text-sm font-bold text-blue-700 mt-1">
                  {todayAttendance?.working_hours ? `${todayAttendance.working_hours} hours` : '0.00 hours'}
                </p>
              </div>
            </div>
          </div>
        ) : !monthData?.days?.length ? (
          <EmptyState title="No attendance data for this selection" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-2.5 px-3">Date</th>
                  <th className="text-left py-2.5 px-3">Day</th>
                  <th className="text-left py-2.5 px-3">Check In</th>
                  <th className="text-left py-2.5 px-3">Break Duration</th>
                  <th className="text-left py-2.5 px-3">Check Out</th>
                  <th className="text-left py-2.5 px-3">Net Work Hours</th>
                  <th className="text-left py-2.5 px-3">Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {(employeeViewMode === 'WEEKLY'
                  ? monthData.days.slice(Math.max(0, monthData.days.length - 7))
                  : monthData.days
                ).map((dayRec) => {
                  const dayDate = new Date(dayRec.date);
                  const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

                  return (
                    <tr
                      key={dayRec.date}
                      className={clsx(
                        'border-b border-slate-100 hover:bg-slate-50 transition-colors',
                        isWeekend ? 'bg-slate-50/50' : ''
                      )}
                    >
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {format(dayDate, 'MMM d, yyyy')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs font-medium">
                        {format(dayDate, 'EEEE')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {dayRec.check_in ? format(new Date(dayRec.check_in), 'hh:mm a') : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">
                        {dayRec.break_duration ? `${dayRec.break_duration}h` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {dayRec.check_out ? format(new Date(dayRec.check_out), 'hh:mm a') : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {dayRec.working_hours ? `${dayRec.working_hours}h` : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon status={dayRec.status} />
                          <Badge variant={statusColor(dayRec.status) as 'green' | 'red' | 'yellow' | 'blue' | 'slate'}>
                            {dayRec.status === 'LEAVE' ? '🏖️ LEAVE' : dayRec.status === 'PRESENT' ? '✅ PRESENT' : dayRec.status === 'HALF_DAY' ? '⚠️ HALF-DAY' : '❌ ABSENT'}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
