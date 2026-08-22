import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService';
import { AuthRequest } from '../middleware/auth';
import { qsNum } from '../utils/queryHelpers';

export const notificationController = {
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      const result = await notificationService.getByUserId(
        req.user!.userId,
        qsNum(page),
        qsNum(limit),
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notification = await notificationService.markAsRead(req.params.id as string, req.user!.userId);
      res.json({ success: true, message: 'Notification marked as read.', data: { notification } });
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllAsRead(req.user!.userId);
      res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  },

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.user!.userId);
      res.json({ success: true, data: { count } });
    } catch (err) {
      next(err);
    }
  },
};
