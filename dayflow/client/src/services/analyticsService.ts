import api from './api';

export const analyticsService = {
  async getDashboard() {
    const res = await api.get('/analytics/dashboard');
    return res.data.data;
  },

  async getAttendanceAnalytics(params?: { startDate?: string; endDate?: string; departmentId?: string }) {
    const res = await api.get('/analytics/attendance', { params });
    return res.data.data;
  },

  async getLeaveAnalytics(params?: { startDate?: string; endDate?: string }) {
    const res = await api.get('/analytics/leave', { params });
    return res.data.data;
  },

  async getPayrollAnalytics() {
    const res = await api.get('/analytics/payroll');
    return res.data.data;
  },

  async getEmployeeReport(params?: Record<string, string>) {
    const res = await api.get('/analytics/reports/employees', { params });
    return res.data.data;
  },

  async getAttendanceReport(params?: Record<string, string>) {
    const res = await api.get('/analytics/reports/attendance', { params });
    return res.data.data;
  },

  async getLeaveReport(params?: Record<string, string>) {
    const res = await api.get('/analytics/reports/leave', { params });
    return res.data.data;
  },

  async getPayrollReport(params?: Record<string, string>) {
    const res = await api.get('/analytics/reports/payroll', { params });
    return res.data.data;
  },
};
