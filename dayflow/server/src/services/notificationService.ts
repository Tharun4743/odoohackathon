import { query } from '../config/database';
import { NotificationType } from '../types';

export const notificationService = {
  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
  }) {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.userId, data.title, data.message, data.type]
    );
    return result.rows[0];
  },

  async getByUserId(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const countResult = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [userId]
    );
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const unreadCount = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
      unreadCount: parseInt(unreadCount.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async markAsRead(notificationId: string, userId: string) {
    const result = await query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    if (result.rows.length === 0) {
      throw new Error('Notification not found.');
    }
    return result.rows[0];
  },

  async markAllAsRead(userId: string) {
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return { success: true };
  },

  async getUnreadCount(userId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  },
};
