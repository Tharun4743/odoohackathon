import { query } from '../config/database';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { User, UserRole } from '../types';
import { sendEmail } from '../utils/mailer';

// In-memory store for registration OTPs with 15-minute expiration
interface PendingRegistration {
  employee_id: string;
  email: string;
  role: UserRole;
  otp: string;
  expiresAt: number;
}

const registrationOtpStore = new Map<string, PendingRegistration>();

export const authService = {
  async sendRegisterOtp(data: {
    employee_id: string;
    email: string;
    role?: UserRole;
  }): Promise<{ success: boolean; message: string }> {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanEmpId = data.employee_id.trim().toUpperCase();
    const role: UserRole = data.role === 'HR' ? 'HR' : 'EMPLOYEE';

    if (!cleanEmpId || !cleanEmail) {
      throw new AppError('Employee ID and email address are required.', 400);
    }

    // Check if user already exists
    const existing = await query(
      'SELECT id, email, employee_id FROM users WHERE email = $1 OR employee_id = $2',
      [cleanEmail, cleanEmpId]
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0].email === cleanEmail) {
        throw new AppError('An account with this email address already exists. Please sign in.', 409);
      }
      throw new AppError('An account with this Employee ID already exists. Please sign in.', 409);
    }

    // Generate 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    registrationOtpStore.set(cleanEmail, {
      employee_id: cleanEmpId,
      email: cleanEmail,
      role,
      otp,
      expiresAt,
    });

    // Send verification email via Brevo HTTPS API
    await sendEmail({
      to: cleanEmail,
      subject: 'Work Suite HRMS — Verify Your Email to Complete Sign Up',
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 28px; background: #f5f5f4; border-radius: 16px; max-width: 500px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1c1917; font-size: 22px; font-weight: 800; margin: 0;">Work Suite HRMS</h1>
            <p style="color: #78716c; font-size: 13px; margin: 4px 0 0;">New Account Registration</p>
          </div>
          <div style="background: white; border: 1px solid #e7e5e4; padding: 24px; border-radius: 12px; text-align: center;">
            <p style="color: #44403c; font-size: 14px; margin-top: 0; line-height: 1.5;">
              Welcome to Work Suite HRMS! Please use the 6-digit verification code below to complete your account registration for <strong>${cleanEmpId}</strong>.
            </p>
            <p style="color: #78716c; font-size: 12px; margin-bottom: 12px;">Your Email Verification Code:</p>
            <div style="background: #1c1917; color: white; font-size: 28px; font-weight: 800; letter-spacing: 6px; padding: 14px 24px; border-radius: 10px; display: inline-block; margin: 0 auto 16px;">
              ${otp}
            </div>
            <p style="color: #dc2626; font-size: 12px; font-weight: 600; margin: 0;">
              ⏳ This code expires in 15 minutes.
            </p>
          </div>
          <p style="color: #a8a29e; font-size: 11px; text-align: center; margin-top: 16px;">
            If you did not request this registration, please ignore this email.
          </p>
        </div>
      `,
    });

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email address.',
    };
  },

  async verifyRegisterOtp(data: {
    employee_id: string;
    email: string;
    password: string;
    role?: UserRole;
    otp: string;
    first_name?: string;
    last_name?: string;
  }): Promise<{ success: boolean; message: string; user: Omit<User, 'password_hash'> }> {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanOtp = data.otp.trim();
    const cleanPassword = data.password;

    if (!cleanPassword || cleanPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long.', 400);
    }

    const pending = registrationOtpStore.get(cleanEmail);
    if (!pending) {
      throw new AppError('No pending registration found. Please request a new verification code.', 400);
    }

    if (Date.now() > pending.expiresAt) {
      registrationOtpStore.delete(cleanEmail);
      throw new AppError('Verification code has expired. Please request a new one.', 400);
    }

    if (pending.otp !== cleanOtp) {
      throw new AppError('Invalid verification code. Please check your code and try again.', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(cleanPassword, 12);
    const role = pending.role || 'EMPLOYEE';
    const empCode = pending.employee_id;

    // Derive names if not provided
    const nameParts = cleanEmail.split('@')[0].split(/[._-]/);
    const firstName = data.first_name?.trim() || nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || 'Member';
    const lastName = data.last_name?.trim() || (nameParts[1] ? nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) : 'Employee');

    // Create User
    const userRes = await query(
      `INSERT INTO users (employee_id, email, password_hash, role, is_verified, must_change_password)
       VALUES ($1, $2, $3, $4, TRUE, FALSE)
       RETURNING id, employee_id, email, role, is_verified, must_change_password, created_at, updated_at`,
      [empCode, cleanEmail, passwordHash, role]
    );
    const user = userRes.rows[0];

    // Create Employee Profile
    await query(
      `INSERT INTO employees (user_id, employee_code, first_name, last_name, email, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       ON CONFLICT (employee_code) DO NOTHING`,
      [user.id, empCode, firstName, lastName, cleanEmail]
    );

    // Clean up OTP store
    registrationOtpStore.delete(cleanEmail);

    return {
      success: true,
      message: 'Account created successfully! You can now sign in.',
      user,
    };
  },

  async register(data: {
    employee_id: string;
    email: string;
    password: string;
    role: UserRole;
    first_name?: string;
    last_name?: string;
  }): Promise<Omit<User, 'password_hash'>> {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanEmpId = data.employee_id.trim().toUpperCase();

    const existing = await query(
      'SELECT id, email, employee_id FROM users WHERE email = $1 OR employee_id = $2',
      [cleanEmail, cleanEmpId]
    );
    if (existing.rows.length > 0) {
      throw new AppError('An account with this email or Employee ID already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const userRes = await query(
      `INSERT INTO users (employee_id, email, password_hash, role, is_verified, must_change_password)
       VALUES ($1, $2, $3, $4, TRUE, FALSE)
       RETURNING id, employee_id, email, role, is_verified, must_change_password, created_at, updated_at`,
      [cleanEmpId, cleanEmail, passwordHash, data.role || 'EMPLOYEE']
    );
    const user = userRes.rows[0];

    const nameParts = cleanEmail.split('@')[0].split(/[._-]/);
    const firstName = data.first_name?.trim() || nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || 'Member';
    const lastName = data.last_name?.trim() || (nameParts[1] ? nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) : 'Employee');

    await query(
      `INSERT INTO employees (user_id, employee_code, first_name, last_name, email, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       ON CONFLICT (employee_code) DO NOTHING`,
      [user.id, cleanEmpId, firstName, lastName, cleanEmail]
    );

    return user;
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

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const result = await query('SELECT id, email FROM users WHERE email = $1', [cleanEmail]);

    if (result.rows.length === 0) {
      throw new AppError('No account found with this email address.', 404);
    }

    // Generate 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    await query(
      `UPDATE users
       SET reset_token = $1, reset_token_expires_at = $2, updated_at = NOW()
       WHERE email = $3`,
      [otp, expiresAt, cleanEmail]
    );

    // Send email via Brevo HTTPS API
    await sendEmail({
      to: cleanEmail,
      subject: 'Work Suite HRMS — Password Reset Verification Code',
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 28px; background: #f5f5f4; border-radius: 16px; max-width: 500px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1c1917; font-size: 22px; font-weight: 800; margin: 0;">Work Suite HRMS</h1>
            <p style="color: #78716c; font-size: 13px; margin: 4px 0 0;">Password Reset Request</p>
          </div>
          <div style="background: white; border: 1px solid #e7e5e4; padding: 24px; border-radius: 12px; text-align: center;">
            <p style="color: #44403c; font-size: 14px; margin-top: 0; line-height: 1.5;">
              We received a request to reset your password for your Work Suite HRMS account.
            </p>
            <p style="color: #78716c; font-size: 12px; margin-bottom: 12px;">Your 6-Digit Verification Code is:</p>
            <div style="background: #1c1917; color: white; font-size: 28px; font-weight: 800; letter-spacing: 6px; padding: 14px 24px; border-radius: 10px; display: inline-block; margin: 0 auto 16px;">
              ${otp}
            </div>
            <p style="color: #dc2626; font-size: 12px; font-weight: 600; margin: 0;">
              ⏳ This code is valid for 15 minutes only.
            </p>
          </div>
          <p style="color: #a8a29e; font-size: 11px; text-align: center; margin-top: 16px;">
            If you did not request this password reset, please ignore this email or notify your HR administrator.
          </p>
        </div>
      `,
    });

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email address.',
    };
  },

  async resetPassword(email: string, token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanToken = token.trim();

    if (!newPassword || newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long.', 400);
    }

    const result = await query(
      `SELECT id, reset_token, reset_token_expires_at
       FROM users
       WHERE email = $1`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      throw new AppError('No account found with this email.', 404);
    }

    const user = result.rows[0];

    if (!user.reset_token || user.reset_token !== cleanToken) {
      throw new AppError('Invalid verification code.', 400);
    }

    const now = new Date();
    const expiresAt = new Date(user.reset_token_expires_at);

    if (now > expiresAt) {
      throw new AppError('Verification code has expired. Please request a new code.', 400);
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await query(
      `UPDATE users
       SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL, must_change_password = FALSE, updated_at = NOW()
       WHERE id = $2`,
      [newHash, user.id]
    );

    return {
      success: true,
      message: 'Your password has been reset successfully. You can now sign in.',
    };
  },
};
