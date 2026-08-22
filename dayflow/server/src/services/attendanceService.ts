import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AttendanceFilters } from '../types';

export const attendanceService = {
  async checkIn(employeeId: string): Promise<Record<string, unknown>> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = $2',
      [employeeId, today]
    );

    if (existing.rows.length > 0 && existing.rows[0].check_in) {
      throw new AppError('You have already checked in today.', 409);
    }

    const now = new Date();
    const result = await query(
      `INSERT INTO attendance (employee_id, attendance_date, check_in, status)
       VALUES ($1, $2, $3, 'PRESENT')
       ON CONFLICT (employee_id, attendance_date)
       DO UPDATE SET check_in = $3, status = 'PRESENT', updated_at = NOW()
       RETURNING *`,
      [employeeId, today, now]
    );

    return result.rows[0];
  },

  async startBreak(employeeId: string): Promise<Record<string, unknown>> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = $2',
      [employeeId, today]
    );

    if (existing.rows.length === 0 || !existing.rows[0].check_in) {
      throw new AppError('You must check in before starting a break.', 400);
    }
    if (existing.rows[0].check_out) {
      throw new AppError('Cannot start break after checking out.', 400);
    }
    if (existing.rows[0].break_start && !existing.rows[0].break_end) {
      throw new AppError('You are already on a break.', 409);
    }

    const now = new Date();
    const result = await query(
      `UPDATE attendance
       SET break_start = $1, break_end = NULL, updated_at = NOW()
       WHERE employee_id = $2 AND attendance_date = $3
       RETURNING *`,
      [now, employeeId, today]
    );

    return result.rows[0];
  },

  async endBreak(employeeId: string): Promise<Record<string, unknown>> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = $2',
      [employeeId, today]
    );

    if (existing.rows.length === 0 || !existing.rows[0].break_start) {
      throw new AppError('No active break found to end.', 400);
    }
    if (existing.rows[0].break_end) {
      throw new AppError('Break has already ended.', 409);
    }

    const now = new Date();
    const breakStart = new Date(existing.rows[0].break_start);
    const addedBreakHours = parseFloat(((now.getTime() - breakStart.getTime()) / (1000 * 60 * 60)).toFixed(2));
    const totalBreakDuration = parseFloat((parseFloat(existing.rows[0].break_duration || '0') + addedBreakHours).toFixed(2));

    const result = await query(
      `UPDATE attendance
       SET break_end = $1, break_duration = $2, updated_at = NOW()
       WHERE employee_id = $3 AND attendance_date = $4
       RETURNING *`,
      [now, totalBreakDuration, employeeId, today]
    );

    return result.rows[0];
  },

  async checkOut(employeeId: string): Promise<Record<string, unknown>> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = $2',
      [employeeId, today]
    );

    if (existing.rows.length === 0 || !existing.rows[0].check_in) {
      throw new AppError('You must check in before checking out.', 400);
    }

    if (existing.rows[0].check_out) {
      throw new AppError('You have already checked out today.', 409);
    }

    const now = new Date();
    const checkIn = new Date(existing.rows[0].check_in);

    // If break was started and not ended, auto end it at checkout
    let breakDuration = parseFloat(existing.rows[0].break_duration || '0');
    if (existing.rows[0].break_start && !existing.rows[0].break_end) {
      const breakStart = new Date(existing.rows[0].break_start);
      const added = parseFloat(((now.getTime() - breakStart.getTime()) / (1000 * 60 * 60)).toFixed(2));
      breakDuration += added;
    }

    const totalHours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    const netWorkingHours = Math.max(0, parseFloat((totalHours - breakDuration).toFixed(2)));
    const status = netWorkingHours >= 4 && netWorkingHours < 7 ? 'HALF_DAY' : 'PRESENT';

    const result = await query(
      `UPDATE attendance
       SET check_out = $1, break_end = COALESCE(break_end, $1), break_duration = $2, working_hours = $3, status = $4, updated_at = NOW()
       WHERE employee_id = $5 AND attendance_date = $6
       RETURNING *`,
      [now, breakDuration, netWorkingHours, status, employeeId, today]
    );

    return result.rows[0];
  },

  async getTodayAttendance(employeeId: string): Promise<Record<string, unknown> | null> {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = $2',
      [employeeId, today]
    );
    return result.rows[0] || null;
  },

  // Returns day-wise attendance for the requested or current month
  async getMonthAttendance(employeeId: string, monthStr?: string) {
    const now = new Date();
    const currentMonth = monthStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const startDate = `${currentMonth}-01`;
    const endDate = `${currentMonth}-${String(daysInMonth).padStart(2, '0')}`;

    // Get attendance records
    const attResult = await query(
      `SELECT * FROM attendance
       WHERE employee_id = $1 AND attendance_date >= $2 AND attendance_date <= $3
       ORDER BY attendance_date ASC`,
      [employeeId, startDate, endDate]
    );

    // Get approved leaves for that month
    const leaveResult = await query(
      `SELECT * FROM leave_requests
       WHERE employee_id = $1 AND status = 'APPROVED'
         AND start_date <= $3 AND end_date >= $2`,
      [employeeId, startDate, endDate]
    );

    const attMap = new Map<string, Record<string, unknown>>();
    attResult.rows.forEach(r => {
      const d = typeof r.attendance_date === 'string'
        ? r.attendance_date.split('T')[0]
        : new Date(r.attendance_date).toISOString().split('T')[0];
      attMap.set(d, r);
    });

    const days = [];
    let presentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let absentCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
      const record = attMap.get(dateStr);
      const isLeave = leaveResult.rows.some((l: { start_date: string; end_date: string }) => {
        const start = new Date(l.start_date).toISOString().split('T')[0];
        const end = new Date(l.end_date).toISOString().split('T')[0];
        return dateStr >= start && dateStr <= end;
      });

      let status = 'ABSENT';
      if (record) {
        status = record.status as string;
      } else if (isLeave) {
        status = 'LEAVE';
      }

      if (status === 'PRESENT') presentCount++;
      else if (status === 'HALF_DAY') halfDayCount++;
      else if (status === 'LEAVE') leaveCount++;
      else if (new Date(dateStr) <= now) absentCount++;

      days.push({
        date: dateStr,
        day,
        check_in: record?.check_in || null,
        check_out: record?.check_out || null,
        break_duration: record?.break_duration || 0,
        working_hours: record?.working_hours || 0,
        status,
      });
    }

    return {
      month: currentMonth,
      totalDays: daysInMonth,
      summary: {
        present: presentCount,
        halfDay: halfDayCount,
        leave: leaveCount,
        absent: absentCount,
      },
      days,
    };
  },

  // Live status for HR/Admin dashboard cards
  async getLiveStatusToday() {
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT
        e.id, e.user_id, e.employee_code, e.first_name, e.last_name, e.email,
        e.phone, e.profile_image, e.designation, e.department_id,
        d.name as department_name,
        a.check_in, a.check_out, a.break_start, a.break_end, a.break_duration, a.working_hours, a.status as att_status,
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

    return result.rows;
  },

  async getHistory(employeeId: string, filters: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const { startDate, endDate, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const conditions = ['a.employee_id = $1'];
    const params: unknown[] = [employeeId];
    let idx = 2;

    if (startDate) {
      conditions.push(`a.attendance_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`a.attendance_date <= $${idx++}`);
      params.push(endDate);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await query(`SELECT COUNT(*) FROM attendance a ${where}`, params);

    const result = await query(
      `SELECT a.* FROM attendance a ${where}
       ORDER BY a.attendance_date DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      attendance: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async getAllAttendance(filters: AttendanceFilters) {
    const { employeeId, departmentId, startDate, endDate, status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (employeeId) { conditions.push(`a.employee_id = $${idx++}`); params.push(employeeId); }
    if (startDate) { conditions.push(`a.attendance_date >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`a.attendance_date <= $${idx++}`); params.push(endDate); }
    if (status) { conditions.push(`a.status = $${idx++}`); params.push(status); }
    if (departmentId) { conditions.push(`e.department_id = $${idx++}`); params.push(departmentId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       ${where}`,
      params
    );

    const result = await query(
      `SELECT a.*, e.first_name, e.last_name, e.employee_code, d.name as department_name
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       ${where}
       ORDER BY a.attendance_date DESC, a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      attendance: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async getWeeklySummary(employeeId: string) {
    const result = await query(
      `SELECT attendance_date, check_in, check_out, break_duration, working_hours, status
       FROM attendance
       WHERE employee_id = $1
         AND attendance_date >= CURRENT_DATE - INTERVAL '6 days'
       ORDER BY attendance_date`,
      [employeeId]
    );
    return result.rows;
  },
};
