import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { requireAuth, requireHR } from '../middleware/auth';

const router = Router();

// Dashboard
router.get('/dashboard', requireAuth, requireHR, analyticsController.getDashboard);

// Analytics
router.get('/attendance', requireAuth, requireHR, analyticsController.getAttendanceAnalytics);
router.get('/leave', requireAuth, requireHR, analyticsController.getLeaveAnalytics);
router.get('/payroll', requireAuth, requireHR, analyticsController.getPayrollAnalytics);

// Reports
router.get('/reports/employees', requireAuth, requireHR, analyticsController.getEmployeeReport);
router.get('/reports/attendance', requireAuth, requireHR, analyticsController.getAttendanceReport);
router.get('/reports/leave', requireAuth, requireHR, analyticsController.getLeaveReport);
router.get('/reports/payroll', requireAuth, requireHR, analyticsController.getPayrollReport);

export default router;
