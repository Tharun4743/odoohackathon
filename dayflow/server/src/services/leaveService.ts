import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { LeaveFilters } from '../types';
import { notificationService } from './notificationService';

export const leaveService = {
  async applyLeave(data: {
    employeeId: string;
    userId: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    remarks: string;
  }) {
    const { employeeId, leave_type, start_date, end_date, remarks } = data;

    // Validate dates
    if (new Date(start_date) > new Date(end_date)) {
      throw new AppError('Start date cannot be after end date.', 400);
    }
    if (new Date(start_date) < new Date(new Date().toISOString().split('T')[0])) {
      throw new AppError('Leave cannot be applied for past dates.', 400);
    }

    // Check for overlapping leave
    const overlap = await query(
      `SELECT id FROM leave_requests
       WHERE employee_id = $1
         AND status != 'REJECTED'
         AND (start_date, end_date) OVERLAPS ($2::date, $3::date)`,
      [employeeId, start_date, end_date]
    );
    if (overlap.rows.length > 0) {
      throw new AppError('You already have a leave request overlapping these dates.', 409);
    }

    const result = await query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, remarks, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING *`,
      [employeeId, leave_type, start_date, end_date, remarks]
    );

    // Notify HR users
    const hrUsers = await query(`SELECT id FROM users WHERE role IN ('HR', 'ADMIN')`);
    for (const hrUser of hrUsers.rows) {
      await notificationService.create({
        userId: hrUser.id,
        title: 'New Leave Request',
        message: `A new ${leave_type} leave request has been submitted for ${start_date} to ${end_date}.`,
        type: 'LEAVE',
      });
    }

    return result.rows[0];
  },

  async getMyLeaves(employeeId: string, filters: LeaveFilters) {
    const { status, leaveType, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;
    const conditions = ['lr.employee_id = $1'];
    const params: unknown[] = [employeeId];
    let idx = 2;

    if (status) { conditions.push(`lr.status = $${idx++}`); params.push(status); }
    if (leaveType) { conditions.push(`lr.leave_type = $${idx++}`); params.push(leaveType); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await query(`SELECT COUNT(*) FROM leave_requests lr ${where}`, params);

    const result = await query(
      `SELECT lr.*, u.email as approved_by_email
       FROM leave_requests lr
       LEFT JOIN users u ON u.id = lr.approved_by::uuid
       ${where}
       ORDER BY lr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      leaves: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async getAllLeaves(filters: LeaveFilters) {
    const { employeeId, status, leaveType, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (employeeId) { conditions.push(`lr.employee_id = $${idx++}`); params.push(employeeId); }
    if (status) { conditions.push(`lr.status = $${idx++}`); params.push(status); }
    if (leaveType) { conditions.push(`lr.leave_type = $${idx++}`); params.push(leaveType); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*) FROM leave_requests lr ${where}`, params);

    const result = await query(
      `SELECT lr.*, e.first_name, e.last_name, e.employee_code, d.name as department_name
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       ${where}
       ORDER BY lr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      leaves: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async approveLeave(leaveId: string, hrUserId: string, comment: string) {
    const leaveRes = await query(`SELECT * FROM leave_requests WHERE id = $1`, [leaveId]);
    if (leaveRes.rows.length === 0) throw new AppError('Leave request not found.', 404);

    const leave = leaveRes.rows[0];
    if (leave.status !== 'PENDING') {
      throw new AppError('Only pending leave requests can be approved.', 400);
    }

    const result = await query(
      `UPDATE leave_requests
       SET status = 'APPROVED', hr_comment = $1, approved_by = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [comment, hrUserId, leaveId]
    );

    // Get employee user_id for notification
    const empRes = await query(
      `SELECT u.id as user_id, e.first_name FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [leave.employee_id]
    );

    if (empRes.rows.length > 0) {
      await notificationService.create({
        userId: empRes.rows[0].user_id,
        title: 'Leave Request Approved',
        message: `Your ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} has been approved.`,
        type: 'LEAVE',
      });
    }

    return result.rows[0];
  },

  async rejectLeave(leaveId: string, hrUserId: string, comment: string) {
    const leaveRes = await query(`SELECT * FROM leave_requests WHERE id = $1`, [leaveId]);
    if (leaveRes.rows.length === 0) throw new AppError('Leave request not found.', 404);

    const leave = leaveRes.rows[0];
    if (leave.status !== 'PENDING') {
      throw new AppError('Only pending leave requests can be rejected.', 400);
    }

    const result = await query(
      `UPDATE leave_requests
       SET status = 'REJECTED', hr_comment = $1, approved_by = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [comment, hrUserId, leaveId]
    );

    const empRes = await query(
      `SELECT u.id as user_id FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [leave.employee_id]
    );

    if (empRes.rows.length > 0) {
      await notificationService.create({
        userId: empRes.rows[0].user_id,
        title: 'Leave Request Rejected',
        message: `Your ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} has been rejected. ${comment ? `Reason: ${comment}` : ''}`,
        type: 'LEAVE',
      });
    }

    return result.rows[0];
  },
};
