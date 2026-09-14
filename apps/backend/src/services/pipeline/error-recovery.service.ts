import { EventEmitter } from 'events';
import logger from '../../utils/logger';

/**
 * Error Severity Levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',           // Non-critical, log only
  MEDIUM = 'MEDIUM',     // Retry-able, may recover
  HIGH = 'HIGH',         // Component failure, isolate
  CRITICAL = 'CRITICAL', // System failure, needs attention
}

/**
 * Error Categories
 */
export enum ErrorCategory {
  STT = 'STT',
  TRANSLATION = 'TRANSLATION',
  TTS = 'TTS',
  TEXT_CHANNEL = 'TEXT_CHANNEL',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  SYSTEM = 'SYSTEM',
}

/**
 * Error Context
 */
export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  sessionId?: string;
  message: string;
  error?: any;
  timestamp: Date;
  retryable: boolean;
  metadata?: Record<string, any>;
}

/**
 * Error Recovery Strategy
 */
export interface RecoveryStrategy {
  shouldRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
  fallbackAction?: string;
  isolateComponent?: boolean;
  notifyUser?: boolean;
}

/**
 * Error Recovery Service
 * MODULE 10: Handles errors and implements recovery strategies
 */
export class ErrorRecoveryService extends EventEmitter {
  private errorHistory: Map<string, ErrorContext[]> = new Map();
  private readonly MAX_HISTORY_PER_SESSION = 50;
  private readonly ERROR_RATE_WINDOW = 60000; // 1 minute
  private readonly HIGH_ERROR_RATE_THRESHOLD = 10; // errors per minute

  constructor() {
    super();
    logger.info('Error Recovery Service initialized');
  }

  /**
   * Handle error and determine recovery strategy
   */
  handleError(context: ErrorContext): RecoveryStrategy {
    const { category, severity, sessionId, message, error } = context;

    // Log error
    this.logError(context);

    // Store in history
    this.storeError(context);

    // Check error rate
    const errorRate = this.getErrorRate(sessionId);
    if (errorRate > this.HIGH_ERROR_RATE_THRESHOLD) {
      logger.error('High error rate detected', {
        sessionId,
        errorRate,
        threshold: this.HIGH_ERROR_RATE_THRESHOLD,
      });
      
      this.emit('high-error-rate', {
        sessionId,
        errorRate,
        category,
      });
    }

    // Determine recovery strategy
    const strategy = this.determineRecoveryStrategy(context);

    // Emit recovery event
    this.emit('recovery-strategy', {
      context,
      strategy,
    });

    return strategy;
  }

  /**
   * Determine appropriate recovery strategy based on error context
   */
  private determineRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    const { category, severity, retryable } = context;

    // Critical errors require immediate attention
    if (severity === ErrorSeverity.CRITICAL) {
      return {
        shouldRetry: false,
        isolateComponent: true,
        notifyUser: true,
        fallbackAction: 'STOP_PIPELINE',
      };
    }

