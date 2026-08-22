import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notificationService';
import { sendEmail, buildProfessionalEmailHtml } from '../utils/mailer';

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  priority?: 'URGENT' | 'NORMAL' | 'INFO';
  target_department_id?: string | null;
  created_by: string;
}

export const announcementService = {
  async create(data: CreateAnnouncementInput) {
    const { title, content, priority = 'NORMAL', target_department_id, created_by } = data;

    if (!title || !content) {
      throw new AppError('Title and content are required for announcements.', 400);
    }

    const result = await query(
      `INSERT INTO announcements (title, content, priority, target_department_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, content, priority, target_department_id || null, created_by]
    );

    const announcement = result.rows[0];

    // Fetch recipient users
    let usersQuery = `
      SELECT u.id as user_id, u.email, e.first_name
      FROM users u
      LEFT JOIN employees e ON e.user_id = u.id
      WHERE u.is_verified = TRUE
    `;
    const params: unknown[] = [];

    if (target_department_id) {
      usersQuery += ` AND (e.department_id = $1 OR u.role IN ('ADMIN', 'HR'))`;
      params.push(target_department_id);
    }

    const recipients = await query(usersQuery, params);

    // 1. Dispatch In-App Notifications & 2. Dispatch Brevo Transactional Emails
    const priorityColor = priority === 'URGENT' ? '#ef4444' : priority === 'INFO' ? '#3b82f6' : '#10b981';

    for (const rec of recipients.rows) {
      // In-app alert
      notificationService.create({
        userId: rec.user_id,
        title: `📢 Announcement: ${title}`,
        message: content.length > 120 ? content.slice(0, 117) + '...' : content,
        type: 'SYSTEM',
      }).catch(() => {});

      // Email alert with circular logo and executive styling
      if (rec.email) {
        sendEmail({
          to: rec.email,
          subject: `📢 [${priority}] Company Announcement: ${title}`,
          html: buildProfessionalEmailHtml({
            title,
            badgeText: `${priority} PRIORITY BROADCAST`,
            badgeColor: priorityColor,
            recipientName: rec.first_name || 'Team Member',
            bodyHtml: `
              <div style="background-color: #f8fafc; border-left: 4px solid ${priorityColor}; padding: 18px; border-radius: 10px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; margin: 16px 0;">
${content}
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0;">
                This is an official announcement broadcasted to organization members by the HR & Administration Desk.
              </p>
            `,
            footerNote: 'Work Suite Enterprise Communications · Official Corporate Broadcast',
          }),
          text: `[${priority}] Company Announcement: ${title}\n\n${content}\n\nWork Suite HRMS`,
        }).catch(err => console.error('Failed to send announcement email to', rec.email, err));
      }
    }

    return announcement;
  },

  async getAll(filters: { departmentId?: string; limit?: number; page?: number }) {
    const { departmentId, limit = 20, page = 1 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: unknown[] = [];

    if (departmentId) {
      whereClause = 'WHERE a.target_department_id IS NULL OR a.target_department_id = $1';
      params.push(departmentId);
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM announcements a ${whereClause}`,
      params
    );

    const result = await query(
      `SELECT a.*, d.name as department_name, u.email as author_email, e.first_name as author_first_name, e.last_name as author_last_name
       FROM announcements a
       LEFT JOIN departments d ON d.id = a.target_department_id
       LEFT JOIN users u ON u.id = a.created_by
       LEFT JOIN employees e ON e.user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      announcements: result.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
    };
  },

  async delete(id: string) {
    const result = await query(`DELETE FROM announcements WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) throw new AppError('Announcement not found.', 404);
    return result.rows[0];
  },
};
