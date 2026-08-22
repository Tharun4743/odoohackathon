import React, { useEffect, useState, useRef } from 'react';
import { DollarSign, Download, Printer, Plus, ChevronLeft, ChevronRight, Calendar, Sliders, Search, Eye } from 'lucide-react';
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dayflow HRMS</h1>
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
                ['Name', `${payslip.first_name} ${payslip.last_name}`],
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
                <td className="text-right text-blue-900">₹{Number(payslip.gross_salary).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deductions</p>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600">Standard Deductions (TDS, PF, etc.)</td>
                <td className="text-right font-medium text-red-600">₹{Number(payslip.deductions).toLocaleString('en-IN')}</td>
              </tr>
              {unpaidDays + absentDays > 0 && (
                <tr className="border-b border-slate-100 text-amber-700">
                  <td className="py-1.5">Unpaid / Absent Deduction ({unpaidDays + absentDays} days)</td>
                  <td className="text-right font-medium">-₹{(Math.max(0, baseGross - Number(payslip.gross_salary))).toLocaleString('en-IN')}</td>
                </tr>
              )}
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
  const [salaryModal, setSalaryModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryForm, setSalaryForm] = useState({ employeeId: '', basic_salary: '', allowances: '', deductions: '', effective_from: '' });
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({ employeeId: '', pay_period: format(new Date(), 'yyyy-MM') });
  const [generateLoading, setGenerateLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const payslipRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!isHR) {
        const [payrollRes, ssRes] = await Promise.allSettled([
          payrollService.getMyPayroll({ page, limit: 12 }),
          payrollService.getMySalaryStructure(),
        ]);
        if (payrollRes.status === 'fulfilled') {
          setPayrolls(payrollRes.value.payroll || []);
          setTotalPages(payrollRes.value.totalPages || 1);
        }
        if (ssRes.status === 'fulfilled') setSalaryStructure(ssRes.value);
      } else {
        const res = await payrollService.getAllPayroll({ page, limit: 15 });
        setPayrolls(res.payroll || []);
        setTotalPages(res.totalPages || 1);
      }
    } catch { toast.error('Failed to load payroll'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page]);

  useEffect(() => {
    if (isHR) {
      employeeService.getAll({ limit: 100 }).then((res: { employees?: Employee[] }) => setEmployees(res.employees || []));
    }
  }, [isHR]);

  const openPayslip = async (payroll: Payroll) => {
    try {
      const data = await payrollService.getPayslip(payroll.id);
      setPayslipData(data);
      setPayslipModal(payroll);
    } catch { toast.error('Failed to load payslip'); }
  };

  const openSalaryModalForEmployee = (p: Payroll) => {
    setSalaryForm({
      employeeId: p.employee_id,
      basic_salary: String(p.basic_salary || ''),
      allowances: String(p.allowances || ''),
      deductions: String(p.deductions || ''),
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
    } finally { setSalaryLoading(false); }
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
    } finally { setGenerateLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {isHR ? 'Payroll & Payslip Administration' : 'My Salary & Payslips'}
          </h2>
          <p className="text-sm text-slate-500">
            {isHR
              ? 'Calculate attendance-driven payroll, manage salary structures, and issue payslips'
              : 'View monthly attendance-based salary calculations and download official payslips'
            }
          </p>
        </div>
        {isHR && (
          <div className="flex gap-2">
            <Button id="create-salary-btn" size="sm" variant="outline" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setSalaryModal(true)}>
              Salary Structure
            </Button>
            <Button id="generate-payroll-btn" size="sm" leftIcon={<DollarSign className="w-4 h-4" />} onClick={() => setGenerateModal(true)}>
              Generate Monthly Payroll
            </Button>
          </div>
        )}
      </div>

      {/* Salary Structure Card (Employee) */}
      {!isHR && salaryStructure && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Base Salary Structure</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Basic Salary', value: salaryStructure.basic_salary, color: 'text-slate-800' },
              { label: 'Allowances', value: salaryStructure.allowances, color: 'text-emerald-600' },
              { label: 'Standard Deductions', value: salaryStructure.deductions, color: 'text-red-600' },
              {
                label: 'Base Gross (Full Month)',
                value: Number(salaryStructure.basic_salary) + Number(salaryStructure.allowances),
                color: 'text-blue-700'
              },
            ].map(item => (
              <div key={item.label} className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>₹{Number(item.value).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Effective from: {format(new Date(salaryStructure.effective_from), 'MMMM d, yyyy')} · Note: Net pay is computed from actual monthly attendance and approved time off.
          </p>
        </Card>
      )}

      {/* Payroll Records */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isHR ? 'All Employees Payroll Ledger & Salary Controls' : 'My Payroll History'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Attendance-calculated gross earnings, deductions & net salary payout
            </p>
          </div>

          {isHR && (
            <div className="w-64">
              <Input
                id="payroll-search"
                placeholder="Search name, code, or month..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="py-1 text-xs"
              />
            </div>
          )}
        </div>

        {isLoading ? <Loader className="h-32" /> : payrolls.length === 0 ? (
          <EmptyState icon={<DollarSign className="w-10 h-10" />} title="No payroll records" description="No payroll has been computed yet." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {isHR && <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Employee</th>}
                    <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Period</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Payable Days</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Gross Salary</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Deductions</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-slate-500">Net Salary</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls
                    .filter(p => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        (p.first_name && p.first_name.toLowerCase().includes(q)) ||
                        (p.last_name && p.last_name.toLowerCase().includes(q)) ||
                        (p.employee_code && p.employee_code.toLowerCase().includes(q)) ||
                        (p.department_name && p.department_name.toLowerCase().includes(q)) ||
                        (p.pay_period && p.pay_period.toLowerCase().includes(q))
                      );
                    })
                    .map(p => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                        {isHR && (
                          <td className="py-3 px-3">
                            <p className="font-medium text-slate-700">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-slate-500">{p.employee_code}</p>
                          </td>
                        )}
                        <td className="py-3 px-3">
                          <Badge variant="blue">{p.pay_period}</Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="font-semibold text-blue-700">
                            {p.payable_days !== undefined ? p.payable_days : p.total_working_days || 30}
                          </span>
                          <span className="text-slate-400 text-xs"> / {p.total_working_days || 30} days</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">₹{Number(p.gross_salary).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-red-600">-₹{Number(p.deductions).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-emerald-700 font-bold">₹{Number(p.net_salary).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              id={`view-payslip-${p.id}`}
                              size="sm"
                              variant="ghost"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => openPayslip(p)}
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
                              >
                                Update Structure
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

      {/* Payslip Modal */}
      <Modal
        isOpen={!!payslipModal}
        onClose={() => { setPayslipModal(null); setPayslipData(null); }}
        title="Official Salary Payslip"
        size="xl"
        footer={
          <>
            <Button id="print-payslip-btn" variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print</Button>
            <Button id="download-payslip-btn" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportPDF}>Download PDF</Button>
          </>
        }
      >
        {payslipData && <PayslipContent ref={payslipRef} payslip={payslipData} />}
      </Modal>

      {/* Create Salary Structure Modal */}
      <Modal
        isOpen={salaryModal}
        onClose={() => setSalaryModal(false)}
        title="Set Salary Structure"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setSalaryModal(false)}>Cancel</Button>
            <Button id="save-salary-btn" size="sm" isLoading={salaryLoading} onClick={handleCreateSalary}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            id="salary-employee-select"
            label="Employee"
            value={salaryForm.employeeId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSalaryForm(p => ({ ...p, employeeId: e.target.value }))}
            options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` }))}
            placeholder="Select employee"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input id="basic-salary" label="Basic Salary (₹)" type="number" value={salaryForm.basic_salary} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSalaryForm(p => ({ ...p, basic_salary: e.target.value }))} required />
            <Input id="allowances" label="Allowances (₹)" type="number" value={salaryForm.allowances} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSalaryForm(p => ({ ...p, allowances: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="deductions" label="Deductions (₹)" type="number" value={salaryForm.deductions} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSalaryForm(p => ({ ...p, deductions: e.target.value }))} />
            <Input id="effective-from" label="Effective From" type="date" value={salaryForm.effective_from} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSalaryForm(p => ({ ...p, effective_from: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={generateModal}
        onClose={() => setGenerateModal(false)}
        title="Generate Attendance-Driven Payroll"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setGenerateModal(false)}>Cancel</Button>
            <Button id="confirm-generate-payroll-btn" size="sm" isLoading={generateLoading} onClick={handleGeneratePayroll}>
              Calculate & Generate
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              The system will automatically query the employee's attendance logs (Present days, half days) and approved time off (Paid vs. Unpaid) for this month to calculate exact payable days and pro-rated salary.
            </span>
          </div>

          <Select
            id="gen-employee-select"
            label="Employee"
            value={generateForm.employeeId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenerateForm(p => ({ ...p, employeeId: e.target.value }))}
            options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` }))}
            placeholder="Select employee"
            required
          />
          <Input
            id="pay-period"
            label="Pay Period (YYYY-MM)"
            type="month"
            value={generateForm.pay_period}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateForm(p => ({ ...p, pay_period: e.target.value }))}
            required
          />
        </div>
      </Modal>
    </div>
  );
};
