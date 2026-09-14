/**
 * Rate Limiting Middleware
 * MODULE 14: Prevent abuse and DDoS attacks
 * 
 * Different limits for different endpoint types:
 * - Auth endpoints: Strict (5 requests/5 minutes)
 * - API endpoints: Moderate (100 requests/minute)
 * - WebSocket: Tracked separately
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
  requests: number[]; // Timestamps of requests for sliding window
}

/**
 * Rate limiter store
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request should be allowed
   */
  consume(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    let entry = this.store.get(key);

    // Create new entry if doesn't exist
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 1,
        resetAt: now + config.windowMs,
        requests: [now],
      };
      this.store.set(key, entry);
      return true;
    }

    // Sliding window: Remove old requests
    entry.requests = entry.requests.filter(
      (timestamp) => now - timestamp < config.windowMs
    );

    // Check if limit exceeded
    if (entry.requests.length >= config.max) {
      return false;
    }

    // Allow request
    entry.count++;
    entry.requests.push(now);
    return true;
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string, config: RateLimitConfig): number {
    const entry = this.store.get(key);
    if (!entry) {
      return config.max;
    }

    const now = Date.now();
    const validRequests = entry.requests.filter(
      (timestamp) => now - timestamp < config.windowMs
    );

    return Math.max(0, config.max - validRequests.length);
  }

  /**
   * Get reset time
   */
  getResetTime(key: string, config: RateLimitConfig): number {
    const entry = this.store.get(key);
    if (!entry || entry.requests.length === 0) {
      return Date.now() + config.windowMs;
    }

    // Oldest request + window
    return entry.requests[0] + config.windowMs;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt && entry.requests.length === 0) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limit store cleaned', { entriesRemoved: cleaned });
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Global store instance
const store = new RateLimitStore();

/**
 * Create rate limiter middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const defaultKeyGenerator = (req: Request): string => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  };

  const keyGenerator = config.keyGenerator || defaultKeyGenerator;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const allowed = store.consume(key, config);

    // Add rate limit headers
    const remaining = store.getRemaining(key, config);
    const resetTime = store.getResetTime(key, config);

    res.setHeader('X-RateLimit-Limit', config.max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      logger.warn('Rate limit exceeded', {
        key,
        path: req.path,
        method: req.method,
      });

      return next(
        new ValidationError(
          config.message || 'Too many requests. Please try again later.'
        )
      );
    }

    next();
  };
}

/**
 * Predefined rate limiters
 */

/**
 * Strict rate limit for authentication endpoints
 * 5 requests per 5 minutes per IP
 */
export const authRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: 'Too many authentication attempts. Please try again in 5 minutes.',
});

/**
 * Moderate rate limit for API endpoints
 * 100 requests per minute per IP
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many API requests. Please slow down.',
});

/**
 * Strict rate limit for session creation
 * 10 sessions per hour per user
 */
export const sessionCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many sessions created. Please try again later.',
  keyGenerator: (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user?.userId || req.ip || 'unknown';
  },
});

/**
 * Moderate rate limit for session joins
 * 20 joins per minute per IP
 */
export const sessionJoinRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many session join attempts. Please try again later.',
});

/**
 * Strict rate limit for password reset
 * 3 requests per hour per email
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests. Please try again later.',
  keyGenerator: (req: Request) => {
    // Rate limit by email
    return req.body?.email || req.ip || 'unknown';
  },
});

/**
 * Export store for testing and cleanup
 */
export { store as rateLimitStore };
