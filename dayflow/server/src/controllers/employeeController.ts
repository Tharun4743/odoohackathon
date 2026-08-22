import { Response, NextFunction } from 'express';
import { employeeService } from '../services/employeeService';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { query } from '../config/database';
import { qs, qsNum } from '../utils/queryHelpers';

export const employeeController = {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { search, departmentId, status, page, limit } = req.query;
      const result = await employeeService.getAll({
        search: qs(search),
        departmentId: qs(departmentId),
        status: qs(status),
        page: qsNum(page),
        limit: qsNum(limit),
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getById(req.params.id as string);
      res.json({ success: true, data: { employee } });
    } catch (err) {
      next(err);
    }
  },

  async getMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getByUserId(req.user!.userId);
      res.json({ success: true, data: { employee } });
    } catch (err) {
      next(err);
    }
  },

  async updateMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { phone, address } = req.body;
      const employee = await employeeService.getByUserId(req.user!.userId);
      const updated = await employeeService.update(employee.id as string, { phone, address });
      res.json({ success: true, message: 'Profile updated.', data: { employee: updated } });
    } catch (err) {
      next(err);
    }
  },

  async updateEmployee(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const updated = await employeeService.update(req.params.id as string, req.body);
      res.json({ success: true, message: 'Employee updated.', data: { employee: updated } });
    } catch (err) {
      next(err);
    }
  },

  async createEmployee(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        first_name, last_name, email, employee_code, phone,
        address, department_id, designation, joining_date,
        role, basic_salary, allowances, deductions, initial_password
      } = req.body;

      if (!first_name || !last_name || !email) {
        throw new AppError('First name, last name, and email are required.', 400);
      }

      const result = await employeeService.createEmployee({
        first_name,
        last_name,
        email,
        employee_code,
        phone,
        address,
        department_id,
        designation,
        joining_date,
        role,
        basic_salary: basic_salary ? parseFloat(basic_salary) : undefined,
        allowances: allowances ? parseFloat(allowances) : undefined,
        deductions: deductions ? parseFloat(deductions) : undefined,
        initial_password,
      });

      res.status(201).json({
        success: true,
        message: 'Employee account created successfully with initial credentials.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async uploadProfileImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No file uploaded.', 400);
      const employee = req.user!.role === 'EMPLOYEE'
        ? await employeeService.getByUserId(req.user!.userId)
        : await employeeService.getById(req.params.id as string);

      const url = await employeeService.uploadProfileImage(employee.id as string, req.file);
      res.json({ success: true, message: 'Profile image updated.', data: { profile_image: url } });
    } catch (err) {
      next(err);
    }
  },

  async getDocuments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employeeId = req.params.id as string;
      if (req.user!.role === 'EMPLOYEE') {
        const myEmployee = await employeeService.getByUserId(req.user!.userId);
        if (myEmployee.id !== employeeId) throw new AppError('Access denied.', 403);
      }
      const docs = await employeeService.getDocuments(employeeId);
      res.json({ success: true, data: { documents: docs } });
    } catch (err) {
      next(err);
    }
  },

  async uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No file uploaded.', 400);
      const { documentName, documentType } = req.body;
      if (!documentName || !documentType) throw new AppError('Document name and type are required.', 400);

      const employeeId = req.params.id as string;
      const doc = await employeeService.uploadDocument(employeeId, req.file, documentName, documentType);
      res.status(201).json({ success: true, message: 'Document uploaded.', data: { document: doc } });
    } catch (err) {
      next(err);
    }
  },

  async deleteDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await employeeService.deleteDocument(req.params.docId as string, req.params.id as string);
      res.json({ success: true, message: 'Document deleted.' });
    } catch (err) {
      next(err);
    }
  },

  async getDepartments(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await query('SELECT * FROM departments ORDER BY name');
      res.json({ success: true, data: { departments: result.rows } });
    } catch (err) {
      next(err);
    }
  },

  async createDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      if (!name) throw new AppError('Department name is required.', 400);
      const result = await query(
        'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
        [name, description]
      );
      res.status(201).json({ success: true, data: { department: result.rows[0] } });
    } catch (err) {
      next(err);
    }
  },

  async getPendingApprovals(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pending = await employeeService.getPendingApprovals();
      res.json({ success: true, data: { pending } });
    } catch (err) {
      next(err);
    }
  },

  async approveRegistration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await employeeService.approveRegistration(req.params.id as string);
      res.json({ success: true, message: result.message, data: result });
    } catch (err) {
      next(err);
    }
  },

  async rejectRegistration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const result = await employeeService.rejectRegistration(req.params.id as string, reason);
      res.json({ success: true, message: result.message });
    } catch (err) {
      next(err);
    }
  },
};
