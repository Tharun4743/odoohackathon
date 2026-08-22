import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Eye, Edit2, ChevronLeft, ChevronRight, Users, UserPlus,
  Check, Copy, UserCheck, UserX, Clock, ShieldCheck
} from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { Card, Button, Input, Select, Badge, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import type { Employee, Department } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type PendingUser = Employee & {
  user_email: string;
  user_role: string;
  is_verified: boolean;
  user_created_at: string;
};

export const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING_APPROVALS'>(
    searchParams.get('tab') === 'approvals' || searchParams.get('tab') === 'pending'
      ? 'PENDING_APPROVALS'
      : 'ALL'
  );

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Pending Approvals State
  const [pendingApprovals, setPendingApprovals] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject Modal
  const [rejectModal, setRejectModal] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Edit employee modal
  const [editModal, setEditModal] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);

  // Create employee modal
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    employee_code: '',
    phone: '',
    address: '',
    department_id: '',
    designation: '',
    joining_date: new Date().toISOString().split('T')[0],
    role: 'EMPLOYEE' as 'EMPLOYEE' | 'HR' | 'ADMIN',
    basic_salary: '',
    allowances: '',
    deductions: '',
    initial_password: '',
  });
  const [creating, setCreating] = useState(false);

  // Generated credentials modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    employee_code: string;
    email: string;
    initialPassword: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await employeeService.getAll({ search, departmentId: deptFilter, status: statusFilter, page, limit: 10 });
      setEmployees(res.employees || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    setPendingLoading(true);
    try {
      const data = await employeeService.getPendingApprovals();
      setPendingApprovals(data as PendingUser[]);
    } catch {
      toast.error('Failed to load pending registration approvals');
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    employeeService.getDepartments().then(setDepartments);
    fetchPendingApprovals();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(debounce);
  }, [search, deptFilter, statusFilter, page]);

  const handleTabSwitch = (tab: 'ALL' | 'PENDING_APPROVALS') => {
    setActiveTab(tab);
    setSearchParams(tab === 'PENDING_APPROVALS' ? { tab: 'approvals' } : {});
    if (tab === 'PENDING_APPROVALS') {
      fetchPendingApprovals();
    } else {
      fetchEmployees();
    }
  };

  const handleApprove = async (emp: PendingUser) => {
    setProcessingId(emp.id);
    try {
      await employeeService.approveRegistration(emp.id);
      toast.success(`Account approved for ${emp.first_name} ${emp.last_name}! Confirmation email sent.`);
      await fetchPendingApprovals();
      fetchEmployees();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to approve account';
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModal) return;
    setRejecting(true);
    try {
      await employeeService.rejectRegistration(rejectModal.id, rejectReason);
      toast.success(`Registration request declined for ${rejectModal.first_name} ${rejectModal.last_name}.`);
      setRejectModal(null);
      setRejectReason('');
      await fetchPendingApprovals();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to decline registration';
      toast.error(msg);
    } finally {
      setRejecting(false);
    }
  };

  const openEdit = (emp: Employee) => {
    setEditModal(emp);
    setEditForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      phone: emp.phone || '',
      address: emp.address || '',
      department_id: emp.department_id || '',
      designation: emp.designation || '',
      status: emp.status,
    });
  };

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await employeeService.updateEmployee(editModal.id, editForm);
      toast.success('Employee updated successfully');
      setEditModal(null);
      fetchEmployees();
    } catch {
      toast.error('Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.first_name || !createForm.last_name || !createForm.email) {
      toast.error('First Name, Last Name, and Email are required.');
      return;
    }
    setCreating(true);
    try {
      const result = await employeeService.createEmployee({
        ...createForm,
        basic_salary: createForm.basic_salary ? parseFloat(createForm.basic_salary) : undefined,
        allowances: createForm.allowances ? parseFloat(createForm.allowances) : undefined,
        deductions: createForm.deductions ? parseFloat(createForm.deductions) : undefined,
      });

      toast.success('Employee account created successfully!');
      setCreateModal(false);
      setCreatedCredentials(result.credentials);
      setCreateForm({
        first_name: '',
        last_name: '',
        email: '',
        employee_code: '',
        phone: '',
        address: '',
        department_id: '',
        designation: '',
        joining_date: new Date().toISOString().split('T')[0],
        role: 'EMPLOYEE',
        basic_salary: '',
        allowances: '',
        deductions: '',
        initial_password: '',
      });
      fetchEmployees();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create employee';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Work Suite HRMS Credentials:
Employee Code: ${createdCredentials.employee_code}
Email: ${createdCredentials.email}
Initial Password: ${createdCredentials.initialPassword}
Role: ${createdCredentials.role}
Portal: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Employee Management & Authorization</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company personnel, verify incoming sign-up registrations, and issue workspace credentials
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              id="tab-all-employees"
              type="button"
              onClick={() => handleTabSwitch('ALL')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Employees ({total})
            </button>
            <button
              id="tab-pending-approvals"
              type="button"
              onClick={() => handleTabSwitch('PENDING_APPROVALS')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'PENDING_APPROVALS'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pending Approvals</span>
              {pendingApprovals.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'PENDING_APPROVALS' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {pendingApprovals.length}
                </span>
              )}
            </button>
          </div>

          <Button
            id="add-employee-btn"
            size="sm"
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={() => setCreateModal(true)}
          >
            Add Employee
          </Button>
        </div>
      </div>

      {/* VIEW 1: Pending Registrations Approval Queue */}
      {activeTab === 'PENDING_APPROVALS' ? (
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">New User Registration Approval Queue</h3>
                <Badge variant="yellow">{pendingApprovals.length} Pending Authorization</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                New accounts created via public sign-up require HR/Admin authorization before login access is granted.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchPendingApprovals}
              isLoading={pendingLoading}
              className="text-xs"
            >
              Refresh
            </Button>
          </div>

          {pendingLoading ? (
            <Loader className="h-32" />
          ) : pendingApprovals.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-10 h-10 text-emerald-500" />}
              title="All registrations authorized!"
              description="There are currently no new employee sign-ups awaiting verification or approval."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/60">
                    <th className="text-left py-3 px-3">Candidate & Details</th>
                    <th className="text-left py-3 px-3">Employee Code</th>
                    <th className="text-left py-3 px-3">Requested Role</th>
                    <th className="text-left py-3 px-3">Email Verification</th>
                    <th className="text-left py-3 px-3">Registered At</th>
                    <th className="text-right py-3 px-3">Authorization Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingApprovals.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs border border-amber-200">
                            {emp.first_name?.[0] || 'U'}{emp.last_name?.[0] || ''}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{emp.email || emp.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {emp.employee_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant={emp.user_role === 'ADMIN' ? 'red' : emp.user_role === 'HR' ? 'purple' : 'blue'}>
                          {emp.user_role || 'EMPLOYEE'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" /> OTP Verified
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-500">
                        {emp.user_created_at ? format(new Date(emp.user_created_at), 'MMM d, yyyy · hh:mm a') : 'Recently'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            id={`approve-user-btn-${emp.id}`}
                            size="sm"
                            variant="success"
                            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                            isLoading={processingId === emp.id}
                            onClick={() => handleApprove(emp)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            Approve Access
                          </Button>
                          <Button
                            id={`reject-user-btn-${emp.id}`}
                            size="sm"
                            variant="outline"
                            leftIcon={<UserX className="w-3.5 h-3.5 text-rose-500" />}
                            disabled={processingId === emp.id}
                            onClick={() => setRejectModal(emp)}
                            className="text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        /* VIEW 2: All Active Employees Directory */
        <Card>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <Input
              id="emp-search"
              placeholder="Search by name, code, email..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="flex-1 text-xs"
            />
            <Select
              id="dept-filter"
              value={deptFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setDeptFilter(e.target.value); setPage(1); }}
              options={[{ value: '', label: 'All Departments' }, ...departments.map(d => ({ value: d.id, label: d.name }))]}
              className="w-44 text-xs"
            />
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setStatusFilter(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'ON_LEAVE', label: 'On Leave' },
                { value: 'TERMINATED', label: 'Terminated' },
              ]}
              className="w-36 text-xs"
            />
          </div>

          {isLoading ? (
            <Loader className="h-32" />
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<Users className="w-10 h-10" />}
              title="No employees found"
              description="Try adjusting your search or add a new employee."
              action={<Button size="sm" onClick={() => setCreateModal(true)}>Add Employee</Button>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/60">
                      <th className="text-left py-3 px-3">Employee</th>
                      <th className="text-left py-3 px-3">Code</th>
                      <th className="text-left py-3 px-3">Department</th>
                      <th className="text-left py-3 px-3">Designation</th>
                      <th className="text-left py-3 px-3">Status</th>
                      <th className="text-left py-3 px-3">Joining Date</th>
                      <th className="text-right py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                              {emp.first_name[0]}{emp.last_name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-slate-500">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-xs font-bold">{emp.employee_code}</td>
                        <td className="py-3 px-3 text-slate-600">{emp.department_name || '—'}</td>
                        <td className="py-3 px-3 text-slate-600">{emp.designation || '—'}</td>
                        <td className="py-3 px-3">
                          <Badge variant={emp.status === 'ACTIVE' ? 'green' : emp.status === 'ON_LEAVE' ? 'yellow' : 'red'}>
                            {emp.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-xs">
                          {emp.joining_date ? format(new Date(emp.joining_date), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              id={`view-emp-${emp.id}`}
                              size="sm"
                              variant="ghost"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => navigate(`/employees/${emp.id}`)}
                            >
                              View
                            </Button>
                            <Button
                              id={`edit-emp-${emp.id}`}
                              size="sm"
                              variant="ghost"
                              leftIcon={<Edit2 className="w-3.5 h-3.5 text-blue-600" />}
                              onClick={() => openEdit(emp)}
                            >
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
            </>
          )}
        </Card>
      )}

      {/* Reject Registration Modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectReason(''); }}
        title="Decline Account Registration"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => { setRejectModal(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              id="confirm-reject-btn"
              size="sm"
              variant="danger"
              isLoading={rejecting}
              onClick={handleConfirmReject}
            >
              Decline Registration
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            <p className="font-bold mb-0.5">Decline Authorization</p>
            <p>You are declining access for <strong>{rejectModal?.first_name} {rejectModal?.last_name}</strong> ({rejectModal?.email || rejectModal?.user_email}). An email notice will be sent to the user.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection (Optional)</label>
            <Input
              id="reject-reason-input"
              placeholder="e.g. Unverified corporate credentials or invalid department"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* Create Employee Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Add New Employee"
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button id="submit-create-employee" size="sm" isLoading={creating} onClick={handleCreateEmployee}>
              Create Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="create-first-name"
              label="First Name *"
              required
              value={createForm.first_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, first_name: e.target.value }))}
            />
            <Input
              id="create-last-name"
              label="Last Name *"
              required
              value={createForm.last_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, last_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="create-email"
              label="Email Address *"
              type="email"
              required
              value={createForm.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, email: e.target.value }))}
            />
            <Input
              id="create-emp-code"
              label="Employee Code (leave blank for auto)"
              placeholder="e.g. EMP-005"
              value={createForm.employee_code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, employee_code: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              id="create-role"
              label="System Role"
              value={createForm.role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreateForm(p => ({ ...p, role: e.target.value as 'EMPLOYEE' | 'HR' | 'ADMIN' }))}
              options={[
                { value: 'EMPLOYEE', label: 'Employee' },
                { value: 'HR', label: 'HR Officer' },
                { value: 'ADMIN', label: 'System Admin' },
              ]}
            />
            <Select
              id="create-dept"
              label="Department"
              value={createForm.department_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreateForm(p => ({ ...p, department_id: e.target.value }))}
              options={[
                { value: '', label: 'Select Department...' },
                ...departments.map(d => ({ value: d.id, label: d.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="create-designation"
              label="Designation / Job Title"
              placeholder="e.g. Senior Software Engineer"
              value={createForm.designation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, designation: e.target.value }))}
            />
            <Input
              id="create-phone"
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={createForm.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <Input
              id="create-basic-salary"
              label="Basic Salary (₹)"
              type="number"
              placeholder="50000"
              value={createForm.basic_salary}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, basic_salary: e.target.value }))}
            />
            <Input
              id="create-allowances"
              label="Allowances (₹)"
              type="number"
              placeholder="10000"
              value={createForm.allowances}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, allowances: e.target.value }))}
            />
            <Input
              id="create-deductions"
              label="Deductions (₹)"
              type="number"
              placeholder="5000"
              value={createForm.deductions}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, deductions: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Generated Credentials Modal */}
      <Modal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Employee Account Created Successfully!"
        size="md"
        footer={
          <Button id="close-credentials-modal-btn" size="sm" onClick={() => setCreatedCredentials(null)}>
            Done
          </Button>
        }
      >
        {createdCredentials && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Login credentials generated. Please share these with the employee.</span>
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee Code:</span>
                <span className="font-bold text-white">{createdCredentials.employee_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-bold text-white">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Initial Password:</span>
                <span className="font-bold text-emerald-400">{createdCredentials.initialPassword}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role:</span>
                <span className="font-bold text-amber-400">{createdCredentials.role}</span>
              </div>
            </div>

            <Button
              id="copy-credentials-btn"
              variant="outline"
              className="w-full text-xs"
              leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopyCredentials}
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Credentials to Clipboard'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Edit ${editModal?.first_name} ${editModal?.last_name}`}
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button id="save-employee-btn" size="sm" isLoading={saving} onClick={handleSave}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="edit-first-name" label="First Name" value={editForm.first_name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
            <Input id="edit-last-name" label="Last Name" value={editForm.last_name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
          </div>
          <Input id="edit-phone" label="Phone" value={editForm.phone || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(p => ({ ...p, phone: e.target.value }))} />
          <Select
            id="edit-dept"
            label="Department"
            value={editForm.department_id || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm(p => ({ ...p, department_id: e.target.value }))}
            options={departments.map(d => ({ value: d.id, label: d.name }))}
            placeholder="Select department"
          />
          <Input id="edit-designation" label="Designation" value={editForm.designation || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(p => ({ ...p, designation: e.target.value }))} />
          <Select
            id="edit-status"
            label="Status"
            value={editForm.status || 'ACTIVE'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm(p => ({ ...p, status: e.target.value as Employee['status'] }))}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'ON_LEAVE', label: 'On Leave' },
              { value: 'TERMINATED', label: 'Terminated' },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};
