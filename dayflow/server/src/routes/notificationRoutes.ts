import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, notificationController.getNotifications);
router.get('/unread-count', requireAuth, notificationController.getUnreadCount);
router.put('/:id/read', requireAuth, notificationController.markAsRead);
router.put('/read-all', requireAuth, notificationController.markAllAsRead);

export default router;
