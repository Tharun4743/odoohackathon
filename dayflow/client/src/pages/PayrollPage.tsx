import React, { useEffect, useState, useRef } from 'react';
import {
  DollarSign, Download, Printer, Plus,
  Calendar, Sliders, Search, Eye,
  ChevronDown, ChevronUp, User
} from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Loader, EmptyState, Input, Select } from '../components/ui';
import { Modal } from '../components/ui/Modal';
import type { Payroll, Employee, SalaryStructure } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { downloadPayslipPDF } from '../utils/pdfExport';

const PayslipContent = React.forwardRef<HTMLDivElement, { payslip: Payroll }>(({ payslip }, ref) => {
  const totalDays = payslip.total_working_days || 30;
  const payableDays = payslip.payable_days !== undefined ? Number(payslip.payable_days) : totalDays;
  const presentDays = payslip.present_days !== undefined ? Number(payslip.present_days) : payableDays;
  const paidLeaveDays = payslip.paid_leave_days !== undefined ? Number(payslip.paid_leave_days) : 0;
  const unpaidDays = payslip.unpaid_leave_days !== undefined ? Number(payslip.unpaid_leave_days) : 0;
  const absentDays = payslip.absent_days !== undefined ? Number(payslip.absent_days) : 0;

  const baseBasic = Number(payslip.basic_salary || 0);
  const baseAllowances = Number(payslip.allowances || 0);
  const baseGross = baseBasic + baseAllowances;

  return (
    <div ref={ref} className="p-8 bg-white min-w-[620px] text-slate-800 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Work Suite HRMS</h1>
          <p className="text-slate-500 text-xs">"Every workday, perfectly aligned."</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-800 text-lg">SALARY PAYSLIP</p>
          <p className="text-sm text-slate-600 font-medium">Pay Period: {payslip.pay_period}</p>
          <p className="text-xs text-slate-400">Generated: {format(new Date(), 'MMM d, yyyy')}</p>
        </div>
      </div>

      {/* Employee & Payroll Info */}
      <div className="grid grid-cols-2 gap-6 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <p className="text-[11px] text-slate-500 mb-2 font-bold uppercase tracking-wider">Employee Information</p>
          <table className="text-xs space-y-1">
            <tbody>
              {[
                ['Name', `${payslip.first_name || ''} ${payslip.last_name || ''}`.trim() || 'Employee'],
                ['Employee Code', payslip.employee_code || '—'],
                ['Department', payslip.department_name || '—'],
                ['Designation', payslip.designation || '—'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="text-slate-500 pr-3 py-0.5">{k}:</td>
                  <td className="font-semibold text-slate-800">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 mb-2 font-bold uppercase tracking-wider">Attendance Summary (Inputs into Payroll)</p>
          <table className="text-xs">
            <tbody>
              {[
                ['Month Days', `${totalDays} days`],
                ['Present Days', `${presentDays} days`],
                ['Paid Time Off', `${paidLeaveDays} days`],
                ['Unpaid / Absent Days', `${unpaidDays + absentDays} days`],
                ['Total Payable Days', `${payableDays} / ${totalDays} days`],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="text-slate-500 pr-3 py-0.5">{k}:</td>
                  <td className="font-semibold text-slate-800">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Computation Breakdown */}
      <div className="grid grid-cols-2 gap-6 mb-5">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Earnings (Attendance Adjusted)</p>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600">Base Basic Salary</td>
                <td className="text-right font-medium text-slate-700">₹{baseBasic.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600">Base Allowances</td>
                <td className="text-right font-medium text-slate-700">₹{baseAllowances.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <td className="py-1.5 text-slate-700 font-medium">Base Gross ({totalDays} Days)</td>
                <td className="text-right font-semibold text-slate-800">₹{baseGross.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="border-t-2 border-slate-300 font-bold bg-blue-50/40">
                <td className="py-2 text-blue-900">Attendance-Earned Gross ({payableDays} Payable Days)</td>
                <td className="py-2 text-right text-blue-900">₹{Number(payslip.gross_salary).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deductions & Adjustments</p>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600">Statutory & Structure Deductions</td>
                <td className="text-right font-medium text-red-600">₹{Number(payslip.salary_deductions || payslip.deductions || 0).toLocaleString('en-IN')}</td>
              </tr>
              {unpaidDays + absentDays > 0 && (
                <tr className="border-b border-slate-100 text-amber-700">
                  <td className="py-1.5">Unpaid Absence ({unpaidDays + absentDays} days)</td>
                  <td className="text-right font-medium">Pro-rated in Gross</td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-300 font-bold bg-red-50/40">
                <td className="py-2 text-red-900">Total Deductions</td>
                <td className="py-2 text-right text-red-900">-₹{Number(payslip.deductions).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Salary Box */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Net Salary Payable</p>
          <p className="text-xs text-blue-600">Calculated based on {payableDays} payable days for {payslip.pay_period}</p>
        </div>
        <p className="text-2xl font-black text-blue-900">₹{Number(payslip.net_salary).toLocaleString('en-IN')}</p>
      </div>

      <p className="text-[11px] text-slate-400 text-center mt-5">
        This is a system-computed payslip generated from verified biometric/web attendance logs and approved time-off requests.
      </p>
    </div>
  );
});
PayslipContent.displayName = 'PayslipContent';

interface EmployeePayrollGroup {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentName: string;
  basicSalary: number;
  allowances: number;
  totalNetPaid: number;
  totalGrossPaid: number;
  payslips: Payroll[];
}

export const PayrollPage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [salaryStructure, setSalaryStructure] = useState<SalaryStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payslipModal, setPayslipModal] = useState<Payroll | null>(null);
  const [payslipData, setPayslipData] = useState<Payroll | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  // HR Modal states
  const [salaryModal, setSalaryModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryForm, setSalaryForm] = useState({ employeeId: '', basic_salary: '', allowances: '', deductions: '', effective_from: '' });
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({ employeeId: '', pay_period: '2026-08' });
  const [generateLoading, setGenerateLoading] = useState(false);

  const payslipRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!isHR) {
        const [payrollRes, ssRes] = await Promise.allSettled([
          payrollService.getMyPayroll({ limit: 100 }),
          payrollService.getMySalaryStructure(),
        ]);
        if (payrollRes.status === 'fulfilled') {
          setPayrolls(payrollRes.value.payroll || []);
        }
        if (ssRes.status === 'fulfilled') setSalaryStructure(ssRes.value);
      } else {
        const res = await payrollService.getAllPayroll({ limit: 200 });
        setPayrolls(res.payroll || []);
      }
    } catch {
      toast.error('Failed to load payroll records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isHR) {
      employeeService.getAll({ limit: 100 }).then((res: { employees?: Employee[] }) => setEmployees(res.employees || []));
    }
  }, [isHR]);

  // Group all payroll records by unique Employee
  const employeeGroups: EmployeePayrollGroup[] = React.useMemo(() => {
    const map = new Map<string, EmployeePayrollGroup>();

    payrolls.forEach((p) => {
      const empId = p.employee_id;
      if (!map.has(empId)) {
        map.set(empId, {
          employeeId: empId,
          employeeCode: p.employee_code || 'EMP',
          firstName: p.first_name || '',
          lastName: p.last_name || '',
          departmentName: p.department_name || 'General',
          basicSalary: Number(p.basic_salary || 0),
          allowances: Number(p.allowances || 0),
          totalNetPaid: 0,
          totalGrossPaid: 0,
          payslips: [],
        });
      }
      const group = map.get(empId)!;
      group.payslips.push(p);
      group.totalNetPaid += Number(p.net_salary || 0);
      group.totalGrossPaid += Number(p.gross_salary || 0);
    });

    // Sort payslips inside each employee by pay_period descending (newest month first)
    map.forEach((g) => {
      g.payslips.sort((a, b) => (b.pay_period || '').localeCompare(a.pay_period || ''));
    });

    return Array.from(map.values()).sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
  }, [payrolls]);

  // Filtered employee groups based on search & month filter
  const filteredEmployeeGroups = employeeGroups.filter((g) => {
    // Search query
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${g.firstName} ${g.lastName}`.toLowerCase();
    const code = g.employeeCode.toLowerCase();
    const dept = g.departmentName.toLowerCase();
    const matchesSearch = !q || fullName.includes(q) || code.includes(q) || dept.includes(q);

    if (!matchesSearch) return false;

    // Month filter
    if (monthFilter !== 'ALL') {
      return g.payslips.some((p) => p.pay_period === monthFilter);
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

  const openPayslip = async (payroll: Payroll) => {
    try {
      const data = await payrollService.getPayslip(payroll.id);
      setPayslipData(data);
      setPayslipModal(payroll);
    } catch {
      toast.error('Failed to load payslip');
    }
  };

  const openSalaryModalForEmployee = (g: EmployeePayrollGroup) => {
    const latest = g.payslips[0];
    setSalaryForm({
      employeeId: g.employeeId,
      basic_salary: String(latest?.basic_salary || g.basicSalary || ''),
      allowances: String(latest?.allowances || g.allowances || ''),
      deductions: String(latest?.salary_deductions || latest?.deductions || '0'),
      effective_from: new Date().toISOString().split('T')[0],
    });
    setSalaryModal(true);
  };

  const openGenerateModalForEmployee = (g: EmployeePayrollGroup) => {
    setGenerateForm({
      employeeId: g.employeeId,
      pay_period: '2026-08',
    });
    setGenerateModal(true);
  };

  const handleExportPDF = () => {
    const target = payslipData || payslipModal;
    if (!target) {
      toast.error('No payslip data loaded');
      return;
    }
    downloadPayslipPDF(target);
  };

  const handleCreateSalary = async () => {
    if (!salaryForm.employeeId || !salaryForm.basic_salary) {
      toast.error('Employee and basic salary are required');
      return;
    }
    setSalaryLoading(true);
    try {
      await payrollService.createSalaryStructure({
        employeeId: salaryForm.employeeId,
        basic_salary: parseFloat(salaryForm.basic_salary),
        allowances: parseFloat(salaryForm.allowances) || 0,
        deductions: parseFloat(salaryForm.deductions) || 0,
        effective_from: salaryForm.effective_from || new Date().toISOString().split('T')[0],
      });
      toast.success('Salary structure updated successfully! Future payroll will reflect these changes.');
      setSalaryModal(false);
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save salary structure');
    } finally {
      setSalaryLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!generateForm.employeeId || !generateForm.pay_period) {
      toast.error('Employee and pay period are required');
      return;
    }
    setGenerateLoading(true);
    try {
      await payrollService.generatePayroll(generateForm);
      toast.success('Payroll generated from attendance data!');
      setGenerateModal(false);
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Distinct available months across records
  const distinctMonths = Array.from(new Set(payrolls.map((p) => p.pay_period))).sort().reverse();

  // Grand totals across all records
  const grandTotalNet = payrolls.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
  const grandTotalGross = payrolls.reduce((sum, p) => sum + Number(p.gross_salary || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {isHR ? 'Employee Payroll Directory (Month-Wise Records)' : 'My Salary & Payslip History'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isHR
              ? 'List of all personnel with month-by-month attendance-driven salary computations and payslips'
              : 'View your attendance-driven monthly salary computations and download official payslips'
            }
          </p>
        </div>
        {isHR && (
          <div className="flex gap-2">
            <Button
              id="create-salary-btn"
              size="sm"
              variant="outline"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setSalaryModal(true)}
            >
              Salary Structure
            </Button>
            <Button
              id="generate-payroll-btn"
              size="sm"
              variant="primary"
              leftIcon={<DollarSign className="w-3.5 h-3.5" />}
              onClick={() => setGenerateModal(true)}
            >
              Compute Monthly Payroll
            </Button>
          </div>
        )}
      </div>

      {/* Base Salary Structure (Employee Only View) */}
      {!isHR && salaryStructure && (
        <Card className="border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Base Salary Structure Overview</h3>
            <span className="text-[11px] text-slate-400">
              Effective: {format(new Date(salaryStructure.effective_from), 'MMMM d, yyyy')}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Basic Salary', value: salaryStructure.basic_salary, color: 'text-slate-800' },
              { label: 'Allowances', value: salaryStructure.allowances, color: 'text-emerald-600' },
              { label: 'Deductions', value: salaryStructure.deductions, color: 'text-red-600' },
              {
                label: 'Base Gross (Full Month)',
                value: Number(salaryStructure.basic_salary) + Number(salaryStructure.allowances),
                color: 'text-blue-700'
              },
            ].map(item => (
              <div key={item.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-500 mb-0.5">{item.label}</p>
                <p className={`text-base font-bold ${item.color}`}>₹{Number(item.value).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Total Personnel Enrolled</p>
          <p className="text-xl font-extrabold text-blue-900 mt-1">{employeeGroups.length} Employees</p>
          <p className="text-[10px] text-blue-700 mt-0.5">Unique team members</p>
        </div>

        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Net Disbursed</p>
          <p className="text-xl font-extrabold text-emerald-900 mt-1">
            ₹{grandTotalNet.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Across {payrolls.length} total monthly payslips</p>
        </div>

        <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Total Gross Accrued</p>
          <p className="text-xl font-extrabold text-purple-900 mt-1">
            ₹{grandTotalGross.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-purple-700 mt-0.5">Attendance-earned gross</p>
        </div>

        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Active Pay Periods</p>
          <p className="text-xl font-extrabold text-amber-900 mt-1">{distinctMonths.length} Months</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Historical payroll cycles</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="bg-white border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search by Employee Name or Code */}
          <div className="flex-1 max-w-md">
            <Input
              id="payroll-employee-search"
              placeholder="Search employee by name, code, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="text-xs"
            />
          </div>

          {/* Month Scope Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-slate-600">Month Filter:</span>
              <select
                id="payroll-month-filter"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-blue-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">🌟 All Months</option>
                {distinctMonths.map((m) => (
                  <option key={m} value={m}>📅 {m}</option>
                ))}
              </select>
            </div>

            {/* Expand / Collapse All */}
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

      {/* Main Employee Accordion List (Unique Names with Month-Wise Details Inside) */}
      <div className="space-y-4">
        {isLoading ? (
          <Loader className="h-32" />
        ) : filteredEmployeeGroups.length === 0 ? (
          <EmptyState
            icon={<User className="w-10 h-10 text-slate-400" />}
            title="No employee payroll records found"
            description={searchQuery || monthFilter !== 'ALL' ? "No records match your search query or selected month filter." : "No payroll records have been generated yet."}
          />
        ) : (
          filteredEmployeeGroups.map((group) => {
            const isExpanded = expandedEmployees[group.employeeId] !== false; // expanded by default
            const displayedPayslips = monthFilter === 'ALL'
              ? group.payslips
              : group.payslips.filter((p) => p.pay_period === monthFilter);

            return (
              <div
                key={group.employeeId}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Employee Master Row Header */}
                <div
                  onClick={() => toggleExpand(group.employeeId)}
                  className="p-4 cursor-pointer select-none bg-slate-50/60 hover:bg-slate-100/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-sm border border-blue-200 flex-shrink-0">
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
                      <p className="text-xs text-slate-500 mt-0.5">
                        Base Structure: <strong className="text-slate-700">₹{(group.basicSalary + group.allowances).toLocaleString('en-IN')}</strong> / month · {group.payslips.length} Monthly Payslip{group.payslips.length !== 1 ? 's' : ''} on record
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Net Paid</p>
                      <p className="text-base font-black text-emerald-700">
                        ₹{group.totalNetPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {isHR && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          id={`structure-btn-${group.employeeId}`}
                          size="sm"
                          variant="outline"
                          leftIcon={<Sliders className="w-3.5 h-3.5 text-blue-600" />}
                          onClick={() => openSalaryModalForEmployee(group)}
                          className="text-xs"
                        >
                          Structure
                        </Button>
                        <Button
                          id={`generate-btn-${group.employeeId}`}
                          size="sm"
                          variant="ghost"
                          leftIcon={<Plus className="w-3.5 h-3.5 text-slate-600" />}
                          onClick={() => openGenerateModalForEmployee(group)}
                          className="text-xs text-slate-700 hover:bg-slate-200"
                        >
                          Generate
                        </Button>
                      </div>
                    )}

                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Month-Wise Breakdown Table Inside Employee */}
                {isExpanded && (
                  <div className="p-4 bg-white">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        📅 Month-Wise Salary & Attendance Computations ({displayedPayslips.length} Periods)
                      </span>
                    </div>

                    {displayedPayslips.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                        No payslips for selected month filter.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold">
                              <th className="text-left py-2.5 px-3">Pay Period</th>
                              <th className="text-left py-2.5 px-3">Payable Days</th>
                              <th className="text-left py-2.5 px-3">Base Basic</th>
                              <th className="text-left py-2.5 px-3">Gross Earned</th>
                              <th className="text-left py-2.5 px-3">Deductions</th>
                              <th className="text-left py-2.5 px-3">Net Disbursed</th>
                              <th className="text-right py-2.5 px-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {displayedPayslips.map((p) => (
                              <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-2.5 px-3">
                                  <Badge variant="blue">{p.pay_period}</Badge>
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-700">
                                  <span className="font-bold text-blue-700">
                                    {p.payable_days !== undefined ? p.payable_days : p.total_working_days || 30}
                                  </span>
                                  <span className="text-slate-400"> / {p.total_working_days || 30} d</span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  ₹{Number(p.basic_salary || group.basicSalary).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  ₹{Number(p.gross_salary).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-red-600">
                                  -₹{Number(p.deductions).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 font-black text-emerald-700 text-sm">
                                  ₹{Number(p.net_salary).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <Button
                                    id={`view-payslip-${p.id}`}
                                    size="sm"
                                    variant="ghost"
                                    leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                                    onClick={() => openPayslip(p)}
                                    className="text-xs text-blue-700 hover:bg-blue-50"
                                  >
                                    View Payslip
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Payslip View Modal */}
      <Modal
        isOpen={!!payslipModal}
        onClose={() => { setPayslipModal(null); setPayslipData(null); }}
        title="Official Salary Payslip"
        size="xl"
        footer={
          <>
            <Button id="print-payslip-btn" variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print</Button>
            <Button id="download-payslip-btn" size="sm" variant="primary" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportPDF}>Download PDF</Button>
          </>
        }
      >
        {payslipData && <PayslipContent ref={payslipRef} payslip={payslipData} />}
      </Modal>

      {/* Create / Edit Salary Structure Modal (HR) */}
      <Modal
        isOpen={salaryModal}
        onClose={() => setSalaryModal(false)}
        title="Configure Employee Salary Structure"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setSalaryModal(false)}>Cancel</Button>
            <Button id="save-salary-btn" size="sm" variant="primary" isLoading={salaryLoading} onClick={handleCreateSalary}>
              Save Structure
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee *</label>
            <Select
              id="salary-employee-select"
              value={salaryForm.employeeId}
              onChange={(e) => setSalaryForm(f => ({ ...f, employeeId: e.target.value }))}
              options={[
                { value: '', label: 'Select an employee...' },
                ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` }))
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Basic Salary (₹) *</label>
              <Input
                id="salary-basic-input"
                type="number"
                value={salaryForm.basic_salary}
                onChange={(e) => setSalaryForm(f => ({ ...f, basic_salary: e.target.value }))}
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Allowances (₹)</label>
              <Input
                id="salary-allowances-input"
                type="number"
                value={salaryForm.allowances}
                onChange={(e) => setSalaryForm(f => ({ ...f, allowances: e.target.value }))}
                placeholder="e.g. 10000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Standard Deductions (₹)</label>
              <Input
                id="salary-deductions-input"
                type="number"
                value={salaryForm.deductions}
                onChange={(e) => setSalaryForm(f => ({ ...f, deductions: e.target.value }))}
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Effective Date</label>
              <Input
                id="salary-effective-input"
                type="date"
                value={salaryForm.effective_from}
                onChange={(e) => setSalaryForm(f => ({ ...f, effective_from: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Generate Payroll Modal (HR) */}
      <Modal
        isOpen={generateModal}
        onClose={() => setGenerateModal(false)}
        title="Generate Monthly Payroll"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setGenerateModal(false)}>Cancel</Button>
            <Button id="submit-generate-payroll-btn" size="sm" variant="primary" isLoading={generateLoading} onClick={handleGeneratePayroll}>
              Compute from Attendance
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
            <p className="font-semibold mb-1">Attendance-Driven Salary Calculation</p>
            <p>Payroll will pull verified biometric punch hours, present days, half-days, and approved paid leaves for the selected month to compute accurate gross and net salary.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Employee *</label>
            <Select
              id="generate-employee-select"
              value={generateForm.employeeId}
              onChange={(e) => setGenerateForm(f => ({ ...f, employeeId: e.target.value }))}
              options={[
                { value: '', label: 'Select an employee...' },
                ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` }))
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pay Period (YYYY-MM) *</label>
            <Input
              id="generate-period-input"
              type="month"
              value={generateForm.pay_period}
              onChange={(e) => setGenerateForm(f => ({ ...f, pay_period: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
