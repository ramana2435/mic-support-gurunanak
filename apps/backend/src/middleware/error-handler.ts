import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ApiResponse, ErrorCode } from '@live-translation/shared';
import logger from '../utils/logger';
import { isDevelopment } from '../config';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error handler caught error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: err.message,
      data: {
        code: err.code,
        ...(err.details && { details: err.details }),
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  const response: ApiResponse = {
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    data: {
      code: ErrorCode.INTERNAL_ERROR,
      ...(isDevelopment && { stack: err.stack }),
    },
  };

  res.status(500).json(response);
};
