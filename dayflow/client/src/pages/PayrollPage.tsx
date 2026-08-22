import React, { useEffect, useState, useRef } from 'react';
import {
  DollarSign, Download, Printer, Plus, ChevronLeft, ChevronRight,
  Calendar, Sliders, Search, Eye, ArrowUpDown, ArrowUp, ArrowDown,
  RotateCcw
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

type SortField = 'pay_period' | 'net_salary' | 'gross_salary' | 'payable_days' | 'deductions' | 'name';
type SortOrder = 'asc' | 'desc';

export const PayrollPage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [salaryStructure, setSalaryStructure] = useState<SalaryStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [payslipModal, setPayslipModal] = useState<Payroll | null>(null);
  const [payslipData, setPayslipData] = useState<Payroll | null>(null);

  // Filtering & Sorting State
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [customMonth, setCustomMonth] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('pay_period');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // HR Modal states
  const [salaryModal, setSalaryModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryForm, setSalaryForm] = useState({ employeeId: '', basic_salary: '', allowances: '', deductions: '', effective_from: '' });
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({ employeeId: '', pay_period: format(new Date(), 'yyyy-MM') });
  const [generateLoading, setGenerateLoading] = useState(false);

  const payslipRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const activeMonth = selectedMonth !== 'ALL' ? selectedMonth : undefined;
      if (!isHR) {
        const [payrollRes, ssRes] = await Promise.allSettled([
          payrollService.getMyPayroll({
            pay_period: activeMonth,
            sortBy,
            sortOrder,
            page,
            limit: 50,
          }),
          payrollService.getMySalaryStructure(),
        ]);
        if (payrollRes.status === 'fulfilled') {
          setPayrolls(payrollRes.value.payroll || []);
          setTotalPages(payrollRes.value.totalPages || 1);
        }
        if (ssRes.status === 'fulfilled') setSalaryStructure(ssRes.value);
      } else {
        const res = await payrollService.getAllPayroll({
          pay_period: activeMonth,
          sortBy,
          sortOrder,
          page,
          limit: 100,
        });
        setPayrolls(res.payroll || []);
        setTotalPages(res.totalPages || 1);
      }
    } catch {
      toast.error('Failed to load payroll records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, selectedMonth, sortBy, sortOrder]);

  useEffect(() => {
    if (isHR) {
      employeeService.getAll({ limit: 100 }).then((res: { employees?: Employee[] }) => setEmployees(res.employees || []));
    }
  }, [isHR]);

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleMonthPillClick = (month: string) => {
    setSelectedMonth(month);
    setCustomMonth(month === 'ALL' ? '' : month);
    setPage(1);
  };

  const handleCustomMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomMonth(val);
    setSelectedMonth(val || 'ALL');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedMonth('ALL');
    setCustomMonth('');
    setSearchQuery('');
    setSortBy('pay_period');
    setSortOrder('desc');
    setPage(1);
  };

  // Client-side filtering & sorting for smooth instant interactions
  const filteredAndSortedPayrolls = payrolls
    .filter((p) => {
      // 1. Month filter
      if (selectedMonth !== 'ALL' && p.pay_period !== selectedMonth) {
        return false;
      }
      // 2. Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const code = (p.employee_code || '').toLowerCase();
      const dept = (p.department_name || '').toLowerCase();
      const period = (p.pay_period || '').toLowerCase();
      return fullName.includes(q) || code.includes(q) || dept.includes(q) || period.includes(q);
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'pay_period':
          comparison = (a.pay_period || '').localeCompare(b.pay_period || '');
          break;
        case 'net_salary':
          comparison = Number(a.net_salary || 0) - Number(b.net_salary || 0);
          break;
        case 'gross_salary':
          comparison = Number(a.gross_salary || 0) - Number(b.gross_salary || 0);
          break;
        case 'deductions':
          comparison = Number(a.deductions || 0) - Number(b.deductions || 0);
          break;
        case 'payable_days':
          comparison = Number(a.payable_days || 0) - Number(b.payable_days || 0);
          break;
        case 'name':
          comparison = `${a.first_name || ''}`.localeCompare(`${b.first_name || ''}`);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // KPI Calculations on the filtered set
  const totalNetFiltered = filteredAndSortedPayrolls.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
  const totalGrossFiltered = filteredAndSortedPayrolls.reduce((sum, p) => sum + Number(p.gross_salary || 0), 0);
  const totalDeductionsFiltered = filteredAndSortedPayrolls.reduce((sum, p) => sum + Number(p.deductions || 0), 0);
  const avgPayableDays = filteredAndSortedPayrolls.length > 0
    ? (filteredAndSortedPayrolls.reduce((sum, p) => sum + Number(p.payable_days || 30), 0) / filteredAndSortedPayrolls.length).toFixed(1)
    : '0';

  const openPayslip = async (payroll: Payroll) => {
    try {
      const data = await payrollService.getPayslip(payroll.id);
      setPayslipData(data);
      setPayslipModal(payroll);
    } catch {
      toast.error('Failed to load payslip');
    }
  };

  const openSalaryModalForEmployee = (p: Payroll) => {
    setSalaryForm({
      employeeId: p.employee_id,
      basic_salary: String(p.basic_salary || ''),
      allowances: String(p.allowances || ''),
      deductions: String(p.salary_deductions || p.deductions || ''),
      effective_from: new Date().toISOString().split('T')[0],
    });
    setSalaryModal(true);
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
      setSalaryForm({ employeeId: '', basic_salary: '', allowances: '', deductions: '', effective_from: '' });
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

  // Recent 6 months for quick selection pills
  const quickMonths = [
    { label: '🌟 All Months', value: 'ALL' },
    { label: 'Current Month (2026-08)', value: '2026-08' },
    { label: 'Jul 2026', value: '2026-07' },
    { label: 'Jun 2026', value: '2026-06' },
    { label: 'May 2026', value: '2026-05' },
    { label: 'Apr 2026', value: '2026-04' },
  ];

  const isFilterActive = selectedMonth !== 'ALL' || searchQuery.trim() !== '' || sortBy !== 'pay_period' || sortOrder !== 'desc';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {isHR ? 'Payroll & Payslip Administration' : 'My Salary & Payslips'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isHR
              ? 'Calculate attendance-driven payroll, manage salary structures, and issue payslips'
              : 'View monthly attendance-based salary calculations, filter by month, and download payslips'
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
              Generate Monthly Payroll
            </Button>
          </div>
        )}
      </div>

      {/* Base Salary Structure (Employee Only) */}
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

      {/* Month-Wise Filter & Sort Control Toolbar */}
      <Card className="bg-white border border-stone-200/90 shadow-xs">
        <div className="space-y-4">
          {/* Row 1: Quick Month Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Month Filter:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {quickMonths.map((m) => {
                const isActive = selectedMonth === m.value;
                return (
                  <button
                    key={m.value}
                    id={`payroll-month-pill-${m.value}`}
                    type="button"
                    onClick={() => handleMonthPillClick(m.value)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}

              {/* Custom Month Picker */}
              <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                <label htmlFor="custom-month-input" className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                  Custom:
                </label>
                <input
                  id="custom-month-input"
                  type="month"
                  value={customMonth}
                  onChange={handleCustomMonthChange}
                  className="px-2 py-1 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Search, Sort Dropdown & Reset */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="flex-1 max-w-sm">
              <Input
                id="payroll-search-input"
                placeholder={isHR ? 'Search employee, code, department, month...' : 'Search by pay period (e.g. 2026-08)...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                className="py-1.5 text-xs"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold text-slate-600">Sort By:</span>
                <select
                  id="payroll-sort-select"
                  value={`${sortBy}_${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('_') as [SortField, SortOrder];
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="bg-transparent text-xs font-bold text-blue-700 focus:outline-none cursor-pointer py-0.5"
                >
                  <option value="pay_period_desc">📅 Period (Newest First)</option>
                  <option value="pay_period_asc">📅 Period (Oldest First)</option>
                  <option value="net_salary_desc">💰 Net Salary (High to Low)</option>
                  <option value="net_salary_asc">💰 Net Salary (Low to High)</option>
                  <option value="payable_days_desc">⏱️ Payable Days (Most Worked)</option>
                  <option value="payable_days_asc">⏱️ Payable Days (Least Worked)</option>
                  <option value="gross_salary_desc">📊 Gross Salary (High to Low)</option>
                  {isHR && <option value="name_asc">👤 Employee Name (A - Z)</option>}
                  {isHR && <option value="name_desc">👤 Employee Name (Z - A)</option>}
                </select>
              </div>

              {isFilterActive && (
                <Button
                  id="reset-payroll-filters-btn"
                  size="sm"
                  variant="ghost"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
                  onClick={handleResetFilters}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Filtered Monthly Financial Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Net Disbursed</p>
          <p className="text-xl font-extrabold text-emerald-900 mt-1">
            ₹{totalNetFiltered.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Across {filteredAndSortedPayrolls.length} payslip(s)</p>
        </div>

        <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Total Gross Earned</p>
          <p className="text-xl font-extrabold text-blue-900 mt-1">
            ₹{totalGrossFiltered.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-blue-700 mt-0.5">Attendance-adjusted gross</p>
        </div>

        <div className="p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Avg Payable Days</p>
          <p className="text-xl font-extrabold text-purple-900 mt-1">{avgPayableDays} Days</p>
          <p className="text-[10px] text-purple-700 mt-0.5">Per payroll month</p>
        </div>

        <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-2xl">
          <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Deductions</p>
          <p className="text-xl font-extrabold text-rose-900 mt-1">
            -₹{totalDeductionsFiltered.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-rose-700 mt-0.5">Tax & attendance adjustments</p>
        </div>
      </div>

      {/* Payroll Records Table */}
      <Card>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                {isHR ? 'All Employees Payroll Ledger' : 'My Payroll History'}
              </h3>
              <Badge variant="blue">{filteredAndSortedPayrolls.length} Payslip{filteredAndSortedPayrolls.length !== 1 ? 's' : ''}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Click table headers to toggle sorting order · Select periods above to filter by month
            </p>
          </div>
        </div>

        {isLoading ? (
          <Loader className="h-32" />
        ) : filteredAndSortedPayrolls.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-10 h-10" />}
            title="No payroll records found"
            description={isFilterActive ? "No payslips match your active month filter or search query." : "No payroll has been computed yet."}
            action={isFilterActive ? (
              <Button size="sm" variant="outline" onClick={handleResetFilters} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                Clear All Filters
              </Button>
            ) : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    {isHR && (
                      <th
                        onClick={() => handleSortChange('name')}
                        className="text-left py-3 px-3 text-xs font-bold text-slate-600 cursor-pointer select-none hover:bg-slate-100 rounded-l-lg transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Employee</span>
                          {sortBy === 'name' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />}
                        </div>
                      </th>
                    )}
                    <th
                      onClick={() => handleSortChange('pay_period')}
                      className="text-left py-3 px-3 text-xs font-bold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Pay Period</span>
                        {sortBy === 'pay_period' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('payable_days')}
                      className="text-left py-3 px-3 text-xs font-bold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Payable Days</span>
                        {sortBy === 'payable_days' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('gross_salary')}
                      className="text-left py-3 px-3 text-xs font-bold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Gross Earned</span>
                        {sortBy === 'gross_salary' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('deductions')}
                      className="text-left py-3 px-3 text-xs font-bold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Deductions</span>
                        {sortBy === 'deductions' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('net_salary')}
                      className="text-left py-3 px-3 text-xs font-bold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Net Disbursed</span>
                        {sortBy === 'net_salary' ? (sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />}
                      </div>
                    </th>
                    <th className="text-right py-3 px-3 text-xs font-bold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPayrolls.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {isHR && (
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-800">{p.first_name} {p.last_name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>{p.employee_code}</span>
                            {p.department_name && <span>· {p.department_name}</span>}
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-3">
                        <Badge variant="blue">{p.pay_period}</Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="font-bold text-blue-700">
                          {p.payable_days !== undefined ? p.payable_days : p.total_working_days || 30}
                        </span>
                        <span className="text-slate-400 text-xs"> / {p.total_working_days || 30} d</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-semibold">
                        ₹{Number(p.gross_salary).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-red-600 font-medium">
                        -₹{Number(p.deductions).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-emerald-700 font-extrabold text-sm">
                        ₹{Number(p.net_salary).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            id={`view-payslip-${p.id}`}
                            size="sm"
                            variant="ghost"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => openPayslip(p)}
                            className="text-xs"
                          >
                            View Payslip
                          </Button>
                          {isHR && (
                            <Button
                              id={`edit-salary-structure-${p.id}`}
                              size="sm"
                              variant="outline"
                              leftIcon={<Sliders className="w-3.5 h-3.5 text-blue-600" />}
                              onClick={() => openSalaryModalForEmployee(p)}
                              className="text-xs"
                            >
                              Structure
                            </Button>
                          )}
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
