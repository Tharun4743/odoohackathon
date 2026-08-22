import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { LeaveFilters } from '../types';
import { notificationService } from './notificationService';
import { sendEmail, buildProfessionalEmailHtml } from '../utils/mailer';

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

    // Fetch employee name
    const empInfo = await query(
      `SELECT first_name, last_name, employee_code FROM employees WHERE id = $1`,
      [employeeId]
    );
    const empName = empInfo.rows[0] ? `${empInfo.rows[0].first_name} ${empInfo.rows[0].last_name} (${empInfo.rows[0].employee_code})` : 'An Employee';

    // Notify HR users via in-app and email with Work Suite Logo
    const hrUsers = await query(`SELECT id, email FROM users WHERE role IN ('HR', 'ADMIN')`);
    for (const hrUser of hrUsers.rows) {
      notificationService.create({
        userId: hrUser.id,
        title: 'New Leave Request',
        message: `${empName} has submitted a new ${leave_type} leave request for ${start_date} to ${end_date}.`,
        type: 'LEAVE',
      }).catch(() => {});

      if (hrUser.email) {
        sendEmail({
          to: hrUser.email,
          subject: `🏖️ New Time-Off Request: ${empName} (${leave_type} Leave)`,
          html: buildProfessionalEmailHtml({
            title: 'New Time-Off Request Submitted',
            badgeText: 'PENDING APPROVAL',
            badgeColor: '#3b82f6',
            recipientName: 'HR / Administrator',
            bodyHtml: `
              <p>A new employee time-off request requires your managerial review and approval:</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 10px; margin: 16px 0;">
                <p style="margin: 0; font-weight: bold; font-size: 15px; color: #1e293b;">${empName}</p>
                <p style="margin: 6px 0 0 0; color: #475569; font-size: 13px;">Leave Category: <strong>${leave_type} Time Off</strong></p>
                <p style="margin: 3px 0 0 0; color: #475569; font-size: 13px;">Requested Duration: <strong>${start_date}</strong> to <strong>${end_date}</strong></p>
                ${remarks ? `<p style="margin: 6px 0 0 0; color: #475569; font-size: 12px; font-style: italic;">Reason: "${remarks}"</p>` : ''}
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0;">Please open the Leave Approvals dashboard to take action.</p>
            `,
            footerNote: 'Work Suite Enterprise HR Management · Leave & Time-Off Dispatcher',
          }),
          text: `New ${leave_type} leave request submitted by ${empName} for ${start_date} to ${end_date}.`,
        }).catch(() => {});
      }
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
       LEFT JOIN users u ON u.id::text = lr.approved_by::text
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

    // Get employee user_id and email for notification
    const empRes = await query(
      `SELECT u.id as user_id, u.email, e.first_name, e.employee_code FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [leave.employee_id]
    );

    if (empRes.rows.length > 0) {
      notificationService.create({
        userId: empRes.rows[0].user_id,
        title: 'Leave Request Approved',
        message: `Your ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} has been approved.`,
        type: 'LEAVE',
      }).catch(() => {});

      if (empRes.rows[0].email) {
        sendEmail({
          to: empRes.rows[0].email,
          subject: `✅ Time-Off Request APPROVED: ${leave.start_date} to ${leave.end_date}`,
          html: buildProfessionalEmailHtml({
            title: 'Your Time-Off Request is Approved',
            badgeText: 'LEAVE APPROVED',
            badgeColor: '#10b981',
            recipientName: `${empRes.rows[0].first_name} (${empRes.rows[0].employee_code})`,
            bodyHtml: `
              <p>Great news! Your requested time-off application has been reviewed and officially approved:</p>
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 10px; margin: 16px 0;">
                <p style="margin: 0; color: #065f46; font-weight: bold; font-size: 15px;">🎉 Approved Time-Off Details</p>
                <p style="margin: 6px 0 0 0; color: #047857; font-size: 13px;">Leave Category: <strong>${leave.leave_type} Time Off</strong></p>
                <p style="margin: 3px 0 0 0; color: #047857; font-size: 13px;">Approved Duration: <strong>${leave.start_date}</strong> to <strong>${leave.end_date}</strong></p>
                ${comment ? `<p style="margin: 6px 0 0 0; color: #047857; font-size: 12px; font-style: italic;">HR Approval Note: "${comment}"</p>` : ''}
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0;">Your calendar and attendance status records have been updated automatically.</p>
            `,
            footerNote: 'Work Suite Enterprise HR Management · Official Approval Notice',
          }),
          text: `Your ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} has been APPROVED.${comment ? ` HR Note: ${comment}` : ''}`,
        }).catch(() => {});
      }
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
      `SELECT u.id as user_id, u.email, e.first_name, e.employee_code FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [leave.employee_id]
    );

    if (empRes.rows.length > 0) {
      notificationService.create({
        userId: empRes.rows[0].user_id,
        title: 'Leave Request Rejected',
        message: `Your ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} has been rejected. ${comment ? `Reason: ${comment}` : ''}`,
        type: 'LEAVE',
      }).catch(() => {});

      if (empRes.rows[0].email) {
        sendEmail({
          to: empRes.rows[0].email,
          subject: `❌ Time-Off Request Update: ${leave.start_date} to ${leave.end_date}`,
          html: buildProfessionalEmailHtml({
            title: 'Time-Off Application Decision',
            badgeText: 'APPLICATION REJECTED',
            badgeColor: '#ef4444',
            recipientName: `${empRes.rows[0].first_name} (${empRes.rows[0].employee_code})`,
            bodyHtml: `
              <p>Your requested time-off application has been reviewed by the HR team:</p>
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 10px; margin: 16px 0;">
                <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 15px;">Application Not Approved</p>
                <p style="margin: 6px 0 0 0; color: #b91c1c; font-size: 13px;">Leave Category: <strong>${leave.leave_type} Time Off</strong></p>
                <p style="margin: 3px 0 0 0; color: #b91c1c; font-size: 13px;">Requested Duration: <strong>${leave.start_date}</strong> to <strong>${leave.end_date}</strong></p>
                ${comment ? `<p style="margin: 6px 0 0 0; color: #b91c1c; font-size: 12px; font-style: italic;">Reason / Manager Note: "${comment}"</p>` : ''}
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0;">Please contact your HR officer if you have questions or wish to submit revised dates.</p>
            `,
            footerNote: 'Work Suite Enterprise HR Management · Leave Management Department',
          }),
          text: `Your ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} has been REJECTED.${comment ? ` Reason: ${comment}` : ''}`,
        }).catch(() => {});
      }
    }

    return result.rows[0];
  },
};
