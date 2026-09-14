import { ErrorCode, ApiError } from '@live-translation/shared';

export class AppError extends Error implements ApiError {
  public code: ErrorCode;
  public statusCode: number;
  public details?: any;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(ErrorCode.FORBIDDEN, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(ErrorCode.NOT_FOUND, message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }
}

export class SessionFullError extends AppError {
  constructor(message: string = 'Session is full') {
    super(ErrorCode.SESSION_FULL, message, 403);
  }
}

export class SessionNotActiveError extends AppError {
  constructor(message: string = 'Session is not active') {
    super(ErrorCode.SESSION_NOT_ACTIVE, message, 400);
  }
}

export class InvalidSessionCodeError extends AppError {
  constructor(message: string = 'Invalid session code') {
    super(ErrorCode.INVALID_SESSION_CODE, message, 404);
  }
}
