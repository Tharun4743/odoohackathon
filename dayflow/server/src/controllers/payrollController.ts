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
      const { page, limit } = req.query;
      const result = await payrollService.getMyPayroll(
        employee.id as string,
        qsNum(page),
        qsNum(limit),
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getAllPayroll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId, pay_period, page, limit } = req.query;
      const result = await payrollService.getAllPayroll({
        employeeId: qs(employeeId),
        pay_period: qs(pay_period),
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
      const { employeeId, basic_salary, allowances, deductions, effective_from } = req.body;
      if (!employeeId || !basic_salary) {
        throw new AppError('Employee ID and basic salary are required.', 400);
      }
      const result = await payrollService.createOrUpdateSalaryStructure({
        employeeId,
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
      const { employeeId, pay_period } = req.body;
      if (!employeeId || !pay_period) {
        throw new AppError('Employee ID and pay period are required.', 400);
      }
      const result = await payrollService.generatePayroll({ employeeId, pay_period });
      res.status(201).json({ success: true, message: 'Payroll generated.', data: { payroll: result } });
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
