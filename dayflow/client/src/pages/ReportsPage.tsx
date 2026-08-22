import React, { useEffect, useState, useRef } from 'react';
import { FileText, Download, Filter } from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { employeeService } from '../services/employeeService';
import { Card, Button, Input, Select, Badge, EmptyState } from '../components/ui';
import type { Employee, Attendance, LeaveRequest, Payroll, Department } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ReportType = 'employees' | 'attendance' | 'leave' | 'payroll';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reportData, setReportData] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', employeeId: '', departmentId: '', status: '', pay_period: '',
  });
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      employeeService.getAll({ limit: 200 }),
      employeeService.getDepartments(),
    ]).then(([empRes, deptRes]: [{ employees?: Employee[] }, Department[]]) => {
      setEmployees(empRes.employees || []);
      setDepartments(deptRes || []);
    });
  }, []);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      let data: unknown[] = [];
      switch (reportType) {
        case 'employees': {
          const res = await analyticsService.getEmployeeReport({ departmentId: filters.departmentId, status: filters.status });
          data = res.employees || [];
          break;
        }
        case 'attendance': {
          const res = await analyticsService.getAttendanceReport({ startDate: filters.startDate, endDate: filters.endDate, employeeId: filters.employeeId, departmentId: filters.departmentId });
          data = res.attendance || [];
          break;
        }
        case 'leave': {
          const res = await analyticsService.getLeaveReport({ startDate: filters.startDate, endDate: filters.endDate, employeeId: filters.employeeId, status: filters.status });
          data = res.leaves || [];
          break;
        }
        case 'payroll': {
          const res = await analyticsService.getPayrollReport({ pay_period: filters.pay_period, employeeId: filters.employeeId, departmentId: filters.departmentId });
          data = res.payroll || [];
          break;
        }
      }
      setReportData(data);
      toast.success(`Report generated: ${data.length} records`);
    } catch { toast.error('Failed to generate report'); }
    finally { setIsLoading(false); }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px' });
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`dayflow-${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const renderTable = () => {
    if (reportData.length === 0) return null;
    switch (reportType) {
      case 'employees':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200">
              {['Code', 'Name', 'Department', 'Designation', 'Joining Date', 'Status'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(reportData as Employee[]).map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-700">{e.employee_code}</td>
                  <td className="py-2 px-3 font-medium text-slate-800">{e.first_name} {e.last_name}</td>
                  <td className="py-2 px-3 text-slate-600">{e.department_name || '—'}</td>
                  <td className="py-2 px-3 text-slate-600">{e.designation || '—'}</td>
                  <td className="py-2 px-3 text-slate-600">{e.joining_date ? format(new Date(e.joining_date), 'MMM d, yyyy') : '—'}</td>
                  <td className="py-2 px-3"><Badge variant={e.status === 'ACTIVE' ? 'green' : 'red'}>{e.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'attendance':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200">
              {['Employee', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(reportData as Attendance[]).map(a => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3"><p className="font-medium">{a.first_name} {a.last_name}</p><p className="text-xs text-slate-500">{a.employee_code}</p></td>
                  <td className="py-2 px-3 text-slate-600">{a.department_name || '—'}</td>
                  <td className="py-2 px-3">{format(new Date(a.attendance_date), 'MMM d, yyyy')}</td>
                  <td className="py-2 px-3">{a.check_in ? format(new Date(a.check_in), 'hh:mm a') : '—'}</td>
                  <td className="py-2 px-3">{a.check_out ? format(new Date(a.check_out), 'hh:mm a') : '—'}</td>
                  <td className="py-2 px-3">{a.working_hours ? `${a.working_hours}h` : '—'}</td>
                  <td className="py-2 px-3"><Badge variant={a.status === 'PRESENT' ? 'green' : a.status === 'ABSENT' ? 'red' : 'yellow'}>{a.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'leave':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200">
              {['Employee', 'Type', 'Start', 'End', 'Status', 'Remarks'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(reportData as LeaveRequest[]).map(l => (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3"><p className="font-medium">{l.first_name} {l.last_name}</p><p className="text-xs text-slate-500">{l.employee_code}</p></td>
                  <td className="py-2 px-3"><Badge variant="blue">{l.leave_type}</Badge></td>
                  <td className="py-2 px-3">{format(new Date(l.start_date), 'MMM d')}</td>
                  <td className="py-2 px-3">{format(new Date(l.end_date), 'MMM d, yyyy')}</td>
                  <td className="py-2 px-3"><Badge variant={l.status === 'APPROVED' ? 'green' : l.status === 'REJECTED' ? 'red' : 'yellow'}>{l.status}</Badge></td>
                  <td className="py-2 px-3 text-slate-500 text-xs">{l.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'payroll':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200">
              {['Employee', 'Department', 'Period', 'Gross', 'Deductions', 'Net Salary'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(reportData as Payroll[]).map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3"><p className="font-medium">{p.first_name} {p.last_name}</p><p className="text-xs text-slate-500">{p.employee_code}</p></td>
                  <td className="py-2 px-3 text-slate-600">{p.department_name || '—'}</td>
                  <td className="py-2 px-3"><Badge variant="blue">{p.pay_period}</Badge></td>
                  <td className="py-2 px-3 text-slate-700">₹{Number(p.gross_salary).toLocaleString('en-IN')}</td>
                  <td className="py-2 px-3 text-red-600">-₹{Number(p.deductions).toLocaleString('en-IN')}</td>
                  <td className="py-2 px-3 font-bold text-emerald-700">₹{Number(p.net_salary).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Reports</h2>
        <p className="text-sm text-slate-500">Generate and export organizational reports</p>
      </div>

      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {(['employees', 'attendance', 'leave', 'payroll'] as ReportType[]).map(type => (
            <button
              key={type}
              onClick={() => { setReportType(type); setReportData([]); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${reportType === type ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(reportType === 'attendance' || reportType === 'leave') && (
            <>
              <Input id="rep-start" label="Start Date" type="date" value={filters.startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(p => ({ ...p, startDate: e.target.value }))} />
              <Input id="rep-end" label="End Date" type="date" value={filters.endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(p => ({ ...p, endDate: e.target.value }))} />
            </>
          )}
          {reportType !== 'employees' && (
            <Select label="Employee" value={filters.employeeId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(p => ({ ...p, employeeId: e.target.value }))}
              options={[{ value: '', label: 'All Employees' }, ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))]}
            />
          )}
          {(reportType === 'employees' || reportType === 'attendance' || reportType === 'payroll') && (
            <Select label="Department" value={filters.departmentId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(p => ({ ...p, departmentId: e.target.value }))}
              options={[{ value: '', label: 'All Departments' }, ...departments.map(d => ({ value: d.id, label: d.name }))]}
            />
          )}
          {(reportType === 'employees' || reportType === 'leave') && (
            <Select label="Status" value={filters.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(p => ({ ...p, status: e.target.value }))}
              options={reportType === 'leave'
                ? [{ value: '', label: 'All' }, { value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }]
                : [{ value: '', label: 'All' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]
              }
            />
          )}
          {reportType === 'payroll' && (
            <Input id="rep-period" label="Pay Period" type="month" value={filters.pay_period} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(p => ({ ...p, pay_period: e.target.value }))} />
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <Button id="generate-report-btn" leftIcon={<Filter className="w-4 h-4" />} isLoading={isLoading} onClick={generateReport}>
            Generate Report
          </Button>
          {reportData.length > 0 && (
            <Button id="export-pdf-btn" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportPDF}>
              Export PDF
            </Button>
          )}
        </div>
      </Card>

      {reportData.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 capitalize">{reportType} Report</h3>
            <p className="text-xs text-slate-500">{reportData.length} records · Generated {format(new Date(), 'MMM d, yyyy')}</p>
          </div>
          <div className="overflow-x-auto" ref={reportRef}>
            {renderTable()}
          </div>
        </Card>
      )}

      {!isLoading && reportData.length === 0 && (
        <Card>
          <EmptyState
            icon={<FileText className="w-10 h-10" />}
            title="No report generated yet"
            description="Select filters and click 'Generate Report' to view data."
          />
        </Card>
      )}
    </div>
  );
};
