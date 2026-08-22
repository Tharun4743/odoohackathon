import { query } from '../config/database';

export const analyticsService = {
  async getAttendanceAnalytics(filters: { startDate?: string; endDate?: string; departmentId?: string }) {
    const { startDate, endDate, departmentId } = filters;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (startDate) { conditions.push(`a.attendance_date >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`a.attendance_date <= $${idx++}`); params.push(endDate); }
    if (departmentId) { conditions.push(`e.department_id = $${idx++}`); params.push(departmentId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const statusBreakdown = await query(
      `SELECT a.status, COUNT(*) as count
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       ${where}
       GROUP BY a.status`,
      params
    );

    const dailyTrend = await query(
      `SELECT a.attendance_date, a.status, COUNT(*) as count
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       ${where}
       GROUP BY a.attendance_date, a.status
       ORDER BY a.attendance_date DESC
       LIMIT 30`,
      params
    );

    return {
      statusBreakdown: statusBreakdown.rows,
      dailyTrend: dailyTrend.rows,
    };
  },

  async getLeaveAnalytics(filters: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = filters;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (startDate) { conditions.push(`lr.start_date >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`lr.end_date <= $${idx++}`); params.push(endDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const typeBreakdown = await query(
      `SELECT lr.leave_type, COUNT(*) as count FROM leave_requests lr ${where} GROUP BY lr.leave_type`,
      params
    );

    const statusBreakdown = await query(
      `SELECT lr.status, COUNT(*) as count FROM leave_requests lr ${where} GROUP BY lr.status`,
      params
    );

    const monthlyTrend = await query(
      `SELECT TO_CHAR(lr.start_date, 'YYYY-MM') as month, COUNT(*) as count
       FROM leave_requests lr ${where}
       GROUP BY TO_CHAR(lr.start_date, 'YYYY-MM')
       ORDER BY month DESC LIMIT 12`,
      params
    );

    return { typeBreakdown: typeBreakdown.rows, statusBreakdown: statusBreakdown.rows, monthlyTrend: monthlyTrend.rows };
  },

  async getPayrollAnalytics() {
    const totalPayroll = await query(
      `SELECT SUM(net_salary) as total, AVG(net_salary) as average, MAX(net_salary) as max_salary, MIN(net_salary) as min_salary
       FROM payroll WHERE pay_period = TO_CHAR(NOW(), 'YYYY-MM')`
    );

    const departmentSalary = await query(
      `SELECT d.name as department, SUM(p.net_salary) as total_salary, COUNT(p.id) as employee_count
       FROM payroll p
       JOIN employees e ON e.id = p.employee_id
       JOIN departments d ON d.id = e.department_id
       WHERE p.pay_period = TO_CHAR(NOW(), 'YYYY-MM')
       GROUP BY d.name ORDER BY total_salary DESC`
    );

    const monthlyTrend = await query(
      `SELECT pay_period, SUM(net_salary) as total FROM payroll
       GROUP BY pay_period ORDER BY pay_period DESC LIMIT 12`
    );

    return {
      summary: totalPayroll.rows[0],
      departmentSalary: departmentSalary.rows,
      monthlyTrend: monthlyTrend.rows,
    };
  },

  async getDashboardKPIs() {
    const today = new Date().toISOString().split('T')[0];

    const totalEmployees = await query(`SELECT COUNT(*) as count FROM employees WHERE status = 'ACTIVE'`);
    const presentToday = await query(
      `SELECT COUNT(*) as count FROM attendance WHERE attendance_date = $1 AND check_in IS NOT NULL`,
      [today]
    );
    const onLeave = await query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM leave_requests
       WHERE status = 'APPROVED' AND start_date <= $1 AND end_date >= $1`,
      [today]
    );
    const absentToday = Math.max(
      0,
      parseInt(totalEmployees.rows[0].count) - parseInt(presentToday.rows[0].count) - parseInt(onLeave.rows[0].count)
    );
    const pendingLeaves = await query(
      `SELECT COUNT(*) as count FROM leave_requests WHERE status = 'PENDING'`
    );
    const currentMonthPayroll = await query(
      `SELECT COALESCE(SUM(net_salary), 0) as total FROM payroll WHERE pay_period = TO_CHAR(NOW(), 'YYYY-MM')`
    );

    const recentLeaves = await query(
      `SELECT lr.*, e.first_name, e.last_name, e.employee_code
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       ORDER BY lr.created_at DESC LIMIT 5`
    );

    const departmentStats = await query(
      `SELECT d.name, COUNT(e.id) as employee_count
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'ACTIVE'
       GROUP BY d.id, d.name ORDER BY employee_count DESC`
    );

    // Employee status cards for HR dashboard
    const employeeCards = await query(
      `SELECT
        e.id, e.user_id, e.employee_code, e.first_name, e.last_name, e.email,
        e.phone, e.profile_image, e.designation, e.department_id,
        d.name as department_name,
        a.check_in, a.check_out, a.working_hours,
        CASE
          WHEN a.check_in IS NOT NULL THEN 'PRESENT'
          WHEN lr.id IS NOT NULL THEN 'ON_LEAVE'
          ELSE 'ABSENT_UNAPPROVED'
        END as today_work_status
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = $1
      LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.status = 'APPROVED'
        AND lr.start_date <= $1 AND lr.end_date >= $1
      WHERE e.status = 'ACTIVE'
      ORDER BY e.first_name ASC`,
      [today]
    );

    return {
      totalEmployees: parseInt(totalEmployees.rows[0].count),
      presentToday: parseInt(presentToday.rows[0].count),
      absentToday,
      onLeave: parseInt(onLeave.rows[0].count),
      pendingLeaves: parseInt(pendingLeaves.rows[0].count),
      currentMonthPayroll: parseFloat(currentMonthPayroll.rows[0].total),
      recentLeaves: recentLeaves.rows,
      departmentStats: departmentStats.rows,
      employeeCards: employeeCards.rows,
    };
  },
};
