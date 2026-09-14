/**
 * Provider Resilience Service
 * MODULE 13: Adds retry logic, timeouts, and circuit breaker to provider calls
 * 
 * Features:
 * - Automatic retries with exponential backoff
 * - Configurable timeouts per provider
 * - Circuit breaker integration
 * - Graceful degradation
 * - Skip on timeout (don't block pipeline)
 */

import { EventEmitter } from 'events';
import { circuitBreaker } from './circuit-breaker.service';
import logger from '../../utils/logger';

export interface ProviderConfig {
  name: string;
  timeout: number; // ms (default: 5000)
  maxRetries: number; // default: 3
  retryDelay: number; // ms (default: 1000)
  retryMultiplier: number; // default: 2
  circuitBreakerEnabled: boolean; // default: true
}

export interface ProviderCallResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  duration: number;
  timedOut: boolean;
  circuitOpen: boolean;
}

/**
 * Provider Resilience Service
 * Wraps provider calls with retries, timeouts, and circuit breakers
 */
export class ProviderResilienceService extends EventEmitter {
  private defaultConfig: Omit<ProviderConfig, 'name'> = {
    timeout: 5000, // 5 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    retryMultiplier: 2,
    circuitBreakerEnabled: true,
  };

  constructor() {
    super();
    logger.info('Provider Resilience Service initialized');
  }

  /**
   * Execute provider call with resilience
   */
  async executeWithResilience<T>(
    config: ProviderConfig,
    fn: () => Promise<T>
  ): Promise<ProviderCallResult<T>> {
    const fullConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;

    logger.debug('Executing provider call with resilience', {
      provider: fullConfig.name,
      timeout: fullConfig.timeout,
      maxRetries: fullConfig.maxRetries,
    });

    // Check circuit breaker first
    if (fullConfig.circuitBreakerEnabled && circuitBreaker.isOpen(fullConfig.name)) {
      logger.warn('Circuit breaker is OPEN, skipping call', {
        provider: fullConfig.name,
      });

      return {
        success: false,
        error: new Error(`Circuit breaker is OPEN for ${fullConfig.name}`),
        attempts: 0,
        duration: Date.now() - startTime,
        timedOut: false,
        circuitOpen: true,
      };
    }

    // Retry loop
    while (attempts < fullConfig.maxRetries) {
      attempts++;

      try {
        logger.debug('Provider call attempt', {
          provider: fullConfig.name,
          attempt: attempts,
          maxRetries: fullConfig.maxRetries,
        });

        // Execute with timeout
        const result = await this.executeWithTimeout(
          fn,
          fullConfig.timeout,
          fullConfig.name
        );

        // Success
        logger.info('Provider call succeeded', {
          provider: fullConfig.name,
          attempts,
          duration: Date.now() - startTime,
        });

        this.emit('provider:success', {
          provider: fullConfig.name,
          attempts,
          duration: Date.now() - startTime,
        });

        return {
          success: true,
          data: result,
          attempts,
          duration: Date.now() - startTime,
          timedOut: false,
          circuitOpen: false,
        };
      } catch (error: any) {
        lastError = error;

        const isTimeout = error.message?.includes('timeout');
        const isFinalAttempt = attempts >= fullConfig.maxRetries;

        logger.warn('Provider call failed', {
          provider: fullConfig.name,
          attempt: attempts,
          maxRetries: fullConfig.maxRetries,
          error: error.message,
          isTimeout,
          isFinalAttempt,
        });

        this.emit('provider:failure', {
          provider: fullConfig.name,
          attempt: attempts,
          error: error.message,
          isTimeout,
        });

        // If this is the final attempt, don't retry
        if (isFinalAttempt) {
          break;
        }

        // Calculate retry delay with exponential backoff
        const delayMs =
          fullConfig.retryDelay * Math.pow(fullConfig.retryMultiplier, attempts - 1);

        logger.debug('Scheduling retry', {
          provider: fullConfig.name,
          delayMs,
          nextAttempt: attempts + 1,
        });

        // Wait before retry
        await this.sleep(delayMs);
      }
    }

    // All retries failed
    logger.error('Provider call failed after all retries', {
      provider: fullConfig.name,
      attempts,
      error: lastError?.message,
    });

    this.emit('provider:exhausted', {
      provider: fullConfig.name,
      attempts,
      error: lastError?.message,
    });

    return {
      success: false,
      error: lastError,
      attempts,
      duration: Date.now() - startTime,
      timedOut: lastError?.message?.includes('timeout') || false,
      circuitOpen: false,
    };
  }

  /**
   * Execute function with timeout
   */
  private executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    providerName: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(`Provider call timeout after ${timeoutMs}ms for ${providerName}`)
        );
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Execute with circuit breaker
   */
  async executeWithCircuitBreaker<T>(
    providerName: string,
    fn: () => Promise<T>,
    config?: Partial<ProviderConfig>
  ): Promise<ProviderCallResult<T>> {
    const fullConfig: ProviderConfig = {
      name: providerName,
      ...this.defaultConfig,
      ...config,
    };

    try {
      const result = await circuitBreaker.execute(providerName, async () => {
        return await this.executeWithResilience(fullConfig, fn);
      });

      // Check if the inner call succeeded
      if (result.success) {
        return result;
      } else {
        // Inner call failed but didn't throw, treat as failure
        throw result.error || new Error('Provider call failed');
      }
    } catch (error: any) {
      logger.error('Circuit breaker execution failed', {
        provider: providerName,
        error: error.message,
      });

      const isCircuitOpen = error.message?.includes('Circuit breaker is OPEN');

      return {
        success: false,
        error,
        attempts: 0,
        duration: 0,
        timedOut: false,
        circuitOpen: isCircuitOpen,
      };
    }
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get provider statistics
   */
  getProviderStats(providerName: string) {
    return circuitBreaker.getStats(providerName);
  }

  /**
   * Get all provider statistics
   */
  getAllProviderStats() {
    return circuitBreaker.getAllStats();
  }

  /**
   * Reset provider circuit
   */
  resetProvider(providerName: string): void {
    circuitBreaker.reset(providerName);
    logger.info('Provider circuit reset', { provider: providerName });
  }
}

// Singleton instance
export const providerResilience = new ProviderResilienceService();
