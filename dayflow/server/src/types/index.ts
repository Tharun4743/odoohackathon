export type UserRole = 'EMPLOYEE' | 'HR' | 'ADMIN';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

export type LeaveType = 'PAID' | 'SICK' | 'UNPAID';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type NotificationType = 'LEAVE' | 'ATTENDANCE' | 'PAYROLL' | 'SYSTEM';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export interface User {
  id: string;
  employee_id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_verified: boolean;
  must_change_password?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  created_at: Date;
}

export interface Employee {
  id: string;
  user_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  profile_image: string;
  department_id: string;
  designation: string;
  joining_date: Date;
  status: EmployeeStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Attendance {
  id: string;
  employee_id: string;
  attendance_date: Date | string;
  check_in: Date | string | null;
  check_out: Date | string | null;
  break_start?: Date | string | null;
  break_end?: Date | string | null;
  break_duration?: number;
  working_hours: number | null;
  status: AttendanceStatus;
  created_at: Date;
  updated_at: Date;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: Date | string;
  end_date: Date | string;
  remarks: string;
  status: LeaveStatus;
  hr_comment: string;
  approved_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  effective_from: Date | string;
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  employee_id: string;
  document_name: string;
  document_type: string;
  cloudinary_url: string;
  public_id: string;
  uploaded_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  employeeId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface AttendanceFilters extends PaginationParams {
  employeeId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
}

export interface LeaveFilters extends PaginationParams {
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
}
