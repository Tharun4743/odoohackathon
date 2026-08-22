import { Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

export const analyticsController = {
  async getDashboard(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const kpis = await analyticsService.getDashboardKPIs();
      res.json({ success: true, data: kpis });
    } catch (err) {
      next(err);
    }
  },

  async getAttendanceAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, departmentId } = req.query;
      const data = await analyticsService.getAttendanceAnalytics({
        startDate: startDate as string,
        endDate: endDate as string,
        departmentId: departmentId as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getLeaveAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getLeaveAnalytics({
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getPayrollAnalytics(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getPayrollAnalytics();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Reports
  async getEmployeeReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { departmentId, status } = req.query;
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (departmentId) { conditions.push(`e.department_id = $${idx++}`); params.push(departmentId); }
      if (status) { conditions.push(`e.status = $${idx++}`); params.push(status); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await query(
        `SELECT e.*, d.name as department_name, u.email as user_email, u.role
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN users u ON u.id = e.user_id
         ${where}
         ORDER BY e.first_name`,
        params
      );
      res.json({ success: true, data: { employees: result.rows } });
    } catch (err) {
      next(err);
    }
  },

  async getAttendanceReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, employeeId, departmentId } = req.query;
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (startDate) { conditions.push(`a.attendance_date >= $${idx++}`); params.push(startDate); }
      if (endDate) { conditions.push(`a.attendance_date <= $${idx++}`); params.push(endDate); }
      if (employeeId) { conditions.push(`a.employee_id = $${idx++}`); params.push(employeeId); }
      if (departmentId) { conditions.push(`e.department_id = $${idx++}`); params.push(departmentId); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await query(
        `SELECT a.*, e.first_name, e.last_name, e.employee_code, d.name as department_name
         FROM attendance a
         JOIN employees e ON e.id = a.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         ${where}
         ORDER BY a.attendance_date DESC, e.first_name`,
        params
      );
      res.json({ success: true, data: { attendance: result.rows } });
    } catch (err) {
      next(err);
    }
  },

  async getLeaveReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, employeeId, status } = req.query;
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (startDate) { conditions.push(`lr.start_date >= $${idx++}`); params.push(startDate); }
      if (endDate) { conditions.push(`lr.end_date <= $${idx++}`); params.push(endDate); }
      if (employeeId) { conditions.push(`lr.employee_id = $${idx++}`); params.push(employeeId); }
      if (status) { conditions.push(`lr.status = $${idx++}`); params.push(status); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await query(
        `SELECT lr.*, e.first_name, e.last_name, e.employee_code, d.name as department_name
         FROM leave_requests lr
         JOIN employees e ON e.id = lr.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         ${where}
         ORDER BY lr.created_at DESC`,
        params
      );
      res.json({ success: true, data: { leaves: result.rows } });
    } catch (err) {
      next(err);
    }
  },

  async getPayrollReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { pay_period, employeeId, departmentId } = req.query;
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (pay_period) { conditions.push(`p.pay_period = $${idx++}`); params.push(pay_period); }
      if (employeeId) { conditions.push(`p.employee_id = $${idx++}`); params.push(employeeId); }
      if (departmentId) { conditions.push(`e.department_id = $${idx++}`); params.push(departmentId); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await query(
        `SELECT p.*, e.first_name, e.last_name, e.employee_code, d.name as department_name,
                ss.basic_salary, ss.allowances
         FROM payroll p
         JOIN employees e ON e.id = p.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         JOIN salary_structures ss ON ss.id = p.salary_structure_id
         ${where}
         ORDER BY p.pay_period DESC, e.first_name`,
        params
      );
      res.json({ success: true, data: { payroll: result.rows } });
    } catch (err) {
      next(err);
    }
  },
};
