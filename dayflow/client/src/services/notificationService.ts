import api from './api';

export const notificationService = {
  async getNotifications(params?: { page?: number; limit?: number }) {
    const res = await api.get('/notifications', { params });
    return res.data.data;
  },

  async getUnreadCount() {
    const res = await api.get('/notifications/unread-count');
    return res.data.data.count as number;
  },

  async markAsRead(id: string) {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data.data.notification;
  },

  async markAllAsRead() {
    await api.put('/notifications/read-all');
  },
};
