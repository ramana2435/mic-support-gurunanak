/**
 * Output Sanitization Middleware
 * MODULE 14: Sanitize error responses and prevent information leakage
 * 
 * Prevents:
 * - Stack trace exposure
 * - Database error details
 * - Internal paths/structure
 * - API key leakage
 */

import { Request, Response, NextFunction } from 'express';
import { isProduction } from '../config';
import logger from '../utils/logger';

/**
 * Sanitize error for client response
 */
export function sanitizeError(error: any): {
  message: string;
  statusCode: number;
  code?: string;
} {
  // Default error
  let message = 'An error occurred';
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';

  // Known error types with safe messages
  if (error.name === 'ValidationError') {
    message = error.message || 'Validation failed';
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'UnauthorizedError') {
    message = error.message || 'Authentication required';
    statusCode = 401;
    code = 'UNAUTHORIZED';
  } else if (error.name === 'ForbiddenError') {
    message = error.message || 'Access denied';
    statusCode = 403;
    code = 'FORBIDDEN';
  } else if (error.name === 'NotFoundError') {
    message = error.message || 'Resource not found';
    statusCode = 404;
    code = 'NOT_FOUND';
  } else if (error.name === 'ConflictError') {
    message = error.message || 'Resource conflict';
    statusCode = 409;
    code = 'CONFLICT';
  } else if (error.statusCode) {
    // Custom error with status code
    statusCode = error.statusCode;
    message = error.message || message;
    code = error.code || code;
  }

  // In production, use generic messages for 500 errors
  if (isProduction && statusCode === 500) {
    message = 'An internal error occurred. Please try again later.';
  }

  return {
    message: sanitizeMessage(message),
    statusCode,
    code,
  };
}

/**
 * Sanitize error message
 * Remove sensitive information
 */
function sanitizeMessage(message: string): string {
  if (typeof message !== 'string') {
    return 'An error occurred';
  }

  // Remove file paths
  message = message.replace(/\/[^\s]+\.(ts|js|json)/g, '[file]');

  // Remove database connection strings
  message = message.replace(/postgresql:\/\/[^\s]+/g, '[database]');
  message = message.replace(/mongodb:\/\/[^\s]+/g, '[database]');

  // Remove API keys (common patterns)
  message = message.replace(/[a-z0-9]{32,}/gi, '[redacted]');

  // Remove JWT tokens
  message = message.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[token]');

  // Remove email addresses (unless it's in a user-facing message)
  if (!message.includes('email')) {
    message = message.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[email]');
  }

  // Remove internal error codes
  message = message.replace(/\[Error: [^\]]+\]/g, '');

  return message.trim();
}

/**
 * Redact sensitive fields from objects
 */
export function redactSensitiveFields(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sensitiveKeys = [
    'password',
    'passwordHash',
    'password_hash',
    'secret',
    'apiKey',
    'api_key',
    'token',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'privateKey',
    'private_key',
    'credentials',
  ];

  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const [key, value] of Object.entries(redacted)) {
    // Check if key should be redacted
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    }
    // Recursively redact nested objects
    else if (value && typeof value === 'object') {
      redacted[key] = redactSensitiveFields(value);
    }
  }

  return redacted;
}

/**
 * Global error handler
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log full error server-side (with sensitive data redacted)
  logger.error('Request error', {
    error: {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.user?.userId,
    },
  });

  // Sanitize error for client
  const sanitized = sanitizeError(error);

  // Send sanitized error to client
  res.status(sanitized.statusCode).json({
    error: {
      message: sanitized.message,
      code: sanitized.code,
      // Only include stack trace in development
      ...(isProduction ? {} : { stack: error.stack }),
    },
  });
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  });
}

/**
 * Sanitize response body
 * Remove sensitive fields before sending
 */
export function sanitizeResponse(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;

  res.json = function (body: any) {
    const sanitized = redactSensitiveFields(body);
    return originalJson.call(this, sanitized);
  };

  next();
}
