export type UserRole = 'EMPLOYEE' | 'HR' | 'ADMIN';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
export type LeaveType = 'PAID' | 'SICK' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type NotificationType = 'LEAVE' | 'ATTENDANCE' | 'PAYROLL' | 'SYSTEM';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export type TodayWorkStatus = 'PRESENT' | 'ON_LEAVE' | 'ABSENT_UNAPPROVED';

export interface User {
  id: string;
  employee_id: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  must_change_password?: boolean;
  created_at: string;
  // From employee join
  emp_id?: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  department_id?: string;
  designation?: string;
  employee_code?: string;
  status?: EmployeeStatus;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  profile_image?: string;
  department_id?: string;
  department_name?: string;
  designation?: string;
  joining_date: string;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
  // Salary join
  basic_salary?: number;
  allowances?: number;
  deductions?: number;
  effective_from?: string;
  user_email?: string;
  role?: UserRole;
  // Today's live status for HR card
  today_work_status?: TodayWorkStatus;
  today_check_in?: string;
  today_check_out?: string;
  break_duration?: number;
  working_hours?: number;
}

export interface Attendance {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in?: string;
  check_out?: string;
  break_start?: string;
  break_end?: string;
  break_duration?: number;
  working_hours?: number;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
  // Employee join
  first_name?: string;
  last_name?: string;
  employee_code?: string;
  department_name?: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  remarks?: string;
  status: LeaveStatus;
  hr_comment?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  // Employee join
  first_name?: string;
  last_name?: string;
  employee_code?: string;
  department_name?: string;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  effective_from: string;
  created_at: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  salary_structure_id: string;
  total_working_days?: number;
  present_days?: number;
  paid_leave_days?: number;
  unpaid_leave_days?: number;
  absent_days?: number;
  payable_days?: number;
  base_gross_salary?: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  pay_period: string;
  created_at: string;
  // Joins
  first_name?: string;
  last_name?: string;
  employee_code?: string;
  department_name?: string;
  basic_salary?: number;
  allowances?: number;
  salary_deductions?: number;
  designation?: string;
  joining_date?: string;
}

export interface Document {
  id: string;
  employee_id: string;
  document_name: string;
  document_type: string;
  cloudinary_url: string;
  public_id: string;
  uploaded_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface DashboardKPIs {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeave: number;
  pendingLeaves: number;
  currentMonthPayroll: number;
  recentLeaves: LeaveRequest[];
  departmentStats: { name: string; employee_count: number }[];
  employeeCards?: Employee[];
}
