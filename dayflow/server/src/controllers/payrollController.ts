import { Response, NextFunction } from 'express';
import { payrollService } from '../services/payrollService';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { employeeService } from '../services/employeeService';
import { qs, qsNum } from '../utils/queryHelpers';

export const payrollController = {
  async getMySalaryStructure(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const ss = await payrollService.getSalaryStructure(employee.id as string);
      res.json({ success: true, data: { salaryStructure: ss } });
    } catch (err) {
      next(err);
    }
  },

  async getMyPayroll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const { pay_period, sortBy, sortOrder, page, limit } = req.query;
      const result = await payrollService.getMyPayroll(
        employee.id as string,
        {
          pay_period: qs(pay_period),
          sortBy: qs(sortBy),
          sortOrder: qs(sortOrder),
          page: qsNum(page),
          limit: qsNum(limit),
        }
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getAllPayroll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId, pay_period, sortBy, sortOrder, page, limit } = req.query;
      const result = await payrollService.getAllPayroll({
        employeeId: qs(employeeId),
        pay_period: qs(pay_period),
        sortBy: qs(sortBy),
        sortOrder: qs(sortOrder),
        page: qsNum(page),
        limit: qsNum(limit),
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async createSalaryStructure(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId, employee_id, basic_salary, allowances, deductions, effective_from } = req.body;
      const targetEmpId = employeeId || employee_id;
      if (!targetEmpId || !basic_salary) {
        throw new AppError('Employee ID and basic salary are required.', 400);
      }
      const result = await payrollService.createOrUpdateSalaryStructure({
        employeeId: targetEmpId,
        basic_salary: parseFloat(basic_salary),
        allowances: parseFloat(allowances) || 0,
        deductions: parseFloat(deductions) || 0,
        effective_from: effective_from || new Date().toISOString().split('T')[0],
        updatedByUserId: req.user!.userId,
      });
      res.status(201).json({ success: true, message: 'Salary structure created.', data: { salaryStructure: result } });
    } catch (err) {
      next(err);
    }
  },

  async getSalaryStructureForEmployee(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ss = await payrollService.getSalaryStructure(req.params.employeeId as string);
      res.json({ success: true, data: { salaryStructure: ss } });
    } catch (err) {
      next(err);
    }
  },

  async generatePayroll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId, employee_id, pay_period } = req.body;
      const targetEmpId = employeeId || employee_id;
      if (!targetEmpId || !pay_period) {
        throw new AppError('Employee ID and pay period are required.', 400);
      }
      const payroll = await payrollService.generatePayroll({ employeeId: targetEmpId, pay_period });
      res.json({ success: true, message: 'Payroll generated successfully.', data: { payroll } });
    } catch (err) {
      next(err);
    }
  },

  async getPayslip(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const employeeId = req.user!.role === 'EMPLOYEE'
        ? (await employeeService.getByUserId(req.user!.userId)).id as string
        : '__hr__';
      const payslip = await payrollService.getPayslip(id as string, employeeId);
      res.json({ success: true, data: { payslip } });
    } catch (err) {
      next(err);
    }
  },
};
