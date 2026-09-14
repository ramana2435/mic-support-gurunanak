/**
 * Security Headers Middleware
 * MODULE 14: Add security headers to all responses
 * 
 * Implements:
 * - HSTS (HTTP Strict Transport Security)
 * - CSP (Content Security Policy)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { config, isProduction } from '../config';

/**
 * Configure Helmet with security headers
 */
export const securityHeaders = helmet({
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Socket.IO
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", config.corsOrigin, 'wss:', 'ws:'], // Allow WebSocket
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : undefined,
    },
  },

  // X-Frame-Options: Prevent clickjacking
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options: Prevent MIME sniffing
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // Remove X-Powered-By header
  hidePoweredBy: true,
});

/**
 * Additional security headers
 */
export function additionalSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Permissions-Policy (formerly Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    [
      'microphone=(self)', // Only allow microphone on same origin
      'camera=()',          // Disable camera
      'geolocation=()',     // Disable geolocation
      'payment=()',         // Disable payment
      'usb=()',             // Disable USB
    ].join(', ')
  );

  // X-DNS-Prefetch-Control
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Expect-CT (Certificate Transparency)
  if (isProduction) {
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }

  next();
}

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Parse allowed origins from config
    const allowedOrigins = config.corsOrigin.split(',').map(o => o.trim());

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

/**
 * Secure cookie configuration
 */
export const secureCookieOptions = {
  httpOnly: true,
  secure: isProduction, // Only over HTTPS in production
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
