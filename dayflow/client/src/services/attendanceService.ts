import api from './api';
import type { Attendance, Employee } from '../types';

export const attendanceService = {
  async checkIn() {
    const res = await api.post('/attendance/check-in');
    return res.data.data.attendance as Attendance;
  },

  async startBreak() {
    const res = await api.post('/attendance/break/start');
    return res.data.data.attendance as Attendance;
  },

  async endBreak() {
    const res = await api.post('/attendance/break/end');
    return res.data.data.attendance as Attendance;
  },

  async checkOut() {
    const res = await api.post('/attendance/check-out');
    return res.data.data.attendance as Attendance;
  },

  async getTodayAttendance() {
    const res = await api.get('/attendance/today');
    return res.data.data.attendance as Attendance | null;
  },

  async getMonthAttendance(month?: string) {
    const res = await api.get('/attendance/month', { params: { month } });
    return res.data.data;
  },

  async getLiveStatusToday() {
    const res = await api.get('/attendance/live-today');
    return res.data.data.employees as Employee[];
  },

  async getMyHistory(params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const res = await api.get('/attendance/my', { params });
    return res.data.data;
  },

  async getWeeklySummary() {
    const res = await api.get('/attendance/weekly');
    return res.data.data.summary as Attendance[];
  },

  async getAllAttendance(params?: {
    employeeId?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const res = await api.get('/attendance/all', { params });
    return res.data.data;
  },

  async getEmployeeAttendance(employeeId: string, params?: Record<string, string | number>) {
    const res = await api.get(`/attendance/employee/${employeeId}`, { params });
    return res.data.data;
  },
};
