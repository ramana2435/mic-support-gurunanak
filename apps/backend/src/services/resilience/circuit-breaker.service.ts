/**
 * Circuit Breaker Service
 * MODULE 13: Prevents cascade failures by breaking circuits to failing services
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit broken, requests fail fast without calling service
 * - HALF_OPEN: Testing if service recovered, limited requests pass through
 * 
 * Features:
 * - Automatic state transitions
 * - Failure threshold detection
 * - Auto-recovery after cooldown
 * - Per-service circuit tracking
 * - Graceful degradation
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit broken, fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening (default: 5)
  successThreshold: number; // Number of successes in HALF_OPEN before closing (default: 2)
  timeout: number; // Time in ms before attempting recovery (default: 60000 = 60s)
  monitoringPeriod: number; // Time window for counting failures (default: 60000 = 60s)
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  uptime: number; // Percentage
}

/**
 * Circuit Breaker
 * Tracks state and statistics for a single circuit
 */
class Circuit {
  state: CircuitState = CircuitState.CLOSED;
  failures: number = 0;
  successes: number = 0;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number = 0;
  totalFailures: number = 0;
  totalSuccesses: number = 0;
  private resetTimer?: NodeJS.Timeout;
  private failureTimestamps: number[] = []; // Track failures within monitoring period

  constructor(
    public name: string,
    private config: CircuitBreakerConfig,
    private emitter: EventEmitter
  ) {}

  /**
   * Record success
   */
  recordSuccess(): void {
    this.totalRequests++;
    this.totalSuccesses++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      logger.info('Circuit success in HALF_OPEN', {
        circuit: this.name,
        successes: this.successes,
        threshold: this.config.successThreshold,
      });

      if (this.successes >= this.config.successThreshold) {
        this.close();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
      this.failureTimestamps = [];
    }
  }

  /**
   * Record failure
   */
  recordFailure(): void {
    this.totalRequests++;
    this.totalFailures++;
    this.lastFailureTime = new Date();
    this.failures++;

    // Track failure timestamp
    const now = Date.now();
    this.failureTimestamps.push(now);

    // Remove old failures outside monitoring period
    this.failureTimestamps = this.failureTimestamps.filter(
      (timestamp) => now - timestamp < this.config.monitoringPeriod
    );

    logger.warn('Circuit failure recorded', {
      circuit: this.name,
      state: this.state,
      failures: this.failures,
      recentFailures: this.failureTimestamps.length,
      threshold: this.config.failureThreshold,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery test, open immediately
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open
      if (this.failureTimestamps.length >= this.config.failureThreshold) {
        this.open();
      }
    }
  }

  /**
   * Check if request should be allowed
   */
  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (this.nextAttemptTime && Date.now() >= this.nextAttemptTime.getTime()) {
        this.halfOpen();
        return true;
      }
      return false;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      return true;
    }

    return false;
  }

  /**
   * Open circuit (fail fast)
   */
  private open(): void {
    if (this.state === CircuitState.OPEN) return;

    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    this.successes = 0;

    logger.error('Circuit OPENED', {
      circuit: this.name,
      failures: this.failures,
      recentFailures: this.failureTimestamps.length,
      nextAttemptTime: this.nextAttemptTime,
    });

    this.emitter.emit('circuit:open', {
      circuit: this.name,
      failures: this.failures,
      nextAttemptTime: this.nextAttemptTime,
    });

    // Schedule automatic transition to HALF_OPEN
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.halfOpen();
      }
    }, this.config.timeout);
  }

  /**
   * Half-open circuit (testing recovery)
   */
  private halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successes = 0;
    this.failures = 0;

    logger.info('Circuit HALF_OPEN (testing recovery)', {
      circuit: this.name,
    });

    this.emitter.emit('circuit:halfopen', {
      circuit: this.name,
    });
  }

  /**
   * Close circuit (normal operation)
   */
  private close(): void {
    if (this.state === CircuitState.CLOSED) return;

    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    this.nextAttemptTime = undefined;

    logger.info('Circuit CLOSED (recovered)', {
      circuit: this.name,
    });

    this.emitter.emit('circuit:closed', {
      circuit: this.name,
    });

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }

  /**
   * Get statistics
   */
  getStats(): CircuitStats {
    const uptime =
      this.totalRequests > 0
        ? (this.totalSuccesses / this.totalRequests) * 100
        : 100;

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      uptime: parseFloat(uptime.toFixed(2)),
    };
  }

  /**
   * Reset circuit
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    this.nextAttemptTime = undefined;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    logger.info('Circuit manually reset', { circuit: this.name });
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }
}

/**
 * Circuit Breaker Service
 * Manages multiple circuits for different services
 */
export class CircuitBreakerService extends EventEmitter {
  private circuits: Map<string, Circuit> = new Map();

  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 60 seconds
    monitoringPeriod: 60000, // 60 seconds
  };

  constructor() {
    super();
    logger.info('Circuit Breaker Service initialized');
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(circuitName, config);

    if (!circuit.canExecute()) {
      const stats = circuit.getStats();
      const error = new Error(
        `Circuit breaker is OPEN for ${circuitName}. Next attempt at ${stats.nextAttemptTime?.toISOString()}`
      );
      (error as any).circuitState = stats.state;
      (error as any).nextAttemptTime = stats.nextAttemptTime;

      logger.warn('Circuit breaker rejected request', {
        circuit: circuitName,
        state: stats.state,
        nextAttemptTime: stats.nextAttemptTime,
      });

      throw error;
    }

    try {
      const result = await fn();
      circuit.recordSuccess();
      return result;
    } catch (error: any) {
      circuit.recordFailure();
      throw error;
    }
  }

  /**
   * Get or create circuit
   */
  private getOrCreateCircuit(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): Circuit {
    let circuit = this.circuits.get(name);

    if (!circuit) {
      const circuitConfig = { ...this.defaultConfig, ...config };
      circuit = new Circuit(name, circuitConfig, this);
      this.circuits.set(name, circuit);
      logger.info('Circuit created', { circuit: name, config: circuitConfig });
    }

    return circuit;
  }

  /**
   * Get circuit statistics
   */
  getStats(circuitName: string): CircuitStats | null {
    const circuit = this.circuits.get(circuitName);
    return circuit ? circuit.getStats() : null;
  }

  /**
   * Get all circuit statistics
   */
  getAllStats(): { [circuitName: string]: CircuitStats } {
    const stats: { [circuitName: string]: CircuitStats } = {};

    this.circuits.forEach((circuit, name) => {
      stats[name] = circuit.getStats();
    });

    return stats;
  }

  /**
   * Reset circuit
   */
  reset(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.reset();
    }
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    logger.info('Resetting all circuits', { count: this.circuits.size });
    this.circuits.forEach((circuit) => circuit.reset());
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    logger.info('Cleaning up circuit breakers', { count: this.circuits.size });
    this.circuits.forEach((circuit) => circuit.cleanup());
    this.circuits.clear();
  }

  /**
   * Check if circuit is open
   */
  isOpen(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName);
    return circuit ? circuit.getStats().state === CircuitState.OPEN : false;
  }

  /**
   * Check if any circuit is open
   */
  hasOpenCircuits(): boolean {
    for (const circuit of this.circuits.values()) {
      if (circuit.getStats().state === CircuitState.OPEN) {
        return true;
      }
    }
    return false;
  }
}

// Singleton instance
export const circuitBreaker = new CircuitBreakerService();
