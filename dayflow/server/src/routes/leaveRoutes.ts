/** Time Off / Leave Management Module - Person 3 */
import { Router } from 'express';
import { leaveController } from '../controllers/leaveController';
import { requireAuth, requireEmployee, requireHR } from '../middleware/auth';

const router = Router();

router.post('/apply', requireAuth, requireEmployee, leaveController.applyLeave);
router.get('/my', requireAuth, requireEmployee, leaveController.getMyLeaves);
router.get('/all', requireAuth, requireHR, leaveController.getAllLeaves);
router.put('/:id/approve', requireAuth, requireHR, leaveController.approveLeave);
router.put('/:id/reject', requireAuth, requireHR, leaveController.rejectLeave);

export default router;
