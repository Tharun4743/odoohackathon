import { query, getClient } from '../config/database';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import cloudinary from '../config/cloudinary';
import { sendEmail, buildProfessionalEmailHtml } from '../utils/mailer';
import { notificationService } from './notificationService';

export const employeeService = {
  async getAll(filters: {
    search?: string;
    departmentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, departmentId, status, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(e.first_name ILIKE $${paramIdx} OR e.last_name ILIKE $${paramIdx} OR e.employee_code ILIKE $${paramIdx} OR e.email ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (departmentId) {
      conditions.push(`e.department_id = $${paramIdx}`);
      params.push(departmentId);
      paramIdx++;
    }
    if (status) {
      conditions.push(`e.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM employees e ${where}`,
      params
    );

    const result = await query(
      `SELECT e.*, d.name as department_name, u.email as user_email, u.role
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN users u ON u.id = e.user_id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return {
      employees: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async getById(id: string) {
    const result = await query(
      `SELECT e.*, d.name as department_name, u.email as user_email, u.role,
              ss.basic_salary, ss.allowances, ss.deductions, ss.effective_from
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN salary_structures ss ON ss.employee_id = e.id
         AND ss.effective_from = (SELECT MAX(effective_from) FROM salary_structures WHERE employee_id = e.id)
       WHERE e.id = $1`,
      [id]
    );
    if (result.rows.length === 0) throw new AppError('Employee not found.', 404);
    return result.rows[0];
  },

  async getByUserId(userId: string) {
    const result = await query(
      `SELECT e.*, d.name as department_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) throw new AppError('Employee profile not found.', 404);
    return result.rows[0];
  },

  async createEmployee(data: {
    first_name: string;
    last_name: string;
    email: string;
    employee_code?: string;
    phone?: string;
    address?: string;
    department_id?: string;
    designation?: string;
    joining_date?: string;
    role?: 'EMPLOYEE' | 'HR' | 'ADMIN';
    basic_salary?: number;
    allowances?: number;
    deductions?: number;
    initial_password?: string;
  }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const email = data.email.toLowerCase().trim();

      // Check existing email
      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        throw new AppError('A user with this email already exists.', 409);
      }

      // Generate employee code if not provided
      let code = data.employee_code?.trim();
      if (!code) {
        const countRes = await client.query('SELECT COUNT(*) FROM employees');
        const nextNum = parseInt(countRes.rows[0].count) + 1;
        code = `EMP-${String(nextNum).padStart(3, '0')}`;
      }

      // Generate secure initial password
      const initialPassword = data.initial_password?.trim() || `WorkSuite@${Math.floor(1000 + Math.random() * 9000)}`;
      const passwordHash = await bcrypt.hash(initialPassword, 12);
      const role = data.role || 'EMPLOYEE';

      // 1. Create User
      const userRes = await client.query(
        `INSERT INTO users (employee_id, email, password_hash, role, is_verified, must_change_password)
         VALUES ($1, $2, $3, $4, TRUE, TRUE)
         RETURNING id, employee_id, email, role, must_change_password`,
        [code, email, passwordHash, role]
      );
      const user = userRes.rows[0];

      // 2. Create Employee
      const empRes = await client.query(
        `INSERT INTO employees (
          user_id, employee_code, first_name, last_name, email,
          phone, address, department_id, designation, joining_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
        RETURNING *`,
        [
          user.id,
          code,
          data.first_name.trim(),
          data.last_name.trim(),
          email,
          data.phone || null,
          data.address || null,
          data.department_id || null,
          data.designation || null,
          data.joining_date || new Date().toISOString().split('T')[0],
        ]
      );
      const employee = empRes.rows[0];

      // 3. Create Salary Structure if basic salary provided
      if (data.basic_salary && data.basic_salary > 0) {
        await client.query(
          `INSERT INTO salary_structures (employee_id, basic_salary, allowances, deductions, effective_from)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            employee.id,
            data.basic_salary,
            data.allowances || 0,
            data.deductions || 0,
            data.joining_date || new Date().toISOString().split('T')[0],
          ]
        );
      }

      // 4. Welcome notification
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'SYSTEM')`,
        [
          user.id,
          'Welcome to Work Suite HRMS!',
          'Your account has been created by HR. Please change your password on first login.',
        ]
      );

      await client.query('COMMIT');

      return {
        employee,
        credentials: {
          employee_code: code,
          email,
          initialPassword,
          role,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: string, data: Partial<{
    first_name: string;
    last_name: string;
    phone: string;
    address: string;
    profile_image: string;
    department_id: string;
    designation: string;
    joining_date: string;
    status: string;
  }>) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) throw new AppError('No fields to update.', 400);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) throw new AppError('Employee not found.', 404);
    return result.rows[0];
  },

  async uploadDocument(employeeId: string, file: Express.Multer.File, documentName: string, documentType: string) {
    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `worksuite/documents/${employeeId}`, resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string; public_id: string });
        }
      );
      stream.end(file.buffer);
    });

    const result = await query(
      `INSERT INTO documents (employee_id, document_name, document_type, cloudinary_url, public_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [employeeId, documentName, documentType, uploadResult.secure_url, uploadResult.public_id]
    );
    return result.rows[0];
  },

  async getDocuments(employeeId: string) {
    const result = await query(
      'SELECT * FROM documents WHERE employee_id = $1 ORDER BY uploaded_at DESC',
      [employeeId]
    );
    return result.rows;
  },

  async deleteDocument(docId: string, employeeId: string) {
    const doc = await query(
      'SELECT * FROM documents WHERE id = $1 AND employee_id = $2',
      [docId, employeeId]
    );
    if (doc.rows.length === 0) throw new AppError('Document not found.', 404);

    try {
      await cloudinary.uploader.destroy(doc.rows[0].public_id, { resource_type: 'raw' });
    } catch { /* ignore if already deleted on cloudinary */ }
    await query('DELETE FROM documents WHERE id = $1', [docId]);
  },

  async uploadProfileImage(employeeId: string, file: Express.Multer.File): Promise<string> {
    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `worksuite/profiles`, resource_type: 'image', transformation: [{ width: 300, height: 300, crop: 'fill' }] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string; public_id: string });
        }
      );
      stream.end(file.buffer);
    });

    await query(
      'UPDATE employees SET profile_image = $1, updated_at = NOW() WHERE id = $2',
      [uploadResult.secure_url, employeeId]
    );

    return uploadResult.secure_url;
  },

  async getPendingApprovals() {
    const result = await query(
      `SELECT e.*, u.email as user_email, u.role as user_role, u.is_verified, u.created_at as user_created_at
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE u.is_approved = FALSE OR u.approval_status = 'PENDING'
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  },

  async approveRegistration(employeeId: string) {
    const empRes = await query(
      `SELECT e.*, u.id as user_id, u.email as user_email, u.role as user_role
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE e.id = $1`,
      [employeeId]
    );
    if (empRes.rows.length === 0) throw new AppError('Employee record not found.', 404);
    const emp = empRes.rows[0];

    // Update user and employee records to APPROVED
    await query(
      `UPDATE users SET is_approved = TRUE, approval_status = 'APPROVED', updated_at = NOW() WHERE id = $1`,
      [emp.user_id]
    );
    await query(
      `UPDATE employees SET approval_status = 'APPROVED', status = 'ACTIVE', updated_at = NOW() WHERE id = $1`,
      [employeeId]
    );

    // 1. In-App Notification to User
    await notificationService.create({
      userId: emp.user_id,
      title: 'Workspace Account Approved! 🎉',
      message: 'Your Work Suite HRMS account has been approved by HR. You can now log in to access your dashboard.',
      type: 'SYSTEM',
    }).catch(() => {});

    // 2. Transactional Email with Official Logo to User
    const recipientEmail = emp.email || emp.user_email;
    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: 'Work Suite HRMS: Account Approved! 🎉 Welcome to your Workspace',
        html: buildProfessionalEmailHtml({
          badgeText: '✅ ACCOUNT AUTHORIZED',
          badgeColor: '#166534',
          title: 'Account Approved by HR',
          bodyHtml: `
            <p>Hello <strong>${emp.first_name || 'Member'}</strong>,</p>
            <p>Great news! Your account registration on the <strong>Work Suite HRMS Platform</strong> has been reviewed and authorized by HR Administration.</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; font-size: 13px; color: #166534;">Employee Code: <strong>${emp.employee_code}</strong></p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;">Role: <strong>${emp.user_role}</strong></p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;">Status: <strong>Active & Authorized</strong></p>
            </div>
            <p style="font-size: 13px; color: #475569;">You can now sign in with your email and password to access your profile, biometric attendance clock, time-off requests, and monthly payslips.</p>
          `,
          footerNote: 'Work Suite Enterprise Operations Team',
        }),
        text: `Your Work Suite HRMS account has been approved by HR! You can now log in with your email ${recipientEmail}.`,
      }).catch(() => {});
    }

    return {
      success: true,
      message: `Account for ${emp.first_name} ${emp.last_name} (${emp.employee_code}) approved successfully!`,
      employee: emp,
    };
  },

  async rejectRegistration(employeeId: string, reason?: string) {
    const empRes = await query(
      `SELECT e.*, u.id as user_id, u.email as user_email
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE e.id = $1`,
      [employeeId]
    );
    if (empRes.rows.length === 0) throw new AppError('Employee record not found.', 404);
    const emp = empRes.rows[0];

    // Mark as REJECTED
    await query(
      `UPDATE users SET is_approved = FALSE, approval_status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
      [emp.user_id]
    );
    await query(
      `UPDATE employees SET approval_status = 'REJECTED', status = 'INACTIVE', updated_at = NOW() WHERE id = $1`,
      [employeeId]
    );

    const recipientEmail = emp.email || emp.user_email;
    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: 'Work Suite HRMS: Registration Status Update',
        html: buildProfessionalEmailHtml({
          badgeText: '❌ REGISTRATION DECLINED',
          badgeColor: '#9f1239',
          title: 'Account Registration Not Approved',
          bodyHtml: `
            <p>Hello <strong>${emp.first_name || 'User'}</strong>,</p>
            <p>Your registration request on the Work Suite HRMS platform has been reviewed and declined by the administration.</p>
            ${reason ? `<div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 14px; border-radius: 8px; margin: 16px 0;"><p style="margin: 0; font-size: 13px; color: #9f1239;">Reason: <strong>${reason}</strong></p></div>` : ''}
            <p style="font-size: 12px; color: #64748b;">If you believe this was in error, please contact your company's HR department.</p>
          `,
          footerNote: 'Work Suite Enterprise HRMS Security',
        }),
        text: `Your registration request was not approved. ${reason || ''}`,
      }).catch(() => {});
    }

    return {
      success: true,
      message: `Registration for ${emp.first_name} ${emp.last_name} was declined.`,
    };
  },
};
