import { Router } from 'express';
import { payrollController } from '../controllers/payrollController';
import { requireAuth, requireEmployee, requireHR } from '../middleware/auth';

const router = Router();

// Employee routes (read-only)
router.get('/my', requireAuth, requireEmployee, payrollController.getMyPayroll);
router.get('/my/salary-structure', requireAuth, requireEmployee, payrollController.getMySalaryStructure);
router.get('/slip/:id', requireAuth, requireEmployee, payrollController.getPayslip);

// HR routes
router.get('/all', requireAuth, requireHR, payrollController.getAllPayroll);
router.post('/salary-structure', requireAuth, requireHR, payrollController.createSalaryStructure);
router.get('/salary-structure/:employeeId', requireAuth, requireHR, payrollController.getSalaryStructureForEmployee);
router.post('/generate', requireAuth, requireHR, payrollController.generatePayroll);

export default router;
