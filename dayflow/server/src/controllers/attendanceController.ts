import { Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendanceService';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { employeeService } from '../services/employeeService';
import { q, qs, qsNum } from '../utils/queryHelpers';

export const attendanceController = {
  async checkIn(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const record = await attendanceService.checkIn(employee.id as string);
      res.status(201).json({ success: true, message: 'Checked in successfully.', data: { attendance: record } });
    } catch (err) {
      next(err);
    }
  },

  async startBreak(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const record = await attendanceService.startBreak(employee.id as string);
      res.json({ success: true, message: 'Break started.', data: { attendance: record } });
    } catch (err) {
      next(err);
    }
  },

  async endBreak(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const record = await attendanceService.endBreak(employee.id as string);
      res.json({ success: true, message: 'Break ended.', data: { attendance: record } });
    } catch (err) {
      next(err);
    }
  },

  async checkOut(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const record = await attendanceService.checkOut(employee.id as string);
      res.json({ success: true, message: 'Checked out successfully.', data: { attendance: record } });
    } catch (err) {
      next(err);
    }
  },

  async getTodayAttendance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const record = await attendanceService.getTodayAttendance(employee.id as string);
      res.json({ success: true, data: { attendance: record } });
    } catch (err) {
      next(err);
    }
  },

  async getMonthAttendance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const { month } = req.query;
      const data = await attendanceService.getMonthAttendance(employee.id as string, qs(month));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getLiveStatusToday(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employees = await attendanceService.getLiveStatusToday();
      res.json({ success: true, data: { employees } });
    } catch (err) {
      next(err);
    }
  },

  async getMyHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const { startDate, endDate, page, limit } = q(req.query);
      const result = await attendanceService.getHistory(employee.id as string, {
        startDate,
        endDate,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getAllAttendance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId, departmentId, startDate, endDate, status, page, limit } = q(req.query);
      const result = await attendanceService.getAllAttendance({
        employeeId,
        departmentId,
        startDate,
        endDate,
        status: status as 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | undefined,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getWeeklySummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const summary = await attendanceService.getWeeklySummary(employee.id as string);
      res.json({ success: true, data: { summary } });
    } catch (err) {
      next(err);
    }
  },

  async getEmployeeAttendance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (req.user!.role === 'EMPLOYEE') {
        const myEmployee = await employeeService.getByUserId(req.user!.userId);
        if (myEmployee.id !== id) throw new AppError('Access denied.', 403);
      }
      const { startDate, endDate, page, limit } = q(req.query);
      const result = await attendanceService.getHistory(id as string, {
        startDate,
        endDate,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
