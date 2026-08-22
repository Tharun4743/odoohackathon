import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🌱 Starting Dayflow HRMS seed...');

    // Hash passwords
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const hrHash = await bcrypt.hash('Hr@123', 12);
    const empHash = await bcrypt.hash('Employee@123', 12);

    // Departments
    const deptIds = {
      engineering: '11111111-1111-1111-1111-111111111111',
      hr: '22222222-2222-2222-2222-222222222222',
      finance: '33333333-3333-3333-3333-333333333333',
      marketing: '44444444-4444-4444-4444-444444444444',
      operations: '55555555-5555-5555-5555-555555555555',
    };

    await client.query(`
      INSERT INTO departments (id, name, description) VALUES
        ($1, 'Engineering', 'Software development and technical operations'),
        ($2, 'Human Resources', 'People operations and talent management'),
        ($3, 'Finance', 'Financial planning, accounting, and payroll'),
        ($4, 'Marketing', 'Brand, campaigns, and growth'),
        ($5, 'Operations', 'Business operations and logistics')
      ON CONFLICT (name) DO NOTHING
    `, [deptIds.engineering, deptIds.hr, deptIds.finance, deptIds.marketing, deptIds.operations]);

    console.log('✅ Departments seeded');

    // Users
    const users = [
      { employee_id: 'EMP-ADMIN-001', email: 'admin@dayflow.com', hash: adminHash, role: 'ADMIN' },
      { employee_id: 'EMP-HR-001', email: 'hr@dayflow.com', hash: hrHash, role: 'HR' },
      { employee_id: 'EMP-001', email: 'employee@dayflow.com', hash: empHash, role: 'EMPLOYEE' },
      { employee_id: 'EMP-002', email: 'alice@dayflow.com', hash: empHash, role: 'EMPLOYEE' },
      { employee_id: 'EMP-003', email: 'bob@dayflow.com', hash: empHash, role: 'EMPLOYEE' },
      { employee_id: 'EMP-004', email: 'carol@dayflow.com', hash: empHash, role: 'EMPLOYEE' },
      { employee_id: 'EMP-005', email: 'david@dayflow.com', hash: empHash, role: 'EMPLOYEE' },
      { employee_id: 'EMP-006', email: 'eva@dayflow.com', hash: empHash, role: 'EMPLOYEE' },
    ];

    const userIds: Record<string, string> = {};
    for (const u of users) {
      const res = await client.query(
        `INSERT INTO users (employee_id, email, password_hash, role, is_verified)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (email) DO UPDATE SET password_hash = $3
         RETURNING id`,
        [u.employee_id, u.email, u.hash, u.role]
      );
      userIds[u.email] = res.rows[0].id;
    }
    console.log('✅ Users seeded');

    // Employee profiles
    const employees = [
      {
        email: 'admin@dayflow.com', code: 'EMP-ADMIN-001', first: 'System', last: 'Administrator',
        phone: '+91-9000000001', dept: deptIds.operations, designation: 'System Administrator',
        joining: '2023-01-01',
      },
      {
        email: 'hr@dayflow.com', code: 'EMP-HR-001', first: 'Priya', last: 'Sharma',
        phone: '+91-9000000002', dept: deptIds.hr, designation: 'HR Manager',
        joining: '2023-01-15',
      },
      {
        email: 'employee@dayflow.com', code: 'EMP-001', first: 'Rahul', last: 'Verma',
        phone: '+91-9000000003', dept: deptIds.engineering, designation: 'Software Engineer',
        joining: '2023-03-01',
      },
      {
        email: 'alice@dayflow.com', code: 'EMP-002', first: 'Alice', last: 'Johnson',
        phone: '+91-9000000004', dept: deptIds.engineering, designation: 'Senior Developer',
        joining: '2023-02-15',
      },
      {
        email: 'bob@dayflow.com', code: 'EMP-003', first: 'Bob', last: 'Williams',
        phone: '+91-9000000005', dept: deptIds.marketing, designation: 'Marketing Specialist',
        joining: '2023-04-01',
      },
      {
        email: 'carol@dayflow.com', code: 'EMP-004', first: 'Carol', last: 'Davis',
        phone: '+91-9000000006', dept: deptIds.finance, designation: 'Financial Analyst',
        joining: '2023-05-15',
      },
      {
        email: 'david@dayflow.com', code: 'EMP-005', first: 'David', last: 'Brown',
        phone: '+91-9000000007', dept: deptIds.engineering, designation: 'DevOps Engineer',
        joining: '2023-06-01',
      },
      {
        email: 'eva@dayflow.com', code: 'EMP-006', first: 'Eva', last: 'Martinez',
        phone: '+91-9000000008', dept: deptIds.operations, designation: 'Operations Manager',
        joining: '2023-07-01',
      },
    ];

    const employeeIds: Record<string, string> = {};
    for (const emp of employees) {
      const res = await client.query(
        `INSERT INTO employees (user_id, employee_code, first_name, last_name, email, phone,
          address, department_id, designation, joining_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
         ON CONFLICT (employee_code) DO UPDATE SET first_name = $3
         RETURNING id`,
        [
          userIds[emp.email], emp.code, emp.first, emp.last, emp.email, emp.phone,
          'Mumbai, Maharashtra, India', emp.dept, emp.designation, emp.joining,
        ]
      );
      employeeIds[emp.email] = res.rows[0].id;
    }
    console.log('✅ Employees seeded');

    // Salary structures
    const salaryData = [
      { email: 'admin@dayflow.com', basic: 120000, allowances: 30000, deductions: 20000 },
      { email: 'hr@dayflow.com', basic: 80000, allowances: 20000, deductions: 15000 },
      { email: 'employee@dayflow.com', basic: 60000, allowances: 15000, deductions: 10000 },
      { email: 'alice@dayflow.com', basic: 90000, allowances: 22000, deductions: 16000 },
      { email: 'bob@dayflow.com', basic: 55000, allowances: 13000, deductions: 9000 },
      { email: 'carol@dayflow.com', basic: 65000, allowances: 16000, deductions: 11000 },
      { email: 'david@dayflow.com', basic: 75000, allowances: 18000, deductions: 13000 },
      { email: 'eva@dayflow.com', basic: 85000, allowances: 21000, deductions: 15500 },
    ];

    const salaryStructureIds: Record<string, string> = {};
    for (const s of salaryData) {
      const empId = employeeIds[s.email];
      if (!empId) continue;
      const res = await client.query(
        `INSERT INTO salary_structures (employee_id, basic_salary, allowances, deductions, effective_from)
         VALUES ($1, $2, $3, $4, '2024-01-01') RETURNING id`,
        [empId, s.basic, s.allowances, s.deductions]
      );
      salaryStructureIds[s.email] = res.rows[0].id;
    }
    console.log('✅ Salary structures seeded');

    // Payroll for last 3 months
    const today = new Date();
    for (const s of salaryData) {
      const empId = employeeIds[s.email];
      const ssId = salaryStructureIds[s.email];
      if (!empId || !ssId) continue;
      const gross = s.basic + s.allowances;
      const net = gross - s.deductions;
      for (let i = 1; i <= 3; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        await client.query(
          `INSERT INTO payroll (employee_id, salary_structure_id, gross_salary, deductions, net_salary, pay_period)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (employee_id, pay_period) DO NOTHING`,
          [empId, ssId, gross, s.deductions, net, period]
        );
      }
    }
    console.log('✅ Payroll seeded');

    // Attendance for last 14 days
    const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'HALF_DAY', 'ABSENT'];
    const empEmails = ['employee@dayflow.com', 'alice@dayflow.com', 'bob@dayflow.com', 'carol@dayflow.com', 'david@dayflow.com'];

    for (const email of empEmails) {
      const empId = employeeIds[email];
      if (!empId) continue;
      for (let i = 1; i <= 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

        const dateStr = d.toISOString().split('T')[0];
        const status = statuses[Math.floor(Math.random() * statuses.length)] as string;
        const checkIn = new Date(d);
        checkIn.setHours(9, Math.floor(Math.random() * 30), 0, 0);
        const checkOut = new Date(d);
        checkOut.setHours(status === 'HALF_DAY' ? 13 : 18, Math.floor(Math.random() * 30), 0, 0);
        const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

        if (status === 'ABSENT') {
          await client.query(
            `INSERT INTO attendance (employee_id, attendance_date, status) VALUES ($1, $2, 'ABSENT')
             ON CONFLICT (employee_id, attendance_date) DO NOTHING`,
            [empId, dateStr]
          );
        } else {
          await client.query(
            `INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, working_hours, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (employee_id, attendance_date) DO NOTHING`,
            [empId, dateStr, checkIn, checkOut, hours.toFixed(2), status]
          );
        }
      }
    }
    console.log('✅ Attendance seeded');

    // Leave requests
    const leaveData = [
      { email: 'employee@dayflow.com', type: 'SICK', start: '2026-08-25', end: '2026-08-26', remarks: 'Fever and cold', status: 'PENDING' },
      { email: 'alice@dayflow.com', type: 'PAID', start: '2026-09-01', end: '2026-09-05', remarks: 'Family vacation', status: 'PENDING' },
      { email: 'bob@dayflow.com', type: 'UNPAID', start: '2026-08-10', end: '2026-08-11', remarks: 'Personal work', status: 'APPROVED' },
      { email: 'carol@dayflow.com', type: 'SICK', start: '2026-07-20', end: '2026-07-22', remarks: 'Medical procedure', status: 'APPROVED' },
      { email: 'david@dayflow.com', type: 'PAID', start: '2026-07-15', end: '2026-07-16', remarks: 'Personal trip', status: 'REJECTED' },
    ];

    for (const l of leaveData) {
      const empId = employeeIds[l.email];
      if (!empId) continue;
      await client.query(
        `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, remarks, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [empId, l.type, l.start, l.end, l.remarks, l.status]
      );
    }
    console.log('✅ Leave requests seeded');

    // Sample notifications
    const notifData = [
      { email: 'employee@dayflow.com', title: 'Welcome to Dayflow!', message: 'Your account has been set up. Start exploring the HRMS.', type: 'SYSTEM' },
      { email: 'hr@dayflow.com', title: 'New Leave Request', message: 'Rahul Verma submitted a sick leave request for 2026-08-25 to 2026-08-26.', type: 'LEAVE' },
      { email: 'alice@dayflow.com', title: 'Payroll Generated', message: 'Your payroll for this month has been generated. Net salary: ₹96,000.', type: 'PAYROLL' },
    ];

    for (const n of notifData) {
      const userId = userIds[n.email];
      if (!userId) continue;
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
        [userId, n.title, n.message, n.type]
      );
    }
    console.log('✅ Notifications seeded');

    await client.query('COMMIT');
    console.log('\n🎉 Dayflow HRMS seed completed successfully!\n');
    console.log('Demo credentials:');
    console.log('  Admin:    admin@dayflow.com    / Admin@123');
    console.log('  HR:       hr@dayflow.com       / Hr@123');
    console.log('  Employee: employee@dayflow.com / Employee@123\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