    // Category-specific strategies
    switch (category) {
      case ErrorCategory.STT:
        return this.getSTTRecoveryStrategy(context);
      
      case ErrorCategory.TRANSLATION:
        return this.getTranslationRecoveryStrategy(context);
      
      case ErrorCategory.TTS:
        return this.getTTSRecoveryStrategy(context);
      
      case ErrorCategory.TEXT_CHANNEL:
        return this.getTextChannelRecoveryStrategy(context);
      
      case ErrorCategory.NETWORK:
        return this.getNetworkRecoveryStrategy(context);
      
      case ErrorCategory.DATABASE:
        return this.getDatabaseRecoveryStrategy(context);
      
      default:
        return {
          shouldRetry: retryable,
          retryDelay: 1000,
          maxRetries: 3,
          notifyUser: severity === ErrorSeverity.HIGH,
        };
    }
  }

  /**
   * STT Recovery Strategy
   * Priority: Keep translation pipeline running
   */
  private getSTTRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      shouldRetry: true,
      retryDelay: 2000,
      maxRetries: 5,
      fallbackAction: 'CONTINUE_WITHOUT_STT',
      isolateComponent: false,
      notifyUser: context.severity === ErrorSeverity.HIGH,
    };
  }

  /**
   * Translation Recovery Strategy
   * Priority: Critical - must retry, can't continue without translation
   */
  private getTranslationRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      shouldRetry: true,
      retryDelay: 500,
      maxRetries: 3,
      fallbackAction: 'USE_CACHED_TRANSLATION',
      isolateComponent: false,
      notifyUser: true,
    };
  }

  /**
   * TTS Recovery Strategy
   * Priority: Low - text channel must continue independently
   */
  private getTTSRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      shouldRetry: false,
      fallbackAction: 'CONTINUE_TEXT_ONLY',
      isolateComponent: true,
      notifyUser: true,
    };
  }

  /**
   * Text Channel Recovery Strategy
   * Priority: Medium - implement message recovery
   */
  private getTextChannelRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      shouldRetry: true,
      retryDelay: 1000,
      maxRetries: 3,
      fallbackAction: 'REBUILD_BUFFER',
      isolateComponent: false,
      notifyUser: false,
    };
  }

  /**
   * Network Recovery Strategy
   * Priority: High - retry with backoff
   */
  private getNetworkRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      shouldRetry: true,
      retryDelay: 2000,
      maxRetries: 5,
      fallbackAction: 'RECONNECT',
      isolateComponent: false,
      notifyUser: context.severity === ErrorSeverity.HIGH,
    };
  }

  /**
   * Database Recovery Strategy
   * Priority: High - critical for session management
   */
  private getDatabaseRecoveryStrategy(context: ErrorContext): RecoveryStrategy {
    return {
      shouldRetry: true,
      retryDelay: 1000,
      maxRetries: 3,
      fallbackAction: 'USE_MEMORY_CACHE',
      isolateComponent: false,
      notifyUser: true,
    };
  }

  /**
   * Log error with appropriate level
   */
  private logError(context: ErrorContext): void {
    const logData = {
      category: context.category,
      severity: context.severity,
      sessionId: context.sessionId,
      message: context.message,
      metadata: context.metadata,
      timestamp: context.timestamp,
    };

    switch (context.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error('Pipeline error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Pipeline warning', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Pipeline info', logData);
        break;
    }
  }

  /**
   * Store error in history
   */
  private storeError(context: ErrorContext): void {
    const key = context.sessionId || 'global';
    let history = this.errorHistory.get(key);

    if (!history) {
      history = [];
      this.errorHistory.set(key, history);
    }

    history.push(context);

    // Keep only recent errors
    if (history.length > this.MAX_HISTORY_PER_SESSION) {
      history.shift();
    }
  }

  /**
   * Get error rate for a session (errors per minute)
   */
  private getErrorRate(sessionId?: string): number {
    const key = sessionId || 'global';
    const history = this.errorHistory.get(key);

    if (!history || history.length === 0) {
      return 0;
    }

    const now = Date.now();
    const recentErrors = history.filter(
      error => now - error.timestamp.getTime() < this.ERROR_RATE_WINDOW
    );

    return recentErrors.length;
  }

  /**
   * Get error history for a session
   */
  getErrorHistory(sessionId?: string): ErrorContext[] {
    const key = sessionId || 'global';
    return this.errorHistory.get(key) || [];
  }

  /**
   * Clear error history for a session
   */
  clearErrorHistory(sessionId: string): void {
    this.errorHistory.delete(sessionId);
    logger.info('Error history cleared', { sessionId });
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    let total = 0;
    let bySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };
    let byCategory = {
      [ErrorCategory.STT]: 0,
      [ErrorCategory.TRANSLATION]: 0,
      [ErrorCategory.TTS]: 0,
      [ErrorCategory.TEXT_CHANNEL]: 0,
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.DATABASE]: 0,
      [ErrorCategory.SYSTEM]: 0,
    };

    for (const history of this.errorHistory.values()) {
      for (const error of history) {
        total++;
        bySeverity[error.severity]++;
        byCategory[error.category]++;
      }
    }

    return {
      total,
      bySeverity,
      byCategory,
      sessions: this.errorHistory.size,
    };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.errorHistory.clear();
    logger.info('Error recovery service cleanup complete');
  }
}

/**
 * Error Statistics
 */
interface ErrorStats {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCategory: Record<ErrorCategory, number>;
  sessions: number;
}

// Singleton instance
export const errorRecoveryService = new ErrorRecoveryService();
