/**
 * Session Recovery Service
 * MODULE 13: Handles session state recovery after disconnection
 * 
 * Features:
 * - Store session state for recovery
 * - Restore student context on reconnection
 * - Sync missed messages
 * - Handle server restarts
 * - Session expiration handling
 */

import { EventEmitter } from 'events';
import { query } from '../../database';
import logger from '../../utils/logger';

export interface StudentSessionState {
  studentId: string;
  sessionId: string;
  socketId: string;
  language: string;
  name: string;
  joinedAt: Date;
  lastSeen: Date;
  disconnectedAt?: Date;
  missedMessageSequence?: number; // Last sequence number received
}

export interface SessionRecoveryInfo {
  sessionId: string;
  studentId: string;
  language: string;
  name: string;
  missedMessages: number;
  canRecover: boolean;
  reason?: string;
}

/**
 * Session Recovery Service
 * Manages session state for recovery after disconnections
 */
export class SessionRecoveryService extends EventEmitter {
  // In-memory state (would be Redis in production)
  private studentStates: Map<string, StudentSessionState> = new Map();
  private readonly RECOVERY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
    logger.info('Session Recovery Service initialized');

    // Periodic cleanup of old states
    setInterval(() => {
      this.cleanupOldStates();
    }, 60000); // Every minute
  }

  /**
   * Save student session state
   */
  async saveState(state: StudentSessionState): Promise<void> {
    const key = this.getStateKey(state.sessionId, state.studentId);
    
    this.studentStates.set(key, {
      ...state,
      lastSeen: new Date(),
    });

    logger.debug('Student state saved', {
      sessionId: state.sessionId,
      studentId: state.studentId,
      language: state.language,
    });
  }

  /**
   * Update last seen timestamp
   */
  updateLastSeen(sessionId: string, studentId: string): void {
    const key = this.getStateKey(sessionId, studentId);
    const state = this.studentStates.get(key);

    if (state) {
      state.lastSeen = new Date();
    }
  }

  /**
   * Mark student as disconnected
   */
  markDisconnected(sessionId: string, studentId: string): void {
    const key = this.getStateKey(sessionId, studentId);
    const state = this.studentStates.get(key);

    if (state) {
      state.disconnectedAt = new Date();
      logger.info('Student marked as disconnected', {
        sessionId,
        studentId,
        disconnectedAt: state.disconnectedAt,
      });
    }
  }

  /**
   * Check if student can recover session
   */
  async canRecover(
    sessionId: string,
    studentId: string
  ): Promise<SessionRecoveryInfo> {
    const key = this.getStateKey(sessionId, studentId);
    const state = this.studentStates.get(key);

    // Check if state exists
    if (!state) {
      return {
        sessionId,
        studentId,
        language: '',
        name: '',
        missedMessages: 0,
        canRecover: false,
        reason: 'No saved state found',
      };
    }

    // Check if within recovery window
    const disconnectedAt = state.disconnectedAt || state.lastSeen;
    const timeSinceDisconnect = Date.now() - disconnectedAt.getTime();

    if (timeSinceDisconnect > this.RECOVERY_WINDOW_MS) {
      return {
        sessionId,
        studentId,
        language: state.language,
        name: state.name,
        missedMessages: 0,
        canRecover: false,
        reason: `Recovery window expired (${Math.round(timeSinceDisconnect / 1000)}s ago)`,
      };
    }

    // Check if session is still active
    try {
      const sessionResult = await query(
        'SELECT status FROM sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return {
          sessionId,
          studentId,
          language: state.language,
          name: state.name,
          missedMessages: 0,
          canRecover: false,
          reason: 'Session not found',
        };
      }

      const sessionStatus = sessionResult.rows[0].status;
      if (sessionStatus !== 'ACTIVE' && sessionStatus !== 'CREATED') {
        return {
          sessionId,
          studentId,
          language: state.language,
          name: state.name,
          missedMessages: 0,
          canRecover: false,
          reason: `Session is ${sessionStatus}`,
        };
      }
    } catch (error: any) {
      logger.error('Failed to check session status', {
        sessionId,
        error: error.message,
      });
      return {
        sessionId,
        studentId,
        language: state.language,
        name: state.name,
        missedMessages: 0,
        canRecover: false,
        reason: 'Database error',
      };
    }

    // Recovery is possible
    return {
      sessionId,
      studentId,
      language: state.language,
      name: state.name,
      missedMessages: 0, // Would calculate from message buffer
      canRecover: true,
    };
  }

  /**
   * Recover student session
   */
  async recoverSession(
    sessionId: string,
    studentId: string,
    newSocketId: string
  ): Promise<StudentSessionState | null> {
    const recoveryInfo = await this.canRecover(sessionId, studentId);

    if (!recoveryInfo.canRecover) {
      logger.warn('Session recovery not possible', {
        sessionId,
        studentId,
        reason: recoveryInfo.reason,
      });
      return null;
    }

    const key = this.getStateKey(sessionId, studentId);
    const state = this.studentStates.get(key);

    if (!state) {
      return null;
    }

    // Update state with new socket
    state.socketId = newSocketId;
    state.disconnectedAt = undefined;
    state.lastSeen = new Date();

    logger.info('Session recovered', {
      sessionId,
      studentId,
      language: state.language,
      newSocketId,
    });

    this.emit('session:recovered', {
      sessionId,
      studentId,
      language: state.language,
    });

    return state;
  }

  /**
   * Get student state
   */
  getState(sessionId: string, studentId: string): StudentSessionState | null {
    const key = this.getStateKey(sessionId, studentId);
    return this.studentStates.get(key) || null;
  }

  /**
   * Get all students in session
   */
  getSessionStudents(sessionId: string): StudentSessionState[] {
    const students: StudentSessionState[] = [];

    this.studentStates.forEach((state) => {
      if (state.sessionId === sessionId) {
        students.push(state);
      }
    });

    return students;
  }

  /**
   * Remove student state
   */
  removeState(sessionId: string, studentId: string): void {
    const key = this.getStateKey(sessionId, studentId);
    this.studentStates.delete(key);

    logger.debug('Student state removed', { sessionId, studentId });
  }

  /**
   * Clear all states for a session
   */
  clearSession(sessionId: string): void {
    const toDelete: string[] = [];

    this.studentStates.forEach((state, key) => {
      if (state.sessionId === sessionId) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => this.studentStates.delete(key));

    logger.info('Session states cleared', {
      sessionId,
      count: toDelete.length,
    });
  }

  /**
   * Cleanup old states outside recovery window
   */
  private cleanupOldStates(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.studentStates.forEach((state, key) => {
      const lastSeenTime = state.disconnectedAt || state.lastSeen;
      const age = now - lastSeenTime.getTime();

      if (age > this.RECOVERY_WINDOW_MS) {
        toDelete.push(key);
      }
    });

    if (toDelete.length > 0) {
      toDelete.forEach((key) => this.studentStates.delete(key));

      logger.info('Old session states cleaned up', {
        count: toDelete.length,
      });
    }
  }

  /**
   * Generate state key
   */
  private getStateKey(sessionId: string, studentId: string): string {
    return `${sessionId}:${studentId}`;
  }

  /**
   * Get statistics
   */
  getStats() {
    const now = Date.now();
    let activeCount = 0;
    let disconnectedCount = 0;
    let expiredCount = 0;

    this.studentStates.forEach((state) => {
      const lastSeenTime = state.disconnectedAt || state.lastSeen;
      const age = now - lastSeenTime.getTime();

      if (state.disconnectedAt) {
        if (age < this.RECOVERY_WINDOW_MS) {
          disconnectedCount++;
        } else {
          expiredCount++;
        }
      } else {
        activeCount++;
      }
    });

    return {
      total: this.studentStates.size,
      active: activeCount,
      disconnected: disconnectedCount,
      expired: expiredCount,
      recoveryWindowMs: this.RECOVERY_WINDOW_MS,
    };
  }

  /**
   * Cleanup all
   */
  cleanup(): void {
    logger.info('Cleaning up all session states', {
      count: this.studentStates.size,
    });
    this.studentStates.clear();
  }
}

// Singleton instance
export const sessionRecovery = new SessionRecoveryService();
