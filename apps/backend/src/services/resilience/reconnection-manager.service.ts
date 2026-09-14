/**
 * Reconnection Manager Service
 * MODULE 13: Handles automatic reconnection with exponential backoff
 * 
 * Features:
 * - Exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
 * - Maximum retry attempts (10)
 * - Prevents infinite retry loops
 * - Per-connection state tracking
 * - Graceful degradation
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger';

export interface ReconnectionConfig {
  initialDelayMs: number; // 1000 (1s)
  maxDelayMs: number; // 30000 (30s)
  maxRetries: number; // 10
  backoffMultiplier: number; // 2
  jitterMs: number; // 500 (random jitter to prevent thundering herd)
}

export interface ReconnectionState {
  connectionId: string;
  attempts: number;
  currentDelayMs: number;
  nextRetryAt?: Date;
  isReconnecting: boolean;
  lastError?: string;
  giveUpAt: Date; // Absolute time when we stop trying
}

/**
 * Reconnection Manager
 * Manages reconnection attempts with exponential backoff
 */
export class ReconnectionManagerService extends EventEmitter {
  private states: Map<string, ReconnectionState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  private defaultConfig: ReconnectionConfig = {
    initialDelayMs: 1000, // 1 second
    maxDelayMs: 30000, // 30 seconds
    maxRetries: 10,
    backoffMultiplier: 2,
    jitterMs: 500,
  };

  constructor(private config: ReconnectionConfig = {} as ReconnectionConfig) {
    super();
    this.config = { ...this.defaultConfig, ...config };
    logger.info('Reconnection Manager initialized', this.config);
  }

  /**
   * Start reconnection attempts for a connection
   */
  startReconnection(
    connectionId: string,
    reconnectFn: () => Promise<boolean>,
    onGiveUp?: () => void
  ): void {
    // Check if already reconnecting
    if (this.states.has(connectionId)) {
      logger.warn('Reconnection already in progress', { connectionId });
      return;
    }

    // Initialize state
    const giveUpAt = new Date(Date.now() + this.config.maxDelayMs * this.config.maxRetries);
    const state: ReconnectionState = {
      connectionId,
      attempts: 0,
      currentDelayMs: this.config.initialDelayMs,
      isReconnecting: true,
      giveUpAt,
    };

    this.states.set(connectionId, state);
    logger.info('Starting reconnection attempts', { connectionId, giveUpAt });

    // Start first attempt immediately
    this.attemptReconnection(connectionId, reconnectFn, onGiveUp);
  }

  /**
   * Attempt reconnection
   */
  private async attemptReconnection(
    connectionId: string,
    reconnectFn: () => Promise<boolean>,
    onGiveUp?: () => void
  ): Promise<void> {
    const state = this.states.get(connectionId);
    if (!state) {
      logger.warn('Reconnection state not found', { connectionId });
      return;
    }

    // Check if we should give up
    if (state.attempts >= this.config.maxRetries) {
      logger.error('Max reconnection attempts reached', {
        connectionId,
        attempts: state.attempts,
      });
      this.giveUp(connectionId, 'Max attempts reached', onGiveUp);
      return;
    }

    if (Date.now() > state.giveUpAt.getTime()) {
      logger.error('Reconnection time limit exceeded', {
        connectionId,
        giveUpAt: state.giveUpAt,
      });
      this.giveUp(connectionId, 'Time limit exceeded', onGiveUp);
      return;
    }

    state.attempts++;
    logger.info('Attempting reconnection', {
      connectionId,
      attempt: state.attempts,
      maxRetries: this.config.maxRetries,
    });

    this.emit('reconnection:attempt', {
      connectionId,
      attempt: state.attempts,
      maxRetries: this.config.maxRetries,
    });

    try {
      // Attempt reconnection
      const success = await reconnectFn();

      if (success) {
        logger.info('Reconnection successful', {
          connectionId,
          attempts: state.attempts,
        });
        this.emit('reconnection:success', {
          connectionId,
          attempts: state.attempts,
        });
        this.cleanup(connectionId);
        return;
      }

      // Failed, schedule retry
      this.scheduleRetry(connectionId, reconnectFn, onGiveUp);
    } catch (error: any) {
      logger.error('Reconnection attempt failed', {
        connectionId,
        attempt: state.attempts,
        error: error.message,
      });

      state.lastError = error.message;

      this.emit('reconnection:failed', {
        connectionId,
        attempt: state.attempts,
        error: error.message,
      });

      // Schedule retry
      this.scheduleRetry(connectionId, reconnectFn, onGiveUp);
    }
  }

  /**
   * Schedule next retry with exponential backoff
   */
  private scheduleRetry(
    connectionId: string,
    reconnectFn: () => Promise<boolean>,
    onGiveUp?: () => void
  ): void {
    const state = this.states.get(connectionId);
    if (!state) return;

    // Calculate next delay with exponential backoff
    const baseDelay = Math.min(
      state.currentDelayMs * this.config.backoffMultiplier,
      this.config.maxDelayMs
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.config.jitterMs;
    const delayMs = baseDelay + jitter;

    state.currentDelayMs = baseDelay;
    state.nextRetryAt = new Date(Date.now() + delayMs);

    logger.info('Scheduling reconnection retry', {
      connectionId,
      delayMs: Math.round(delayMs),
      nextRetryAt: state.nextRetryAt,
      attempt: state.attempts + 1,
    });

    this.emit('reconnection:scheduled', {
      connectionId,
      delayMs,
      nextRetryAt: state.nextRetryAt,
      attempt: state.attempts + 1,
    });

    // Clear existing timer
    const existingTimer = this.timers.get(connectionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule next attempt
    const timer = setTimeout(() => {
      this.attemptReconnection(connectionId, reconnectFn, onGiveUp);
    }, delayMs);

    this.timers.set(connectionId, timer);
  }

  /**
   * Give up on reconnection
   */
  private giveUp(connectionId: string, reason: string, onGiveUp?: () => void): void {
    logger.error('Giving up on reconnection', { connectionId, reason });

    this.emit('reconnection:giveup', {
      connectionId,
      reason,
    });

    if (onGiveUp) {
      onGiveUp();
    }

    this.cleanup(connectionId);
  }

  /**
   * Stop reconnection attempts
   */
  stopReconnection(connectionId: string): void {
    logger.info('Stopping reconnection attempts', { connectionId });
    this.cleanup(connectionId);
  }

  /**
   * Cleanup connection state and timers
   */
  private cleanup(connectionId: string): void {
    // Clear timer
    const timer = this.timers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(connectionId);
    }

    // Remove state
    this.states.delete(connectionId);

    logger.debug('Reconnection cleanup complete', { connectionId });
  }

  /**
   * Get reconnection state
   */
  getState(connectionId: string): ReconnectionState | null {
    return this.states.get(connectionId) || null;
  }

  /**
   * Check if connection is reconnecting
   */
  isReconnecting(connectionId: string): boolean {
    return this.states.has(connectionId);
  }

  /**
   * Get all reconnecting connections
   */
  getAllStates(): ReconnectionState[] {
    return Array.from(this.states.values());
  }

  /**
   * Cleanup all connections
   */
  cleanupAll(): void {
    logger.info('Cleaning up all reconnection attempts', {
      count: this.states.size,
    });

    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Clear all states
    this.states.clear();
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Reconnection config updated', this.config);
  }
}

// Singleton instance
export const reconnectionManager = new ReconnectionManagerService();
