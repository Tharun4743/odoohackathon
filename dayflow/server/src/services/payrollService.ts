import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notificationService';
import { sendEmail, buildProfessionalEmailHtml } from '../utils/mailer';

export const payrollService = {
  async getSalaryStructure(employeeId: string) {
    const result = await query(
      `SELECT * FROM salary_structures WHERE employee_id = $1 ORDER BY effective_from DESC LIMIT 1`,
      [employeeId]
    );
    return result.rows[0] || null;
  },

  async createOrUpdateSalaryStructure(data: {
    employeeId: string;
    basic_salary: number;
    allowances: number;
    deductions: number;
    effective_from: string;
    updatedByUserId?: string;
  }) {
    const { employeeId, basic_salary, allowances, deductions, effective_from, updatedByUserId } = data;

    const result = await query(
      `INSERT INTO salary_structures (employee_id, basic_salary, allowances, deductions, effective_from)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [employeeId, basic_salary, allowances, deductions, effective_from]
    );

    // Notify employee
    if (updatedByUserId) {
      const empRes = await query(
        `SELECT u.id as user_id FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
        [employeeId]
      );
      if (empRes.rows.length > 0) {
        await notificationService.create({
          userId: empRes.rows[0].user_id,
          title: 'Salary Structure Updated',
          message: `Your salary structure has been updated effective ${effective_from}. New basic salary: ₹${basic_salary}.`,
          type: 'PAYROLL',
        });
      }
    }

    return result.rows[0];
  },

  async generatePayroll(data: {
    employeeId: string;
    pay_period: string;
  }) {
    const { employeeId, pay_period } = data;

    // 1. Get latest salary structure
    const ssResult = await query(
      `SELECT * FROM salary_structures WHERE employee_id = $1 ORDER BY effective_from DESC LIMIT 1`,
      [employeeId]
    );
    if (ssResult.rows.length === 0) {
      throw new AppError('No salary structure found for this employee.', 404);
    }

    const ss = ssResult.rows[0];
    const basicSalary = parseFloat(ss.basic_salary || '0');
    const allowances = parseFloat(ss.allowances || '0');
    const deductions = parseFloat(ss.deductions || '0');
    const baseGrossSalary = basicSalary + allowances;

    // 2. Determine date range and total days in pay_period month (YYYY-MM)
    const [year, month] = pay_period.split('-').map(Number);
    const totalWorkingDays = new Date(year, month, 0).getDate();
    const startDate = `${pay_period}-01`;
    const endDate = `${pay_period}-${String(totalWorkingDays).padStart(2, '0')}`;

    // 3. Query Attendance for the month
    const attResult = await query(
      `SELECT status, COUNT(*) as count
       FROM attendance
       WHERE employee_id = $1 AND attendance_date >= $2 AND attendance_date <= $3
       GROUP BY status`,
      [employeeId, startDate, endDate]
    );

    let presentDays = 0;
    let halfDays = 0;
    attResult.rows.forEach(r => {
      if (r.status === 'PRESENT') presentDays = parseInt(r.count, 10);
      else if (r.status === 'HALF_DAY') halfDays = parseInt(r.count, 10);
    });

    // 4. Query Approved Time Off / Leaves for the month
    const leavesResult = await query(
      `SELECT leave_type, start_date, end_date
       FROM leave_requests
       WHERE employee_id = $1 AND status = 'APPROVED'
         AND start_date <= $3 AND end_date >= $2`,
      [employeeId, startDate, endDate]
    );

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    leavesResult.rows.forEach(l => {
      const lStart = new Date(l.start_date);
      const lEnd = new Date(l.end_date);
      const mStart = new Date(startDate);
      const mEnd = new Date(endDate);

      const effectiveStart = lStart > mStart ? lStart : mStart;
      const effectiveEnd = lEnd < mEnd ? lEnd : mEnd;
      const dayDiff = Math.max(0, Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      if (l.leave_type === 'PAID' || l.leave_type === 'SICK') {
        paidLeaveDays += dayDiff;
      } else if (l.leave_type === 'UNPAID') {
        unpaidLeaveDays += dayDiff;
      }
    });

    // If there are no attendance records in the database for older months, default to full working days or actual
    let payableDays: number;
    let absentDays: number;

    if (attResult.rows.length === 0 && leavesResult.rows.length === 0) {
      // Default standard full payable days
      payableDays = totalWorkingDays;
      presentDays = totalWorkingDays;
      absentDays = 0;
    } else {
      payableDays = Math.min(totalWorkingDays, presentDays + (halfDays * 0.5) + paidLeaveDays);
      absentDays = Math.max(0, totalWorkingDays - payableDays - unpaidLeaveDays);
    }

    // 5. Calculate Attendance-based Gross and Net Salary
    const dailyRate = baseGrossSalary / totalWorkingDays;
    const gross_salary = parseFloat((dailyRate * payableDays).toFixed(2));
    const net_salary = Math.max(0, parseFloat((gross_salary - deductions).toFixed(2)));

    // 6. Check if payroll already exists for this period
    const existing = await query(
      `SELECT id FROM payroll WHERE employee_id = $1 AND pay_period = $2`,
      [employeeId, pay_period]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE payroll
         SET salary_structure_id = $1, total_working_days = $2, present_days = $3,
             paid_leave_days = $4, unpaid_leave_days = $5, absent_days = $6, payable_days = $7,
             base_gross_salary = $8, gross_salary = $9, deductions = $10, net_salary = $11, updated_at = NOW()
         WHERE id = $12
         RETURNING *`,
        [
          ss.id, totalWorkingDays, presentDays, paidLeaveDays, unpaidLeaveDays, absentDays,
          payableDays, baseGrossSalary, gross_salary, deductions, net_salary, existing.rows[0].id
        ]
      );
    } else {
      result = await query(
        `INSERT INTO payroll (
          employee_id, salary_structure_id, total_working_days, present_days,
          paid_leave_days, unpaid_leave_days, absent_days, payable_days,
          base_gross_salary, gross_salary, deductions, net_salary, pay_period
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          employeeId, ss.id, totalWorkingDays, presentDays, paidLeaveDays, unpaidLeaveDays,
          absentDays, payableDays, baseGrossSalary, gross_salary, deductions, net_salary, pay_period
        ]
      );
    }

    // 7. Notify employee via in-app and email
    const empRes = await query(
      `SELECT u.id as user_id, u.email, e.first_name, e.employee_code FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [employeeId]
    );
    if (empRes.rows.length > 0) {
      notificationService.create({
        userId: empRes.rows[0].user_id,
        title: 'Payroll Generated',
        message: `Your payroll for ${pay_period} has been calculated based on ${payableDays}/${totalWorkingDays} payable days. Net salary: ₹${net_salary.toLocaleString('en-IN')}.`,
        type: 'PAYROLL',
      }).catch(() => {});

      if (empRes.rows[0].email) {
        sendEmail({
          to: empRes.rows[0].email,
          subject: `💰 Official Salary Payslip Ready: Pay Period ${pay_period}`,
          html: buildProfessionalEmailHtml({
            title: `Payslip Issued: ${pay_period}`,
            badgeText: 'PAYROLL DISPATCHED',
            badgeColor: '#6366f1',
            recipientName: `${empRes.rows[0].first_name} (${empRes.rows[0].employee_code})`,
            bodyHtml: `
              <p>Your official salary computation for pay period <strong>${pay_period}</strong> has been generated from your monthly attendance records:</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 10px; margin: 16px 0;">
                <p style="margin: 0; font-size: 13px; color: #475569;">Payable Days: <strong>${payableDays} / ${totalWorkingDays} days</strong></p>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;">Gross Earned: <strong>₹${gross_salary.toLocaleString('en-IN')}</strong></p>
                <p style="margin: 3px 0 0 0; font-size: 13px; color: #dc2626;">Statutory & Break Deductions: <strong>-₹${deductions.toLocaleString('en-IN')}</strong></p>
                <p style="margin: 8px 0 0 0; font-size: 16px; color: #16a34a; font-weight: bold;">Net Disbursed Payout: ₹${net_salary.toLocaleString('en-IN')}</p>
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0;">You can log in to your Work Suite workspace to view and download your vector PDF payslip.</p>
            `,
            footerNote: 'Work Suite Enterprise Payroll & Compensation Division',
          }),
          text: `Your salary payslip for ${pay_period} has been generated. Net payout: Rs. ${net_salary}.`,
        }).catch(() => {});
      }
    }

    return result.rows[0];
  },

  async getMyPayroll(employeeId: string, page = 1, limit = 12) {
    const offset = (page - 1) * limit;
    const countResult = await query(
      'SELECT COUNT(*) FROM payroll WHERE employee_id = $1',
      [employeeId]
    );
    const result = await query(
      `SELECT p.*, ss.basic_salary, ss.allowances, ss.deductions as salary_deductions, ss.effective_from
       FROM payroll p
       JOIN salary_structures ss ON ss.id = p.salary_structure_id
       WHERE p.employee_id = $1
       ORDER BY p.pay_period DESC
       LIMIT $2 OFFSET $3`,
      [employeeId, limit, offset]
    );
    return {
      payroll: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async getAllPayroll(filters: { employeeId?: string; pay_period?: string; page?: number; limit?: number }) {
    const { employeeId, pay_period, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (employeeId) { conditions.push(`p.employee_id = $${idx++}`); params.push(employeeId); }
    if (pay_period) { conditions.push(`p.pay_period = $${idx++}`); params.push(pay_period); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*) FROM payroll p ${where}`, params);

    const result = await query(
      `SELECT p.*, e.first_name, e.last_name, e.employee_code, d.name as department_name,
              ss.basic_salary, ss.allowances
       FROM payroll p
       JOIN employees e ON e.id = p.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       JOIN salary_structures ss ON ss.id = p.salary_structure_id
       ${where}
       ORDER BY p.pay_period DESC, e.first_name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      payroll: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async getPayslip(payrollId: string, employeeId: string) {
    const result = await query(
      `SELECT p.*, e.first_name, e.last_name, e.employee_code, e.designation, e.joining_date,
              d.name as department_name, ss.basic_salary, ss.allowances, ss.deductions as salary_deductions
       FROM payroll p
       JOIN employees e ON e.id = p.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       JOIN salary_structures ss ON ss.id = p.salary_structure_id
       WHERE p.id = $1`,
      [payrollId]
    );

    if (result.rows.length === 0) throw new AppError('Payroll record not found.', 404);

    const payslip = result.rows[0];
    if (payslip.employee_id !== employeeId && employeeId !== '__hr__') {
      throw new AppError('You are not authorized to access this payslip.', 403);
    }

    return payslip;
  },
};
