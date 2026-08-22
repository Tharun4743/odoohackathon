-- ============================================================
-- Dayflow HRMS — Official Team Seed Reference
-- Team Credentials:
--   1. THARUNKUMAR K (Admin):      tharunkumark42007@gmail.com   / Admin@123    [EMP-001]
--   2. SANJAY S (HR Officer):      sanjayselvakumar05@gmail.com  / Hr@123       [EMP-002]
--   3. RAMKISHORE S M (Employee):  ramkishoresm@gmail.com        / Employee@123 [EMP-003]
--   4. SANTHOSHKUMAR S (Employee): writetokumarsanthosh@gmail.com / Employee@123 [EMP-004]
-- ============================================================

-- DEPARTMENTS
INSERT INTO departments (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Engineering', 'Software architecture, full stack development, and system infrastructure'),
  ('22222222-2222-2222-2222-222222222222', 'Human Resources', 'People operations, talent recruitment, and employee relations'),
  ('33333333-3333-3333-3333-333333333333', 'Finance & Payroll', 'Compensation planning, financial accounting, and salary administration'),
  ('44444444-4444-4444-4444-444444444444', 'Operations & Management', 'Executive strategy, operations oversight, and system administration')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Use `npm run seed` in server/ to execute the full TypeScript seed script with bcrypt hashing.
