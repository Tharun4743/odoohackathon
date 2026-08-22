import api from './api';
import type { User, UserRole } from '../types';

export const authService = {
  async login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    const { token, user, employee } = res.data.data;
    localStorage.setItem('dayflow_token', token);
    localStorage.setItem('dayflow_user', JSON.stringify(user));
    return { user: user as User, employee };
  },

  async register(data: { employee_id: string; email: string; password: string; role: UserRole }) {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  async logout() {
    await api.post('/auth/logout');
    localStorage.removeItem('dayflow_token');
    localStorage.removeItem('dayflow_user');
  },

  async me() {
    const res = await api.get('/auth/me');
    return res.data.data.user as User;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await api.put('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },

  getStoredUser(): User | null {
    const stored = localStorage.getItem('dayflow_user');
    return stored ? JSON.parse(stored) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('dayflow_token');
  },
};
