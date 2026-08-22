import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
  LineChart, Line, ResponsiveContainer
} from 'recharts';
import { analyticsService } from '../services/analyticsService';
import { employeeService } from '../services/employeeService';
import { Card, Loader, Select } from '../components/ui';
import type { Department } from '../types';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const AnalyticsPage: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<{ statusBreakdown: { status: string; count: number }[]; dailyTrend: unknown[] }>({ statusBreakdown: [], dailyTrend: [] });
  const [leaveData, setLeaveData] = useState<{ typeBreakdown: { leave_type: string; count: number }[]; statusBreakdown: { status: string; count: number }[]; monthlyTrend: { month: string; count: number }[] }>({ typeBreakdown: [], statusBreakdown: [], monthlyTrend: [] });
  const [payrollData, setPayrollData] = useState<{ summary: Record<string, number>; departmentSalary: { department: string; total_salary: number; employee_count: number }[]; monthlyTrend: { pay_period: string; total: number }[] }>({ summary: {}, departmentSalary: [], monthlyTrend: [] });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filters, setFilters] = useState({ departmentId: '', startDate: '', endDate: '' });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [attRes, leaveRes, payrollRes, deptRes] = await Promise.allSettled([
        analyticsService.getAttendanceAnalytics({ departmentId: filters.departmentId }),
        analyticsService.getLeaveAnalytics({ startDate: filters.startDate, endDate: filters.endDate }),
        analyticsService.getPayrollAnalytics(),
        employeeService.getDepartments(),
      ]);
      if (attRes.status === 'fulfilled') setAttendanceData(attRes.value);
      if (leaveRes.status === 'fulfilled') setLeaveData(leaveRes.value);
      if (payrollRes.status === 'fulfilled') setPayrollData(payrollRes.value);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value);
    } catch { toast.error('Failed to load analytics'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filters.departmentId]);

  const attendancePieData = attendanceData.statusBreakdown.map(item => ({
    name: item.status,
    value: parseInt(String(item.count)),
  }));

  const leavePieData = leaveData.typeBreakdown.map(item => ({
    name: item.leave_type,
    value: parseInt(String(item.count)),
  }));

  const leaveStatusData = leaveData.statusBreakdown.map(item => ({
    name: item.status,
    value: parseInt(String(item.count)),
  }));

  const payrollTrendData = payrollData.monthlyTrend.map(item => ({
    month: item.pay_period,
    total: parseFloat(String(item.total)),
  })).reverse();

  const deptSalaryData = payrollData.departmentSalary.map(d => ({
    department: d.department,
    salary: parseFloat(String(d.total_salary)),
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Analytics</h2>
          <p className="text-sm text-slate-500">Organization-wide insights and trends</p>
        </div>
        <div className="flex gap-2 items-end">
          <Select
            value={filters.departmentId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(p => ({ ...p, departmentId: e.target.value }))}
            options={[{ value: '', label: 'All Departments' }, ...departments.map(d => ({ value: d.id, label: d.name }))]}
            className="w-44"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader size="lg" /></div>
      ) : (
        <>
          {/* Attendance Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Attendance Status Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={attendancePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {attendancePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Leave Type Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={leavePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {leavePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Leave Status Overview</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={leaveStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Payroll Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={payrollTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => `₹${Number(v || 0).toLocaleString('en-IN')}`} />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Department Salary Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptSalaryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 12 }} width={100} />
                <Tooltip formatter={(v) => `₹${Number(v || 0).toLocaleString('en-IN')}`} />
                <Bar dataKey="salary" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Payroll Summary */}
          {payrollData.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Payroll', value: payrollData.summary.total || 0 },
                { label: 'Avg Salary', value: payrollData.summary.average || 0 },
                { label: 'Highest Salary', value: payrollData.summary.max_salary || 0 },
                { label: 'Lowest Salary', value: payrollData.summary.min_salary || 0 },
              ].map(item => (
                <Card key={item.label}>
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className="text-lg font-bold text-slate-800">₹{Number(item.value).toLocaleString('en-IN')}</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
