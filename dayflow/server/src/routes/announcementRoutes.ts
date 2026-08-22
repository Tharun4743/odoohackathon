import { Router } from 'express';
import { announcementController } from '../controllers/announcementController';
import { requireAuth, requireHR } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, announcementController.getAll);
router.post('/', requireAuth, requireHR, announcementController.create);
router.delete('/:id', requireAuth, requireHR, announcementController.delete);

export default router;
