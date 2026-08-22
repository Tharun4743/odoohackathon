import { query } from '../config/database';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { User, UserRole } from '../types';

export const authService = {
  // Self registration is disabled per company policy; HR/Admin creates employee accounts
  async register(_data: {
    employee_id: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<Omit<User, 'password_hash'>> {
    throw new AppError(
      'Self-registration is disabled. Employee accounts must be created by an HR Officer or Administrator.',
      403
    );
  },

  async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; employee: Record<string, unknown> | null }> {
    const result = await query(
      `SELECT u.*, e.id as emp_id, e.first_name, e.last_name, e.profile_image,
              e.department_id, e.designation, e.employee_code, e.status as emp_status
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password.', 401);
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    const { password_hash, ...safeUser } = user;
    void password_hash;

    const employee = user.emp_id ? {
      id: user.emp_id,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_image: user.profile_image,
      department_id: user.department_id,
      designation: user.designation,
      employee_code: user.employee_code,
      status: user.emp_status,
    } : null;

    return { user: safeUser, employee };
  },

  async getUserById(userId: string): Promise<Record<string, unknown> | null> {
    const result = await query(
      `SELECT u.id, u.employee_id, u.email, u.role, u.is_verified, u.must_change_password, u.created_at,
              e.id as emp_id, e.first_name, e.last_name, e.profile_image,
              e.department_id, e.designation, e.employee_code, e.status
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) throw new AppError('User not found.', 404);

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) throw new AppError('Current password is incorrect.', 400);

    const newHash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );
  },
};
