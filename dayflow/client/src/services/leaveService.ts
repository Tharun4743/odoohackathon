import api from './api';
import type { LeaveRequest, LeaveType, LeaveStatus } from '../types';

export const leaveService = {
  async applyLeave(data: {
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    remarks?: string;
  }) {
    const res = await api.post('/leave/apply', data);
    return res.data.data.leave as LeaveRequest;
  },

  async getMyLeaves(params?: {
    status?: LeaveStatus;
    leaveType?: LeaveType;
    page?: number;
    limit?: number;
  }) {
    const res = await api.get('/leave/my', { params });
    return res.data.data;
  },

  async getAllLeaves(params?: {
    employeeId?: string;
    status?: LeaveStatus;
    leaveType?: LeaveType;
    page?: number;
    limit?: number;
  }) {
    const res = await api.get('/leave/all', { params });
    return res.data.data;
  },

  async approveLeave(id: string, comment?: string) {
    const res = await api.put(`/leave/${id}/approve`, { comment });
    return res.data.data.leave as LeaveRequest;
  },

  async rejectLeave(id: string, comment?: string) {
    const res = await api.put(`/leave/${id}/reject`, { comment });
    return res.data.data.leave as LeaveRequest;
  },
};
