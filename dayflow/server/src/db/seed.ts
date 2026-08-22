import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const isRemote =
  process.env.DATABASE_URL?.includes('supabase.com') ||
  process.env.DATABASE_URL?.includes('pooler') ||
  process.env.DATABASE_URL?.includes('aws') ||
  process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🌱 Cleaning old data and seeding ONLY the 4 team members into Supabase...');

    // 1. Clean reset all tables including departments
    await client.query(`
      TRUNCATE TABLE notifications, leave_requests, attendance, payroll, salary_structures, documents, employees, users, departments CASCADE;
    `);
    console.log('🧹 Purged all dummy/mock records & reset all tables');

    // 2. Hash passwords
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const hrHash = await bcrypt.hash('12345678', 12);
    const empHash = await bcrypt.hash('Employee@123', 12);

    // 3. Departments
    const deptIds = {
      engineering: '11111111-1111-1111-1111-111111111111',
      hr: '22222222-2222-2222-2222-222222222222',
      finance: '33333333-3333-3333-3333-333333333333',
      operations: '44444444-4444-4444-4444-444444444444',
    };

    await client.query(`
      INSERT INTO departments (id, name, description) VALUES
        ($1, 'Engineering', 'Software architecture, full stack development, and system infrastructure'),
        ($2, 'Human Resources', 'People operations, talent recruitment, and employee relations'),
        ($3, 'Finance & Payroll', 'Compensation planning, financial accounting, and salary administration'),
        ($4, 'Operations & Management', 'Executive strategy, operations oversight, and system administration')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    `, [deptIds.engineering, deptIds.hr, deptIds.finance, deptIds.operations]);

    console.log('✅ Real departments configured');

    // 4. The 4 Team Members
    const team = [
      {
        employee_code: 'EMP-001',
        first_name: 'Tharunkumar',
        last_name: 'K',
        email: 'tharunkumark42007@gmail.com',
        phone: '+91 98765 43210',
        role: 'ADMIN' as const,
        hash: adminHash,
        dept_id: deptIds.operations,
        designation: 'Lead Administrator & Tech Lead',
        joining_date: '2023-01-01',
        basic_salary: 125000,
        allowances: 35000,
        deductions: 20000,
      },
      {
        employee_code: 'EMP-002',
        first_name: 'Sanjay',
        last_name: 'S',
        email: 'sanjayselvakumar05@gmail.com',
        phone: '+91 98765 43211',
        role: 'HR' as const,
        hash: hrHash,
        dept_id: deptIds.hr,
        designation: 'HR Officer & People Operations Manager',
        joining_date: '2023-01-15',
        basic_salary: 95000,
        allowances: 25000,
        deductions: 15000,
      },
      {
        employee_code: 'EMP-003',
        first_name: 'Ramkishore',
        last_name: 'S M',
        email: 'ramkishoresm@gmail.com',
        phone: '+91 98765 43212',
        role: 'EMPLOYEE' as const,
        hash: empHash,
        dept_id: deptIds.engineering,
        designation: 'Senior Software Engineer',
        joining_date: '2023-03-01',
        basic_salary: 85000,
        allowances: 20000,
        deductions: 14000,
      },
      {
        employee_code: 'EMP-004',
        first_name: 'Santhoshkumar',
        last_name: 'S',
        email: 'writetokumarsanthosh@gmail.com',
        phone: '+91 98765 43213',
        role: 'EMPLOYEE' as const,
        hash: empHash,
        dept_id: deptIds.engineering,
        designation: 'Full Stack Engineer & Analytics Lead',
        joining_date: '2023-02-15',
        basic_salary: 85000,
        allowances: 20000,
        deductions: 14000,
      },
    ];

    const userIds: Record<string, string> = {};
    const employeeIds: Record<string, string> = {};
    const salaryStructureIds: Record<string, string> = {};

    for (const member of team) {
      // 4a. Create User
      const userRes = await client.query(
        `INSERT INTO users (employee_id, email, password_hash, role, is_verified, must_change_password)
         VALUES ($1, $2, $3, $4, true, false)
         RETURNING id`,
        [member.employee_code, member.email, member.hash, member.role]
      );
      userIds[member.email] = userRes.rows[0].id;

      // 4b. Create Employee Profile
      const empRes = await client.query(
        `INSERT INTO employees (user_id, employee_code, first_name, last_name, email, phone,
          address, department_id, designation, joining_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
         RETURNING id`,
        [
          userIds[member.email],
          member.employee_code,
          member.first_name,
          member.last_name,
          member.email,
          member.phone,
          'Tamil Nadu, India',
          member.dept_id,
          member.designation,
          member.joining_date,
        ]
      );
      const empId = empRes.rows[0].id;
      employeeIds[member.email] = empId;

      // 4c. Create Salary Structure
      const ssRes = await client.query(
        `INSERT INTO salary_structures (employee_id, basic_salary, allowances, deductions, effective_from)
         VALUES ($1, $2, $3, $4, '2024-01-01')
         RETURNING id`,
        [empId, member.basic_salary, member.allowances, member.deductions]
      );
      salaryStructureIds[member.email] = ssRes.rows[0].id;
    }

    console.log('✅ All 4 team members created in users, employees, and salary_structures');

    // 5. Payroll for last 3 months
    const today = new Date();
    for (const member of team) {
      const empId = employeeIds[member.email];
      const ssId = salaryStructureIds[member.email];
      const gross = member.basic_salary + member.allowances;
      const net = gross - member.deductions;

      for (let i = 1; i <= 3; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        await client.query(
          `INSERT INTO payroll (
            employee_id, salary_structure_id, total_working_days, present_days,
            paid_leave_days, unpaid_leave_days, absent_days, payable_days,
            base_gross_salary, gross_salary, deductions, net_salary, pay_period
          ) VALUES ($1, $2, 30, 28, 2, 0, 0, 30, $3, $3, $4, $5, $6)`,
          [empId, ssId, gross, member.deductions, net, period]
        );
      }
    }
    console.log('✅ Attendance-linked payroll records seeded');

    // 6. Attendance logs for last 14 days + today's live punch
    const todayStr = new Date().toISOString().split('T')[0];

    for (const member of team) {
      const empId = employeeIds[member.email];

      // Past 14 days
      for (let i = 1; i <= 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

        const dateStr = d.toISOString().split('T')[0];
        const checkIn = new Date(d);
        checkIn.setHours(9, 15, 0, 0);
        const checkOut = new Date(d);
        checkOut.setHours(18, 0, 0, 0);

        await client.query(
          `INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, break_duration, working_hours, status)
           VALUES ($1, $2, $3, $4, 1.0, 7.75, 'PRESENT')`,
          [empId, dateStr, checkIn, checkOut]
        );
      }

      // Today's live check-in for real-time status card display
      const todayCheckIn = new Date();
      todayCheckIn.setHours(9, 0, 0, 0);

      await client.query(
        `INSERT INTO attendance (employee_id, attendance_date, check_in, break_duration, working_hours, status)
         VALUES ($1, $2, $3, 0.5, 4.5, 'PRESENT')`,
        [empId, todayStr, todayCheckIn]
      );
    }
    console.log('✅ Attendance & live work-status logs seeded');

    // 7. Real Time-off Requests
    await client.query(`
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, remarks, status) VALUES
        ($1, 'PAID', '2026-09-01', '2026-09-03', 'Technical architecture conference & personal travel', 'PENDING'),
        ($2, 'SICK', '2026-08-28', '2026-08-29', 'Medical appointment and recovery', 'PENDING'),
        ($3, 'PAID', '2026-08-10', '2026-08-12', 'Annual leave request', 'APPROVED')
    `, [employeeIds['ramkishoresm@gmail.com'], employeeIds['writetokumarsanthosh@gmail.com'], employeeIds['sanjayselvakumar05@gmail.com']]);

    console.log('✅ Time off requests seeded');

    // 8. Notifications
    await client.query(`
      INSERT INTO notifications (user_id, title, message, type) VALUES
        ($1, 'Welcome Lead Administrator!', 'Dayflow HRMS command center initialized with 4 official team members.', 'SYSTEM'),
        ($2, 'HR Operations Workspace Ready', 'You have HR management permissions for employee profiles, time-off review, and payroll.', 'SYSTEM'),
        ($3, 'Welcome to Dayflow HRMS!', 'Your profile is active. You can log attendance, breaks, and request time off.', 'SYSTEM'),
        ($4, 'Welcome to Dayflow HRMS!', 'Your profile is active. You can view attendance, salary structures, and payslips.', 'SYSTEM')
    `, [
      userIds['tharunkumark42007@gmail.com'],
      userIds['sanjayselvakumar05@gmail.com'],
      userIds['ramkishoresm@gmail.com'],
      userIds['writetokumarsanthosh@gmail.com'],
    ]);

    console.log('✅ Notifications seeded');

    await client.query('COMMIT');
    console.log('\n🎉 SUCCESS: Database has been populated with ONLY the 4 team members!\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════════');
    console.log('  1. THARUNKUMAR K (Admin):      tharunkumark42007@gmail.com   / Admin@123    [EMP-001]');
    console.log('  2. SANJAY S (HR Officer):      sanjayselvakumar05@gmail.com  / Hr@123       [EMP-002]');
    console.log('  3. RAMKISHORE S M (Employee):  ramkishoresm@gmail.com        / Employee@123 [EMP-003]');
    console.log('  4. SANTHOSHKUMAR S (Employee): writetokumarsanthosh@gmail.com / Employee@123 [EMP-004]');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════════\n');

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
