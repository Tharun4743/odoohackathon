import { Router } from 'express';
import { attendanceController } from '../controllers/attendanceController';
import { requireAuth, requireEmployee, requireHR } from '../middleware/auth';

const router = Router();

router.post('/check-in', requireAuth, requireEmployee, attendanceController.checkIn);
router.post('/break/start', requireAuth, requireEmployee, attendanceController.startBreak);
router.post('/break/end', requireAuth, requireEmployee, attendanceController.endBreak);
router.post('/check-out', requireAuth, requireEmployee, attendanceController.checkOut);
router.get('/today', requireAuth, requireEmployee, attendanceController.getTodayAttendance);
router.get('/month', requireAuth, requireEmployee, attendanceController.getMonthAttendance);
router.get('/live-today', requireAuth, requireHR, attendanceController.getLiveStatusToday);
router.get('/live-status', requireAuth, requireHR, attendanceController.getLiveStatusToday);
router.get('/my', requireAuth, requireEmployee, attendanceController.getMyHistory);
router.get('/weekly', requireAuth, requireEmployee, attendanceController.getWeeklySummary);
router.get('/all', requireAuth, requireHR, attendanceController.getAllAttendance);
router.get('/employee/:id', requireAuth, requireEmployee, attendanceController.getEmployeeAttendance);

export default router;
