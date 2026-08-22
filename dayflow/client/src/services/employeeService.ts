import api from './api';
import type { Employee } from '../types';

export const employeeService = {
  async getAll(params?: {
    search?: string;
    departmentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const res = await api.get('/employees', { params });
    return res.data.data;
  },

  async getById(id: string) {
    const res = await api.get(`/employees/${id}`);
    return res.data.data.employee as Employee;
  },

  async getMyProfile() {
    const res = await api.get('/employees/profile/me');
    return res.data.data.employee as Employee;
  },

  async updateMyProfile(data: { phone?: string; address?: string }) {
    const res = await api.put('/employees/profile/me', data);
    return res.data.data.employee as Employee;
  },

  async updateEmployee(id: string, data: Partial<Employee>) {
    const res = await api.put(`/employees/${id}`, data);
    return res.data.data.employee as Employee;
  },

  async createEmployee(data: {
    first_name: string;
    last_name: string;
    email: string;
    employee_code?: string;
    phone?: string;
    address?: string;
    department_id?: string;
    designation?: string;
    joining_date?: string;
    role?: 'EMPLOYEE' | 'HR' | 'ADMIN';
    basic_salary?: number;
    allowances?: number;
    deductions?: number;
    initial_password?: string;
  }) {
    const res = await api.post('/employees', data);
    return res.data.data as {
      employee: Employee;
      credentials: {
        employee_code: string;
        email: string;
        initialPassword: string;
        role: string;
      };
    };
  },

  async uploadProfileImage(file: File, employeeId?: string) {
    const formData = new FormData();
    formData.append('image', file);
    const url = employeeId ? `/employees/${employeeId}/image` : '/employees/profile/me/image';
    const res = await api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.profile_image as string;
  },

  async getDepartments() {
    const res = await api.get('/employees/departments');
    return res.data.data.departments;
  },

  async createDepartment(data: { name: string; description?: string }) {
    const res = await api.post('/employees/departments', data);
    return res.data.data.department;
  },

  async getDocuments(employeeId: string) {
    const res = await api.get(`/employees/${employeeId}/documents`);
    return res.data.data.documents;
  },

  async uploadDocument(employeeId: string, file: File, documentName: string, documentType: string) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentName', documentName);
    formData.append('documentType', documentType);
    const res = await api.post(`/employees/${employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.document;
  },

  async deleteDocument(employeeId: string, docId: string) {
    await api.delete(`/employees/${employeeId}/documents/${docId}`);
  },
};
