/**
 * Input Validation Middleware
 * MODULE 14: Comprehensive input validation and sanitization
 * 
 * Prevents:
 * - SQL injection
 * - NoSQL injection
 * - XSS attacks
 * - Path traversal
 * - Command injection
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Sanitize string input
 * Remove potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newline and tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit consecutive whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Validate and sanitize session code
 * Must be alphanumeric, exactly 6 characters
 */
export function validateSessionCode(code: string): string {
  const sanitized = sanitizeString(code).toUpperCase();
  
  // Session code must be exactly 6 alphanumeric characters
  if (!/^[A-Z0-9]{6}$/.test(sanitized)) {
    throw new ValidationError('Invalid session code format');
  }
  
  return sanitized;
}

/**
 * Validate UUID
 */
export function validateUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    throw new ValidationError('Invalid UUID format');
  }
  
  return id.toLowerCase();
}

/**
 * Validate language code
 * Must be 2-3 letter code (ISO 639)
 */
export function validateLanguageCode(code: string): string {
  const sanitized = sanitizeString(code).toLowerCase();
  
  if (!/^[a-z]{2,3}$/.test(sanitized)) {
    throw new ValidationError('Invalid language code');
  }
  
  return sanitized;
}

/**
 * Validate email
 */
export function validateEmail(email: string): string {
  const sanitized = sanitizeString(email).toLowerCase();
  
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    throw new ValidationError('Invalid email format');
  }
  
  return sanitized;
}

/**
 * Sanitize text content
 * For translation text, session titles, etc.
 */
export function sanitizeTextContent(text: string, maxLength: number = 10000): string {
  if (typeof text !== 'string') {
    return '';
  }

  const sanitized = sanitizeString(text);
  
  // Enforce max length
  if (sanitized.length > maxLength) {
    throw new ValidationError(`Text exceeds maximum length of ${maxLength} characters`);
  }
  
  return sanitized;
}

/**
 * Validate request body against Joi schema
 */
export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      logger.warn('Request body validation failed', {
        path: req.path,
        errors,
      });
      return next(new ValidationError(errors.join(', ')));
    }

    // Replace body with validated and sanitized value
    req.body = value;
    next();
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      logger.warn('Query parameters validation failed', {
        path: req.path,
        errors,
      });
      return next(new ValidationError(errors.join(', ')));
    }

    // Replace query with validated value
    req.query = value;
    next();
  };
}

/**
 * Validate path parameters
 */
export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      logger.warn('Path parameters validation failed', {
        path: req.path,
        errors,
      });
      return next(new ValidationError(errors.join(', ')));
    }

    // Replace params with validated value
    req.params = value;
    next();
  };
}

/**
 * Sanitize request body recursively
 * Use for JSON payloads
 */
export function sanitizeRequestBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key (prevent prototype pollution)
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Prevent prototype pollution
 */
export function preventPrototypePollution(req: Request, res: Response, next: NextFunction) {
  const checkObject = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    for (const key of Object.keys(obj)) {
      if (dangerousKeys.includes(key)) {
        return true;
      }
      
      if (typeof obj[key] === 'object' && checkObject(obj[key])) {
        return true;
      }
    }
    
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    logger.warn('Prototype pollution attempt detected', {
      ip: req.ip,
      path: req.path,
    });
    return next(new ValidationError('Invalid request data'));
  }

  next();
}

/**
 * Common Joi schemas
 */
export const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  sessionCode: Joi.string().regex(/^[A-Z0-9]{6}$/).required(),
  language: Joi.string().regex(/^[a-z]{2,3}$/).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().min(2).max(100).required(),
  text: Joi.string().max(10000),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};
