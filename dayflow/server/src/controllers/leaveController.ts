/** Time Off / Leave Management Module - Person 3 */
import { Response, NextFunction } from 'express';
import { leaveService } from '../services/leaveService';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { employeeService } from '../services/employeeService';
import { qs, qsNum } from '../utils/queryHelpers';

export const leaveController = {
  async applyLeave(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { leave_type, start_date, end_date, remarks } = req.body;
      if (!leave_type || !start_date || !end_date) {
        throw new AppError('Leave type, start date and end date are required.', 400);
      }
      if (!['PAID', 'SICK', 'UNPAID'].includes(leave_type)) {
        throw new AppError('Invalid leave type. Must be PAID, SICK, or UNPAID.', 400);
      }

      const employee = await employeeService.getByUserId(req.user!.userId);
      const leave = await leaveService.applyLeave({
        employeeId: employee.id as string,
        userId: req.user!.userId,
        leave_type,
        start_date,
        end_date,
        remarks: remarks || '',
      });

      res.status(201).json({ success: true, message: 'Leave request submitted.', data: { leave } });
    } catch (err) {
      next(err);
    }
  },

  async getMyLeaves(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      const { status, leaveType, page, limit } = req.query;
      const result = await leaveService.getMyLeaves(employee.id as string, {
        status: qs(status) as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
        leaveType: qs(leaveType) as 'PAID' | 'SICK' | 'UNPAID' | undefined,
        page: qsNum(page),
        limit: qsNum(limit),
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getAllLeaves(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId, status, leaveType, page, limit } = req.query;
      const result = await leaveService.getAllLeaves({
        employeeId: qs(employeeId),
        status: qs(status) as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
        leaveType: qs(leaveType) as 'PAID' | 'SICK' | 'UNPAID' | undefined,
        page: qsNum(page),
        limit: qsNum(limit),
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async approveLeave(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { comment = '' } = req.body;
      const leave = await leaveService.approveLeave(req.params.id as string, req.user!.userId, comment);
      res.json({ success: true, message: 'Leave approved.', data: { leave } });
    } catch (err) {
      next(err);
    }
  },

  async rejectLeave(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { comment = '' } = req.body;
      const leave = await leaveService.rejectLeave(req.params.id as string, req.user!.userId, comment);
      res.json({ success: true, message: 'Leave rejected.', data: { leave } });
    } catch (err) {
      next(err);
    }
  },
};
