import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Edit2, ChevronLeft, ChevronRight, Users, UserPlus, Check, Copy } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { Card, Button, Input, Select, Badge, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import type { Employee, Department } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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
    } catch { toast.error('Failed to load employees'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    employeeService.getDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(debounce);
  }, [search, deptFilter, statusFilter, page]);

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
    } catch { toast.error('Failed to update employee'); }
    finally { setSaving(false); }
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
    const text = `Dayflow HRMS Credentials:
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Employee Directory</h2>
          <p className="text-sm text-slate-500">{total} total registered employees</p>
        </div>
        <Button
          id="add-employee-btn"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setCreateModal(true)}
        >
          Add Employee
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <Input
            id="emp-search"
            placeholder="Search by name, code, email..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1"
          />
          <Select
            id="dept-filter"
            value={deptFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setDeptFilter(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All Departments' }, ...departments.map(d => ({ value: d.id, label: d.name }))]}
            className="w-44"
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
            className="w-36"
          />
        </div>

        {isLoading ? <Loader className="h-32" /> : employees.length === 0 ? (
          <EmptyState
            icon={<Users className="w-10 h-10" />}
            title="No employees found"
            description="Try adjusting your search or add a new employee."
            action={<Button onClick={() => setCreateModal(true)}>Add Employee</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-3">Employee</th>
                    <th className="text-left py-3 px-3">Code</th>
                    <th className="text-left py-3 px-3">Department</th>
                    <th className="text-left py-3 px-3">Designation</th>
                    <th className="text-left py-3 px-3">Joining Date</th>
                    <th className="text-left py-3 px-3">Status</th>
                    <th className="text-right py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                            {emp.profile_image
                              ? <img src={emp.profile_image} alt="" className="w-full h-full object-cover" />
                              : `${emp.first_name[0]}${emp.last_name?.[0] || ''}`
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-slate-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600 font-medium">{emp.employee_code}</td>
                      <td className="py-3 px-3 text-slate-600">{emp.department_name || '—'}</td>
                      <td className="py-3 px-3 text-slate-600">{emp.designation || '—'}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {emp.joining_date ? format(new Date(emp.joining_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={emp.status === 'ACTIVE' ? 'green' : emp.status === 'ON_LEAVE' ? 'yellow' : 'red'}>
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-1">
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
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
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
                <p className="text-sm text-slate-500">Page {page} of {totalPages} ({total} total)</p>
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

      {/* Add Employee Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Add New Employee (HR Provisioning)"
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button
              id="confirm-create-employee-btn"
              size="sm"
              isLoading={creating}
              onClick={handleCreateEmployee}
            >
              Create Account & Generate Password
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="create-first-name"
              label="First Name"
              value={createForm.first_name}
              onChange={(e) => setCreateForm(p => ({ ...p, first_name: e.target.value }))}
              placeholder="e.g. John"
              required
            />
            <Input
              id="create-last-name"
              label="Last Name"
              value={createForm.last_name}
              onChange={(e) => setCreateForm(p => ({ ...p, last_name: e.target.value }))}
              placeholder="e.g. Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="create-email"
              label="Email (Login Username)"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
              placeholder="john.doe@company.com"
              required
            />
            <Input
              id="create-emp-code"
              label="Employee ID / Code"
              value={createForm.employee_code}
              onChange={(e) => setCreateForm(p => ({ ...p, employee_code: e.target.value }))}
              placeholder="Auto-generated if blank (e.g. EMP-009)"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              id="create-dept"
              label="Department"
              value={createForm.department_id}
              onChange={(e) => setCreateForm(p => ({ ...p, department_id: e.target.value }))}
              options={departments.map(d => ({ value: d.id, label: d.name }))}
              placeholder="Select department"
            />
            <Input
              id="create-designation"
              label="Designation"
              value={createForm.designation}
              onChange={(e) => setCreateForm(p => ({ ...p, designation: e.target.value }))}
              placeholder="e.g. Software Engineer"
            />
            <Select
              id="create-role"
              label="User Role"
              value={createForm.role}
              onChange={(e) => setCreateForm(p => ({ ...p, role: e.target.value as 'EMPLOYEE' | 'HR' | 'ADMIN' }))}
              options={[
                { value: 'EMPLOYEE', label: 'Employee' },
                { value: 'HR', label: 'HR Officer' },
                { value: 'ADMIN', label: 'Administrator' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="create-phone"
              label="Phone Number"
              value={createForm.phone}
              onChange={(e) => setCreateForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+91 9876543210"
            />
            <Input
              id="create-joining-date"
              label="Joining Date"
              type="date"
              value={createForm.joining_date}
              onChange={(e) => setCreateForm(p => ({ ...p, joining_date: e.target.value }))}
            />
          </div>

          {/* Salary Structure */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Initial Salary Structure (Optional)</p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                id="create-basic-salary"
                label="Basic Salary (₹)"
                type="number"
                value={createForm.basic_salary}
                onChange={(e) => setCreateForm(p => ({ ...p, basic_salary: e.target.value }))}
                placeholder="50000"
              />
              <Input
                id="create-allowances"
                label="Allowances (₹)"
                type="number"
                value={createForm.allowances}
                onChange={(e) => setCreateForm(p => ({ ...p, allowances: e.target.value }))}
                placeholder="10000"
              />
              <Input
                id="create-deductions"
                label="Deductions (₹)"
                type="number"
                value={createForm.deductions}
                onChange={(e) => setCreateForm(p => ({ ...p, deductions: e.target.value }))}
                placeholder="3000"
              />
            </div>
          </div>

          <Input
            id="create-custom-password"
            label="Initial Password (Leave blank to auto-generate)"
            type="text"
            value={createForm.initial_password}
            onChange={(e) => setCreateForm(p => ({ ...p, initial_password: e.target.value }))}
            placeholder="e.g. Dayflow@4921"
            helperText="Employee will use this password to log in and will be prompted to change it."
          />
        </form>
      </Modal>

      {/* Generated Credentials Success Modal */}
      <Modal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Employee Account Created Successfully"
        size="md"
        footer={
          <Button
            id="done-credentials-btn"
            variant="primary"
            className="w-full"
            onClick={() => setCreatedCredentials(null)}
          >
            Done
          </Button>
        }
      >
        {createdCredentials && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              Account created with system-generated initial credentials. Please share these credentials securely with the employee.
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 font-mono text-xs select-all">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee Code:</span>
                <span className="font-bold text-blue-400">{createdCredentials.employee_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email (Username):</span>
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
              className="w-full"
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
