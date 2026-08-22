import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // PostgreSQL unique constraint violation
  if ((err as { code?: string }).code === '23505') {
    res.status(409).json({
      success: false,
      message: 'Record already exists. Duplicate entry detected.',
    });
    return;
  }

  // PostgreSQL foreign key violation
  if ((err as { code?: string }).code === '23503') {
    res.status(400).json({
      success: false,
      message: 'Related record not found.',
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: 'An internal server error occurred. Please try again later.',
  });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'The requested resource was not found.',
  });
};
