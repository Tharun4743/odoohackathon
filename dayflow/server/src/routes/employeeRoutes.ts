import { Router } from 'express';
import multer from 'multer';
import { employeeController } from '../controllers/employeeController';
import { requireAuth, requireHR, requireEmployee } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const isValid = allowedTypes.test(file.mimetype) || allowedTypes.test(file.originalname.toLowerCase());
    cb(null, isValid);
  },
});

// Employee self-service
router.get('/profile/me', requireAuth, requireEmployee, employeeController.getMyProfile);
router.put('/profile/me', requireAuth, requireEmployee, employeeController.updateMyProfile);
router.post('/profile/me/image', requireAuth, requireEmployee, upload.single('image'), employeeController.uploadProfileImage);

// Departments
router.get('/departments', requireAuth, employeeController.getDepartments);
router.post('/departments', requireAuth, requireHR, employeeController.createDepartment);

// HR/Admin registration approval & employee management
router.get('/pending-approvals', requireAuth, requireHR, employeeController.getPendingApprovals);
router.post('/:id/approve-registration', requireAuth, requireHR, employeeController.approveRegistration);
router.post('/:id/reject-registration', requireAuth, requireHR, employeeController.rejectRegistration);
router.get('/', requireAuth, requireHR, employeeController.getAll);
router.post('/', requireAuth, requireHR, employeeController.createEmployee);
router.get('/:id', requireAuth, requireEmployee, employeeController.getById);
router.put('/:id', requireAuth, requireHR, employeeController.updateEmployee);
router.post('/:id/image', requireAuth, requireHR, upload.single('image'), employeeController.uploadProfileImage);

// Documents
router.get('/:id/documents', requireAuth, requireEmployee, employeeController.getDocuments);
router.post('/:id/documents', requireAuth, requireEmployee, upload.single('document'), employeeController.uploadDocument);
router.delete('/:id/documents/:docId', requireAuth, requireEmployee, employeeController.deleteDocument);

export default router;
