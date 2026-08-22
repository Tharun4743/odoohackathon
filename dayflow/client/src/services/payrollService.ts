import api from './api';

export const payrollService = {
  async getMySalaryStructure() {
    const res = await api.get('/payroll/my/salary-structure');
    return res.data.data.salaryStructure;
  },

  async getMyPayroll(params?: { pay_period?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number }) {
    const res = await api.get('/payroll/my', { params });
    return res.data.data;
  },

  async getPayslip(id: string) {
    const res = await api.get(`/payroll/slip/${id}`);
    return res.data.data.payslip;
  },

  async getAllPayroll(params?: { employeeId?: string; pay_period?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number }) {
    const res = await api.get('/payroll/all', { params });
    return res.data.data;
  },

  async getSalaryStructureForEmployee(employeeId: string) {
    const res = await api.get(`/payroll/salary-structure/${employeeId}`);
    return res.data.data.salaryStructure;
  },

  async createSalaryStructure(data: {
    employeeId: string;
    basic_salary: number;
    allowances: number;
    deductions: number;
    effective_from: string;
  }) {
    const res = await api.post('/payroll/salary-structure', data);
    return res.data.data.salaryStructure;
  },

  async generatePayroll(data: { employeeId: string; pay_period: string }) {
    const res = await api.post('/payroll/generate', data);
    return res.data.data.payroll;
  },
};
