/**
 * Session Authorization Middleware
 * MODULE 14: Verify session ownership and access control
 * 
 * Prevents:
 * - Unauthorized access to sessions
 * - Cross-session data access
 * - Session hijacking
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../database';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Verify organizer owns the session
 */
export async function verifySessionOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId;
    const userId = req.user?.userId;

    if (!sessionId) {
      return next(new ValidationError('Session ID is required'));
    }

    if (!userId) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Get session and verify ownership
    const result = await query(
      'SELECT organizer_id, status FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      logger.warn('Session not found', { sessionId, userId });
      return next(new NotFoundError('Session not found'));
    }

    const session = result.rows[0];

    if (session.organizer_id !== userId) {
      logger.warn('Unauthorized session access attempt', {
        sessionId,
        userId,
        ownerId: session.organizer_id,
      });
      return next(new ForbiddenError('You do not have permission to access this session'));
    }

    // Add session info to request
    req.session = {
      id: sessionId,
      organizerId: session.organizer_id,
      status: session.status,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Verify student belongs to session
 */
export async function verifyStudentInSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId;
    const studentId = req.params.studentId || req.body.studentId;

    if (!sessionId || !studentId) {
      return next(new ValidationError('Session ID and Student ID are required'));
    }

    // Verify student is part of this session
    const result = await query(
      'SELECT id FROM students WHERE id = $1 AND session_id = $2',
      [studentId, sessionId]
    );

    if (result.rows.length === 0) {
      logger.warn('Student not in session', { sessionId, studentId });
      return next(new ForbiddenError('Student is not part of this session'));
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Verify session is active
 */
export async function verifySessionActive(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId;

    if (!sessionId) {
      return next(new ValidationError('Session ID is required'));
    }

    const result = await query(
      'SELECT status, expires_at FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return next(new NotFoundError('Session not found'));
    }

    const session = result.rows[0];

    // Check if expired
    if (session.expires_at && new Date() > new Date(session.expires_at)) {
      logger.warn('Attempted to access expired session', { sessionId });
      return next(new ForbiddenError('Session has expired'));
    }

    // Check status
    if (session.status !== 'ACTIVE' && session.status !== 'CREATED') {
      logger.warn('Attempted to access inactive session', {
        sessionId,
        status: session.status,
      });
      return next(new ForbiddenError(`Session is ${session.status.toLowerCase()}`));
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Verify session by code (for student joins)
 */
export async function verifySessionByCode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionCode = req.body.sessionCode || req.params.sessionCode;

    if (!sessionCode) {
      return next(new ValidationError('Session code is required'));
    }

    const result = await query(
      'SELECT id, status, expires_at, max_students FROM sessions WHERE code = $1',
      [sessionCode]
    );

    if (result.rows.length === 0) {
      logger.warn('Invalid session code', { sessionCode });
      return next(new NotFoundError('Invalid session code'));
    }

    const session = result.rows[0];

    // Check if expired
    if (session.expires_at && new Date() > new Date(session.expires_at)) {
      return next(new ForbiddenError('Session has expired'));
    }

    // Check status
    if (session.status !== 'ACTIVE' && session.status !== 'CREATED') {
      return next(new ForbiddenError('Session is not active'));
    }

    // Check if full
    const studentCountResult = await query(
      'SELECT COUNT(*) as count FROM students WHERE session_id = $1 AND disconnected_at IS NULL',
      [session.id]
    );

    const studentCount = parseInt(studentCountResult.rows[0].count, 10);

    if (studentCount >= session.max_students) {
      return next(new ForbiddenError('Session is full'));
    }

    // Add session info to request
    req.session = {
      id: session.id,
      code: sessionCode,
      status: session.status,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Rate limit session joins per IP
 * Prevents session enumeration attacks
 */
const joinAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitSessionJoins(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxAttempts = 10;

  let attempts = joinAttempts.get(ip);

  if (!attempts || now > attempts.resetAt) {
    attempts = {
      count: 1,
      resetAt: now + windowMs,
    };
    joinAttempts.set(ip, attempts);
    return next();
  }

  if (attempts.count >= maxAttempts) {
    logger.warn('Session join rate limit exceeded', { ip });
    return next(
      new ValidationError('Too many join attempts. Please try again later.')
    );
  }

  attempts.count++;
  next();
}

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempts] of joinAttempts.entries()) {
    if (now > attempts.resetAt) {
      joinAttempts.delete(ip);
    }
  }
}, 60000);
