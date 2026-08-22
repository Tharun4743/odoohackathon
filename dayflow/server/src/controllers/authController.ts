import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { employee_id, email, password, role = 'EMPLOYEE' } = req.body;

      if (!employee_id || !email || !password) {
        throw new AppError('Employee ID, email and password are required.', 400);
      }
      if (password.length < 8) {
        throw new AppError('Password must be at least 8 characters long.', 400);
      }
      if (!['EMPLOYEE', 'HR', 'ADMIN'].includes(role)) {
        throw new AppError('Invalid role specified.', 400);
      }

      const user = await authService.register({ employee_id, email, password, role });

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new AppError('Email and password are required.', 400);
      }

      const { user, employee } = await authService.login(email, password);

      const token = jwt.sign(
        {
          userId: user.id,
          employeeId: employee?.id || null,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, JWT_COOKIE_OPTIONS);

      res.json({
        success: true,
        message: 'Login successful.',
        data: { user, employee, token },
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully.' });
  },

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getUserById(req.user!.userId);
      if (!user) throw new AppError('User not found.', 404);
      res.json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw new AppError('Current and new passwords are required.', 400);
      }
      if (newPassword.length < 8) {
        throw new AppError('New password must be at least 8 characters.', 400);
      }
      await authService.changePassword(req.user!.userId, currentPassword, newPassword);
      res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
      next(err);
    }
  },
};
