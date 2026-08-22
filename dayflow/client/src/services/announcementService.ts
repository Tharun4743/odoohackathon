import api from './api';
import type { Announcement } from '../types';

export const announcementService = {
  async getAnnouncements(params?: { departmentId?: string; limit?: number; page?: number }): Promise<{
    announcements: Announcement[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const res = await api.get('/announcements', { params });
    return res.data.data;
  },

  async createAnnouncement(data: {
    title: string;
    content: string;
    priority?: 'URGENT' | 'NORMAL' | 'INFO';
    target_department_id?: string | null;
  }): Promise<Announcement> {
    const res = await api.post('/announcements', data);
    return res.data.data.announcement;
  },

  async deleteAnnouncement(id: string): Promise<void> {
    await api.delete(`/announcements/${id}`);
  },
};
