/**
 * Express Request type augmentation
 * Extends Express.Request to include custom properties added by middleware
 */

declare namespace Express {
  export interface Request {
    // Added by authenticate middleware (src/middleware/auth.ts)
    userId?: string;
    userEmail?: string;

    // Used by rate limiting and logging middleware
    // Represents authenticated user info
    user?: {
      userId: string;
    };

    // Added by session authorization middleware (src/middleware/session-auth.ts)
    session?: {
      id: string;
      organizerId?: string;
      status?: string;
      code?: string;
    };
  }
}
