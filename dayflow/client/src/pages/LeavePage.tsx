import React, { useEffect, useState } from 'react';
import {
  Plus, Check, X as XIcon, Plane, Clock,
  User, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { leaveService } from '../services/leaveService';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Loader, EmptyState, Select, Input, Textarea } from '../components/ui';
import { Modal } from '../components/ui/Modal';
import type { LeaveRequest, LeaveType, Employee } from '../types';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

interface EmployeeLeaveGroup {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentName: string;
  pendingLeaves: LeaveRequest[];
  historyLeaves: LeaveRequest[];
  totalDaysApproved: number;
}

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PENDING_ONLY' | 'APPROVED_ONLY'>('ALL');
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  // Employee Apply Modal
  const [applyModal, setApplyModal] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'PAID' as LeaveType,
    start_date: '',
    end_date: '',
    remarks: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [applyLoading, setApplyLoading] = useState(false);

  // HR Review / Approval Modal
  const [approvalModal, setApprovalModal] = useState<{ leave: LeaveRequest | null; action: 'approve' | 'reject' }>({
    leave: null,
    action: 'approve',
  });
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      if (isHR) {
        const [leavesRes, empsRes] = await Promise.allSettled([
          leaveService.getAllLeaves({ limit: 200 }),
          employeeService.getAll({ limit: 100 }),
        ]);
        if (leavesRes.status === 'fulfilled') setLeaves(leavesRes.value.leaves || []);
        if (empsRes.status === 'fulfilled') setAllEmployees(empsRes.value.employees || []);
      } else {
        const res = await leaveService.getMyLeaves({ limit: 100 });
        setLeaves(res.leaves || []);
      }
    } catch {
      toast.error('Failed to load time off records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [isHR]);

  const leaveDays = (leave: LeaveRequest) =>
    differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1;

  // Group leaves per unique employee for HR View
  const employeeGroups: EmployeeLeaveGroup[] = React.useMemo(() => {
    if (!isHR) return [];

    const map = new Map<string, EmployeeLeaveGroup>();

    // 1. Initialize map with all known employees so everyone is listed
    allEmployees.forEach((emp) => {
      map.set(emp.id, {
        employeeId: emp.id,
        employeeCode: emp.employee_code || 'EMP',
        firstName: emp.first_name || '',
        lastName: emp.last_name || '',
        departmentName: emp.department_name || 'General',
        pendingLeaves: [],
        historyLeaves: [],
        totalDaysApproved: 0,
      });
    });

    // 2. Populate leaves into groups
    leaves.forEach((l) => {
      const empId = l.employee_id;
      if (!map.has(empId)) {
        map.set(empId, {
          employeeId: empId,
          employeeCode: l.employee_code || 'EMP',
          firstName: l.first_name || '',
          lastName: l.last_name || '',
          departmentName: l.department_name || 'General',
          pendingLeaves: [],
          historyLeaves: [],
          totalDaysApproved: 0,
        });
      }
      const group = map.get(empId)!;
      if (l.status === 'PENDING') {
        group.pendingLeaves.push(l);
      } else {
        group.historyLeaves.push(l);
        if (l.status === 'APPROVED') {
          group.totalDaysApproved += leaveDays(l);
        }
      }
    });

    // Sort pending newest first, history newest first
    map.forEach((g) => {
      g.pendingLeaves.sort((a, b) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime());
      g.historyLeaves.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    });

    // Return sorted: Employees with pending leaves FIRST, then by name
    return Array.from(map.values()).sort((a, b) => {
      if (a.pendingLeaves.length !== b.pendingLeaves.length) {
        return b.pendingLeaves.length - a.pendingLeaves.length;
      }
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
  }, [leaves, allEmployees, isHR]);

  // Filtered employee groups
  const filteredEmployeeGroups = employeeGroups.filter((g) => {
    // 1. Search Query
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${g.firstName} ${g.lastName}`.toLowerCase();
    const code = g.employeeCode.toLowerCase();
    const dept = g.departmentName.toLowerCase();
    const matchesSearch = !q || fullName.includes(q) || code.includes(q) || dept.includes(q);

    if (!matchesSearch) return false;

    // 2. Filter Type
    if (filterType === 'PENDING_ONLY') {
      return g.pendingLeaves.length > 0;
    }
    if (filterType === 'APPROVED_ONLY') {
      return g.historyLeaves.some((l) => l.status === 'APPROVED');
    }
    return true;
  });

  const toggleExpand = (empId: string) => {
    setExpandedEmployees((prev) => ({
      ...prev,
      [empId]: !prev[empId],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    filteredEmployeeGroups.forEach((g) => { next[g.employeeId] = true; });
    setExpandedEmployees(next);
  };

  const handleCollapseAll = () => {
    setExpandedEmployees({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.end_date) errors.end_date = 'End date is required';
    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      errors.end_date = 'End date must be on or after start date';
    }
    return errors;
  };

  const handleApply = async () => {
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setApplyLoading(true);
    try {
      await leaveService.applyLeave(formData);
      toast.success('Time off request submitted successfully!');
      setApplyModal(false);
      setFormData({ leave_type: 'PAID', start_date: '', end_date: '', remarks: '' });
      fetchLeaves();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit request');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleAction = async () => {
    if (!approvalModal.leave) return;
    setActionLoading(true);
    try {
      if (approvalModal.action === 'approve') {
        await leaveService.approveLeave(approvalModal.leave.id, comment);
        toast.success('Time off request approved! Attendance logs and payroll synced.');
      } else {
        await leaveService.rejectLeave(approvalModal.leave.id, comment);
        toast.success('Time off request rejected.');
      }
      setApprovalModal({ leave: null, action: 'approve' });
      setComment('');
      fetchLeaves();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // KPIs across all leaves
  const totalPendingLeaves = leaves.filter((l) => l.status === 'PENDING').length;
  const totalApprovedLeaves = leaves.filter((l) => l.status === 'APPROVED').length;
  const totalRejectedLeaves = leaves.filter((l) => l.status === 'REJECTED').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {isHR ? 'Time Off & Leave Administration (By Employee)' : 'My Time Off & Leave Requests'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isHR
              ? 'Review pending time-off requests, authorize leaves, and inspect past absence history per team member'
              : 'Submit and track your paid, sick, and unpaid time-off requests impacting your schedule and payroll'
            }
          </p>
        </div>
        {!isHR && (
          <Button
            id="apply-time-off-btn"
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setApplyModal(true)}
          >
            Request Time Off
          </Button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Review</p>
          <p className="text-xl font-extrabold text-amber-900 mt-1">{totalPendingLeaves} Requests</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Awaiting HR authorization</p>
        </div>

        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Approved Leaves</p>
          <p className="text-xl font-extrabold text-emerald-900 mt-1">{totalApprovedLeaves} Granted</p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Verified company time-off</p>
        </div>

        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Total Team Members</p>
          <p className="text-xl font-extrabold text-blue-900 mt-1">{isHR ? employeeGroups.length : 1} Personnel</p>
          <p className="text-[10px] text-blue-700 mt-0.5">Enrolled in leave schedule</p>
        </div>

        <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Declined Requests</p>
          <p className="text-xl font-extrabold text-rose-900 mt-1">{totalRejectedLeaves} Rejected</p>
          <p className="text-[10px] text-rose-700 mt-0.5">With reviewer notes</p>
        </div>
      </div>

      {/* HR VIEW: Master-Detail List of Users (Click to view Pending & Old Leaves) */}
      {isHR ? (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <Card className="bg-white border border-stone-200 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1 max-w-md">
                <Input
                  id="leave-employee-search"
                  placeholder="Search personnel by name, code, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setFilterType('ALL')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Users ({employeeGroups.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('PENDING_ONLY')}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                      filterType === 'PENDING_ONLY' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Has Pending ({employeeGroups.filter(g => g.pendingLeaves.length > 0).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('APPROVED_ONLY')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterType === 'APPROVED_ONLY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Has History
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={Object.keys(expandedEmployees).length > 0 ? handleCollapseAll : handleExpandAll}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  {Object.keys(expandedEmployees).length > 0 ? 'Collapse All' : 'Expand All'}
                </Button>
              </div>
            </div>
          </Card>

          {/* List of Unique Employees */}
          {isLoading ? (
            <Loader className="h-32" />
          ) : filteredEmployeeGroups.length === 0 ? (
            <EmptyState
              icon={<User className="w-10 h-10 text-slate-400" />}
              title="No employees found"
              description="No personnel match your active search or filter selection."
            />
          ) : (
            filteredEmployeeGroups.map((group) => {
              const isExpanded = expandedEmployees[group.employeeId] !== false; // expanded by default
              const hasPending = group.pendingLeaves.length > 0;

              return (
                <div
                  key={group.employeeId}
                  className={`bg-white border rounded-2xl overflow-hidden shadow-xs transition-all ${
                    hasPending ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Master Employee Header */}
                  <div
                    onClick={() => toggleExpand(group.employeeId)}
                    className="p-4 cursor-pointer select-none bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border flex-shrink-0 ${
                        hasPending
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {group.firstName?.[0] || 'U'}{group.lastName?.[0] || ''}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm">
                            {group.firstName} {group.lastName}
                          </h3>
                          <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {group.employeeCode}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            · {group.departmentName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {hasPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                              {group.pendingLeaves.length} Request{group.pendingLeaves.length !== 1 ? 's' : ''} Awaiting Approval
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              {group.historyLeaves.length} Total Leaves on Record · <strong className="text-slate-700">{group.totalDaysApproved} Days</strong> Approved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-bold text-slate-600">
                          {group.historyLeaves.filter(l => l.status === 'APPROVED').length} Approved · {group.historyLeaves.filter(l => l.status === 'REJECTED').length} Rejected
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Inside: Pending Requests & History */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-white">
                      {/* Section 1: Pending Requests Requiring Approval */}
                      {group.pendingLeaves.length > 0 && (
                        <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending Requests Requiring HR Review ({group.pendingLeaves.length})</span>
                          </div>

                          <div className="space-y-2.5">
                            {group.pendingLeaves.map((leave) => {
                              const days = leaveDays(leave);
                              return (
                                <div
                                  key={leave.id}
                                  className="p-3 bg-white rounded-xl border border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={leave.leave_type === 'SICK' ? 'red' : leave.leave_type === 'PAID' ? 'blue' : 'yellow'}>
                                        {leave.leave_type} TIME OFF
                                      </Badge>
                                      <span className="font-extrabold text-slate-900 text-xs">
                                        {format(new Date(leave.start_date), 'MMM d, yyyy')} — {format(new Date(leave.end_date), 'MMM d, yyyy')}
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                        {days} Day{days !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">
                                      Reason: <span className="font-medium text-slate-800">"{leave.remarks || 'No remarks provided'}"</span>
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      id={`approve-leave-btn-${leave.id}`}
                                      size="sm"
                                      variant="success"
                                      leftIcon={<Check className="w-3.5 h-3.5" />}
                                      onClick={() => setApprovalModal({ leave, action: 'approve' })}
                                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                      Approve Time Off
                                    </Button>
                                    <Button
                                      id={`reject-leave-btn-${leave.id}`}
                                      size="sm"
                                      variant="outline"
                                      leftIcon={<XIcon className="w-3.5 h-3.5 text-rose-500" />}
                                      onClick={() => setApprovalModal({ leave, action: 'reject' })}
                                      className="text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Historical Leaves Table */}
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                          📋 Past & Historical Leave Records ({group.historyLeaves.length})
                        </p>

                        {group.historyLeaves.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                            No past leave history recorded for this employee.
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold">
                                  <th className="text-left py-2.5 px-3">Type</th>
                                  <th className="text-left py-2.5 px-3">Leave Dates</th>
                                  <th className="text-left py-2.5 px-3">Duration</th>
                                  <th className="text-left py-2.5 px-3">Status</th>
                                  <th className="text-left py-2.5 px-3">Employee Reason</th>
                                  <th className="text-left py-2.5 px-3">HR Review Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.historyLeaves.map((l) => {
                                  const days = leaveDays(l);
                                  return (
                                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-2.5 px-3 font-semibold text-slate-700">{l.leave_type}</td>
                                      <td className="py-2.5 px-3 font-medium text-slate-800">
                                        {format(new Date(l.start_date), 'MMM d, yyyy')} — {format(new Date(l.end_date), 'MMM d, yyyy')}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600 font-bold">{days} d</td>
                                      <td className="py-2.5 px-3">
                                        <Badge variant={l.status === 'APPROVED' ? 'green' : 'red'}>
                                          {l.status}
                                        </Badge>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600">{l.remarks || '—'}</td>
                                      <td className="py-2.5 px-3 text-slate-500 italic">{l.hr_comment || 'Approved by HR'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* EMPLOYEE VIEW: Personal Leave Balance & Requests */
        <div className="space-y-6">
          {/* Personal Leave Requests Table */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">My Leave Applications & History</h3>
                <p className="text-xs text-slate-500 mt-0.5">Track your submitted time-off requests and review manager decisions</p>
              </div>
              <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setApplyModal(true)}>
                Apply for Leave
              </Button>
            </div>

            {isLoading ? (
              <Loader className="h-32" />
            ) : leaves.length === 0 ? (
              <EmptyState
                icon={<Plane className="w-10 h-10 text-slate-400" />}
                title="No time off requests"
                description="You haven't requested any time off yet."
                action={<Button size="sm" onClick={() => setApplyModal(true)}>Apply Now</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-600">
                      <th className="text-left py-3 px-3">Leave Type</th>
                      <th className="text-left py-3 px-3">Date Range</th>
                      <th className="text-left py-3 px-3">Duration</th>
                      <th className="text-left py-3 px-3">Status</th>
                      <th className="text-left py-3 px-3">Remarks</th>
                      <th className="text-left py-3 px-3">HR Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800">{leave.leave_type}</td>
                        <td className="py-3 px-3 text-slate-700">
                          {format(new Date(leave.start_date), 'MMM d, yyyy')} — {format(new Date(leave.end_date), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-700">{leaveDays(leave)} Days</td>
                        <td className="py-3 px-3">
                          <Badge variant={leave.status === 'APPROVED' ? 'green' : leave.status === 'REJECTED' ? 'red' : 'yellow'}>
                            {leave.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{leave.remarks || '—'}</td>
                        <td className="py-3 px-3 text-slate-500 italic">{leave.hr_comment || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal
        isOpen={applyModal}
        onClose={() => setApplyModal(false)}
        title="Request Time Off"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setApplyModal(false)}>Cancel</Button>
            <Button id="submit-time-off-btn" size="sm" variant="primary" isLoading={applyLoading} onClick={handleApply}>
              Submit Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Time Off Type *</label>
            <Select
              id="time-off-type-select"
              value={formData.leave_type}
              onChange={(e) => setFormData(f => ({ ...f, leave_type: e.target.value as LeaveType }))}
              options={[
                { value: 'PAID', label: '🏖️ Paid Time Off (PTO)' },
                { value: 'SICK', label: '🩺 Sick Leave' },
                { value: 'UNPAID', label: '💼 Unpaid Leave' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
              <Input
                id="leave-start-date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(f => ({ ...f, start_date: e.target.value }))}
                error={formErrors.start_date}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date *</label>
              <Input
                id="leave-end-date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(f => ({ ...f, end_date: e.target.value }))}
                error={formErrors.end_date}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Remarks</label>
            <Textarea
              id="leave-remarks-input"
              rows={3}
              placeholder="Provide a brief explanation for your time-off request..."
              value={formData.remarks}
              onChange={(e) => setFormData(f => ({ ...f, remarks: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Approve / Reject Modal (HR) */}
      <Modal
        isOpen={!!approvalModal.leave}
        onClose={() => setApprovalModal({ leave: null, action: 'approve' })}
        title={approvalModal.action === 'approve' ? 'Approve Time Off Request' : 'Decline Time Off Request'}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setApprovalModal({ leave: null, action: 'approve' })}>
              Cancel
            </Button>
            <Button
              id="confirm-leave-action-btn"
              size="sm"
              variant={approvalModal.action === 'approve' ? 'success' : 'danger'}
              isLoading={actionLoading}
              onClick={handleAction}
            >
              {approvalModal.action === 'approve' ? 'Confirm Approval' : 'Decline Request'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className={`p-3 rounded-xl border text-xs ${
            approvalModal.action === 'approve'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <p className="font-bold">
              {approvalModal.action === 'approve' ? 'Authorizing Leave' : 'Declining Leave'}
            </p>
            <p className="mt-0.5">
              Employee: <strong>{approvalModal.leave?.first_name} {approvalModal.leave?.last_name}</strong> ({approvalModal.leave?.employee_code})
            </p>
            <p className="mt-0.5">
              Period: {approvalModal.leave && `${format(new Date(approvalModal.leave.start_date), 'MMM d')} — ${format(new Date(approvalModal.leave.end_date), 'MMM d, yyyy')}`}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {approvalModal.action === 'approve' ? 'Approval Comments (Optional)' : 'Reason for Rejection *'}
            </label>
            <Textarea
              id="leave-action-comment"
              rows={2}
              placeholder={approvalModal.action === 'approve' ? 'e.g. Approved as per schedule' : 'e.g. Insufficient coverage during release week'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
