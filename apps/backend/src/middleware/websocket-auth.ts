/**
 * WebSocket Authentication Middleware
 * MODULE 14: Secure WebSocket connections
 * 
 * Verifies:
 * - Session authorization
 * - Student/organizer identity
 * - Rate limiting per connection
 */

import { Socket } from 'socket.io';
import { query } from '../database';
import logger from '../utils/logger';
import { validateSessionCode, validateUUID } from './input-validation';

/**
 * Verify organizer connection
 */
export async function verifyOrganizerConnection(
  socket: Socket,
  sessionId: string,
  organizerId: string
): Promise<boolean> {
  try {
    validateUUID(sessionId);
    validateUUID(organizerId);

    const result = await query(
      'SELECT organizer_id FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      logger.warn('WebSocket: Session not found', { sessionId, socketId: socket.id });
      return false;
    }

    if (result.rows[0].organizer_id !== organizerId) {
      logger.warn('WebSocket: Unauthorized organizer', {
        sessionId,
        organizerId,
        socketId: socket.id,
      });
      return false;
    }

    return true;
  } catch (error: any) {
    logger.error('WebSocket: Organizer verification failed', {
      error: error.message,
      sessionId,
      socketId: socket.id,
    });
    return false;
  }
}

/**
 * Verify student connection to session
 */
export async function verifyStudentConnection(
  socket: Socket,
  sessionCode: string,
  studentData: { name: string; selectedLanguage: string }
): Promise<{ valid: boolean; sessionId?: string; error?: string }> {
  try {
    // Validate session code format
    const sanitizedCode = validateSessionCode(sessionCode);

    // Get session
    const sessionResult = await query(
      'SELECT id, status, expires_at, max_students FROM sessions WHERE code = $1',
      [sanitizedCode]
    );

    if (sessionResult.rows.length === 0) {
      logger.warn('WebSocket: Invalid session code', {
        sessionCode: sanitizedCode,
        socketId: socket.id,
      });
      return { valid: false, error: 'Invalid session code' };
    }

    const session = sessionResult.rows[0];

    // Check if expired
    if (session.expires_at && new Date() > new Date(session.expires_at)) {
      logger.warn('WebSocket: Session expired', {
        sessionId: session.id,
        socketId: socket.id,
      });
      return { valid: false, error: 'Session has expired' };
    }

    // Check status
    if (session.status !== 'ACTIVE' && session.status !== 'CREATED') {
      logger.warn('WebSocket: Session not active', {
        sessionId: session.id,
        status: session.status,
        socketId: socket.id,
      });
      return { valid: false, error: 'Session is not active' };
    }

    // Check if full
    const studentCountResult = await query(
      'SELECT COUNT(*) as count FROM students WHERE session_id = $1 AND disconnected_at IS NULL',
      [session.id]
    );

    const studentCount = parseInt(studentCountResult.rows[0].count, 10);

    if (studentCount >= session.max_students) {
      logger.warn('WebSocket: Session full', {
        sessionId: session.id,
        socketId: socket.id,
        studentCount,
        maxStudents: session.max_students,
      });
      return { valid: false, error: 'Session is full' };
    }

    return { valid: true, sessionId: session.id };
  } catch (error: any) {
    logger.error('WebSocket: Student verification failed', {
      error: error.message,
      socketId: socket.id,
    });
    return { valid: false, error: 'Verification failed' };
  }
}

/**
 * Rate limit WebSocket messages per connection
 */
const messageRateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkWebSocketRateLimit(
  socketId: string,
  maxMessages: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  let limit = messageRateLimits.get(socketId);

  if (!limit || now > limit.resetAt) {
    limit = {
      count: 1,
      resetAt: now + windowMs,
    };
    messageRateLimits.set(socketId, limit);
    return true;
  }

  if (limit.count >= maxMessages) {
    logger.warn('WebSocket: Rate limit exceeded', {
      socketId,
      count: limit.count,
      maxMessages,
    });
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Cleanup rate limit entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [socketId, limit] of messageRateLimits.entries()) {
    if (now > limit.resetAt) {
      messageRateLimits.delete(socketId);
    }
  }
}, 60000);

/**
 * Verify audio data size
 * Prevent oversized audio chunks
 */
export function validateAudioDataSize(
  audioData: ArrayBuffer | Buffer,
  maxSizeBytes: number = 1048576 // 1MB default
): boolean {
  const size = audioData.byteLength || Buffer.byteLength(audioData as any);
  
  if (size > maxSizeBytes) {
    logger.warn('WebSocket: Oversized audio data', {
      size,
      maxSize: maxSizeBytes,
    });
    return false;
  }

  return true;
}

/**
 * Sanitize socket event data
 * Remove dangerous properties
 */
export function sanitizeSocketData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Remove prototype pollution attempts
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    if (dangerous.includes(key)) {
      continue;
    }

    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeSocketData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
