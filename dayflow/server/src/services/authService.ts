import { query } from '../config/database';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { User, UserRole } from '../types';
import { sendEmail, buildProfessionalEmailHtml } from '../utils/mailer';
import { notificationService } from './notificationService';

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

    // Check if user already exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR employee_id = $2',
      [cleanEmail, cleanEmpId]
    );
    if (existing.rows.length > 0) {
      throw new AppError('An account with this email or Employee ID already exists.', 409);
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    registrationOtpStore.set(cleanEmail, {
      employee_id: cleanEmpId,
      email: cleanEmail,
      role: data.role || 'EMPLOYEE',
      otp,
      expiresAt,
    });

    const isBrevoConfigured = !!process.env.BREVO_API_KEY;
    const isSmtpConfigured = !!process.env.SMTP_USER;

    if (!isBrevoConfigured && !isSmtpConfigured) {
      console.log(`\n======================================================`);
      console.log(`🔑 DEV REGISTRATION OTP for ${cleanEmail}: [ ${otp} ]`);
      console.log(`======================================================\n`);
    }

    // Send email with circular logo
    await sendEmail({
      to: cleanEmail,
      subject: 'Work Suite HRMS — Verify Your Email Address (Security OTP)',
      html: buildProfessionalEmailHtml({
        badgeText: '🔐 EMAIL VERIFICATION',
        badgeColor: '#1d4ed8',
        title: 'Verify Your Email Address',
        bodyHtml: `
          <p>Hello,</p>
          <p>Thank you for registering on the <strong>Work Suite HRMS Platform</strong>. To verify your corporate email address and proceed to workspace authorization, please use the following 6-digit verification code:</p>
          <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: bold;">One-Time Security Passcode</p>
            <p style="margin: 8px 0; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #0f172a; font-family: monospace;">${otp}</p>
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">Valid for 15 minutes · Do not share this code</p>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">After email verification, your account registration will be submitted to the HR & Administration team for authorization.</p>
        `,
        footerNote: 'Work Suite Identity & Access Management Division',
      }),
      text: `Your Work Suite HRMS verification code is: ${otp}. Valid for 15 minutes.`,
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

    // Create User with is_approved = FALSE, approval_status = 'PENDING'
    const userRes = await query(
      `INSERT INTO users (employee_id, email, password_hash, role, is_verified, is_approved, approval_status, must_change_password)
       VALUES ($1, $2, $3, $4, TRUE, FALSE, 'PENDING', FALSE)
       RETURNING id, employee_id, email, role, is_verified, is_approved, approval_status, must_change_password, created_at, updated_at`,
      [empCode, cleanEmail, passwordHash, role]
    );
    const user = userRes.rows[0];

    // Create Employee Profile with approval_status = 'PENDING'
    await query(
      `INSERT INTO employees (user_id, employee_code, first_name, last_name, email, status, approval_status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', 'PENDING')
       ON CONFLICT (employee_code) DO UPDATE SET approval_status = 'PENDING'`,
      [user.id, empCode, firstName, lastName, cleanEmail]
    );

    // Clean up OTP store
    registrationOtpStore.delete(cleanEmail);

    // 1. Notify all HR & Admin users (In-App + Email)
    const hrUsers = await query(
      `SELECT id, email FROM users WHERE role IN ('HR', 'ADMIN')`
    );
    for (const hr of hrUsers.rows) {
      await notificationService.create({
        userId: hr.id,
        title: 'New User Registration Pending Approval',
        message: `${firstName} ${lastName} (${cleanEmail}, ID: ${empCode}, Role: ${role}) has verified their email and is waiting for HR/Admin approval.`,
        type: 'SYSTEM',
      }).catch(() => {});

      if (hr.email) {
        await sendEmail({
          to: hr.email,
          subject: `Work Suite HRMS: New User Registration Awaiting Approval (${cleanEmail})`,
          html: buildProfessionalEmailHtml({
            badgeText: '⏳ ACCOUNT APPROVAL REQUIRED',
            badgeColor: '#f59e0b',
            title: 'New User Registration Awaiting Approval',
            bodyHtml: `
              <p>A new team member has registered and verified their email on the Work Suite HRMS platform:</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0; font-size: 13px; color: #475569;">Name: <strong>${firstName} ${lastName}</strong></p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Email: <strong>${cleanEmail}</strong></p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Employee ID: <strong>${empCode}</strong></p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Requested Role: <strong>${role}</strong></p>
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0;">Please log into the HR Dashboard to approve or reject this new account.</p>
            `,
            footerNote: 'Work Suite Identity & Access Management Division',
          }),
          text: `New user registration awaiting approval: ${firstName} ${lastName} (${cleanEmail}, Role: ${role}, ID: ${empCode}).`,
        }).catch(() => {});
      }
    }

    // 2. Send email to the newly registered employee
    await sendEmail({
      to: cleanEmail,
      subject: 'Work Suite HRMS: Email Verified — Account Pending HR Approval',
      html: buildProfessionalEmailHtml({
        badgeText: '⏳ PENDING HR APPROVAL',
        badgeColor: '#6366f1',
        title: 'Email Verified Successfully',
        bodyHtml: `
          <p>Hello <strong>${firstName}</strong>,</p>
          <p>Your work email address (<strong>${cleanEmail}</strong>) has been successfully verified!</p>
          <p>As part of company security protocol, all new user registrations require review and authorization by an HR Officer or System Administrator before login access is activated.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 14px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; color: #475569;">Account Status: <strong style="color: #6366f1;">Pending HR/Admin Approval</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">You will receive an automated email notification the moment your account is activated.</p>
          </div>
        `,
        footerNote: 'Work Suite Enterprise HRMS Platform',
      }),
      text: `Hello ${firstName}, your email has been verified! Your account is now pending HR/Admin approval. You will receive an email once approved.`,
    }).catch(() => {});

    return {
      success: true,
      message: 'Email verified successfully! Your account is now pending HR/Admin approval. You will receive an email notification once approved.',
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

    // Account Approval Check
    if (user.is_approved === false || user.approval_status === 'PENDING') {
      throw new AppError('Your account is currently pending HR/Admin approval. You will receive an email once your access is approved.', 403);
    }

    if (user.approval_status === 'REJECTED') {
      throw new AppError('Your account registration request was declined by the administrator. Please contact HR.', 403);
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

    // Send email via Brevo HTTPS API with Work Suite Logo
    await sendEmail({
      to: cleanEmail,
      subject: 'Work Suite HRMS — Password Reset Verification Code',
      html: buildProfessionalEmailHtml({
        title: 'Password Reset Verification',
        badgeText: 'SECURITY ACTION',
        badgeColor: '#f59e0b',
        bodyHtml: `
          <p>We received a request to reset your password for your <strong>Work Suite HRMS</strong> account. Use the 6-digit verification code below to authorize the change:</p>
          <div style="background-color: #09090b; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 16px 28px; border-radius: 14px; text-align: center; margin: 20px 0; font-family: monospace;">
            ${otp}
          </div>
          <p style="color: #ef4444; font-size: 12px; font-weight: 600; text-align: center; margin: 0;">
            ⏳ This code is valid for 15 minutes only.
          </p>
        `,
        footerNote: 'If you did not request this password reset, please ignore this email or notify your HR administrator immediately.',
      }),
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
