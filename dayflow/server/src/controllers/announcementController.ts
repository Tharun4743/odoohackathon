import { Response, NextFunction } from 'express';
import { announcementService } from '../services/announcementService';
import { AuthRequest } from '../middleware/auth';
import { qs, qsNum } from '../utils/queryHelpers';

export const announcementController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, content, priority, target_department_id } = req.body;
      const announcement = await announcementService.create({
        title,
        content,
        priority,
        target_department_id,
        created_by: req.user!.userId,
      });

      res.status(201).json({
        success: true,
        message: 'Announcement broadcasted and email alerts dispatched to employees.',
        data: { announcement },
      });
    } catch (err) {
      next(err);
    }
  },

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { departmentId, limit, page } = req.query;
      const result = await announcementService.getAll({
        departmentId: qs(departmentId),
        limit: qsNum(limit),
        page: qsNum(page),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await announcementService.delete(id as string);
      res.json({
        success: true,
        message: 'Announcement deleted.',
        data: { announcement: deleted },
      });
    } catch (err) {
      next(err);
    }
  },
};
