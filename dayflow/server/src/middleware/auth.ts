import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { JWTPayload, UserRole } from '../types';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const requireAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      next(new AppError('Invalid or expired token. Please log in again.', 401));
    }
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required.', 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('You do not have permission to perform this action.', 403));
      return;
    }
    next();
  };
};

export const requireEmployee = requireRole('EMPLOYEE', 'HR', 'ADMIN');
export const requireHR = requireRole('HR', 'ADMIN');
export const requireAdmin = requireRole('ADMIN');
