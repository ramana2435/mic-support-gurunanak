import { EventEmitter } from 'events';
import { Language, SessionStatus } from '@live-translation/shared';
import { sttService } from '../stt/stt.service';
import { translationService, TranslationWithMetrics } from '../translation/translation.service';
import { ttsService } from '../tts/tts.service';
import { textChannelService } from '../text-channel/text-channel.service';
import { sessionService } from '../session.service';
import { errorRecoveryService, ErrorCategory, ErrorSeverity } from './error-recovery.service';
import { latencyTelemetry } from '../telemetry/latency-telemetry.service';
import logger from '../../utils/logger';

/**
 * Pipeline State
 */
export enum PipelineState {
  IDLE = 'IDLE',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
}

/**
 * Session Pipeline Configuration
 */
export interface SessionPipelineConfig {
  sessionId: string;
  sourceLanguage: Language;
  targetLanguages: Language[];
  enableSTT: boolean;
  enableTranslation: boolean;
  enableTTS: boolean;
  enableTextChannel: boolean;
}

/**
 * Pipeline Health Status
 */
export interface PipelineHealth {
  sessionId: string;
  state: PipelineState;
  uptime: number;
  metrics: {
    sttActive: boolean;
    translationsProcessed: number;
    ttsActive: boolean;
    textMessagesBuffered: number;
    connectedStudents: number;
  };
  lastActivity: Date;
  errors: string[];
}

/**
 * Active Session Pipeline
 */
interface ActivePipeline {
  sessionId: string;
  config: SessionPipelineConfig;
  state: PipelineState;
  startedAt: Date;
  stoppedAt?: Date;
  sequenceNumber: number;
  errors: string[];
  lastActivity: Date;
  healthCheckInterval?: NodeJS.Timeout;
}

/**
 * Pipeline Orchestrator Service
 * MODULE 10: Manages complete lifecycle of translation pipeline
 * Coordinates STT → Translation → TTS → Text Channel → Audio Delivery
 */
export class PipelineOrchestratorService extends EventEmitter {
  private activePipelines: Map<string, ActivePipeline> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly STALL_DETECTION_TIMEOUT = 60000; // 1 minute of no activity

  constructor() {
    super();
    this.setupServiceListeners();
    logger.info('Pipeline Orchestrator Service initialized');
  }

  /**
   * Start pipeline for a session
   */
  async startPipeline(config: SessionPipelineConfig): Promise<void> {
    const { sessionId, sourceLanguage, targetLanguages } = config;

    try {
      logger.info('Starting pipeline', { sessionId, config });

      // Check if pipeline already exists
      if (this.activePipelines.has(sessionId)) {
        const existing = this.activePipelines.get(sessionId)!;
        if (existing.state === PipelineState.RUNNING) {
          logger.warn('Pipeline already running', { sessionId });
          return;
        }
      }

      // Create pipeline record
      const pipeline: ActivePipeline = {
        sessionId,
        config,
        state: PipelineState.STARTING,
        startedAt: new Date(),
        sequenceNumber: 0,
        errors: [],
        lastActivity: new Date(),
      };

      this.activePipelines.set(sessionId, pipeline);

      // Verify session exists and update status
      const session = await sessionService.getSessionById(sessionId);
      if (session.status !== SessionStatus.ACTIVE) {
        await sessionService.updateSessionStatus(sessionId, SessionStatus.ACTIVE);
      }

      // Register target languages with translation service
      if (config.enableTranslation) {
        translationService.registerSessionLanguages(sessionId, targetLanguages);
        logger.info('Translation languages registered', { sessionId, targetLanguages });
      }

      // Start STT if enabled
      if (config.enableSTT) {
        await sttService.startSession(sessionId, sourceLanguage);
        logger.info('STT started', { sessionId, sourceLanguage });
      }

      // Update state to RUNNING
      pipeline.state = PipelineState.RUNNING;
      pipeline.lastActivity = new Date();

      // Start health check
      this.startHealthCheck(sessionId);

      this.emit('pipeline:started', { sessionId });
      logger.info('Pipeline started successfully', { sessionId });
    } catch (error: any) {
      logger.error('Failed to start pipeline', { 
        sessionId, 
        error: error.message 
      });

      const pipeline = this.activePipelines.get(sessionId);
      if (pipeline) {
        pipeline.state = PipelineState.ERROR;
        pipeline.errors.push(error.message);
      }

      this.emit('pipeline:error', { sessionId, error: error.message });
      throw error;
    }
  }

  /**
   * Stop pipeline for a session
   */
  async stopPipeline(sessionId: string): Promise<void> {
    try {
      logger.info('Stopping pipeline', { sessionId });

      const pipeline = this.activePipelines.get(sessionId);
      if (!pipeline) {
        logger.warn('Pipeline not found', { sessionId });
        return;
      }

      if (pipeline.state === PipelineState.STOPPED || pipeline.state === PipelineState.STOPPING) {
        logger.warn('Pipeline already stopped or stopping', { sessionId });
        return;
      }

      // Update state
      pipeline.state = PipelineState.STOPPING;

      // Stop health check
      if (pipeline.healthCheckInterval) {
        clearInterval(pipeline.healthCheckInterval);
        pipeline.healthCheckInterval = undefined;
      }

      // Stop STT
      if (pipeline.config.enableSTT) {
        await sttService.stopSession(sessionId);
        logger.info('STT stopped', { sessionId });
      }

      // Stop TTS for all languages
      if (pipeline.config.enableTTS) {
        ttsService.stopAllForSession(sessionId);
        logger.info('TTS stopped', { sessionId });
      }

      // Unregister from translation service
      if (pipeline.config.enableTranslation) {
        translationService.unregisterSession(sessionId);
        logger.info('Translation unregistered', { sessionId });
      }

      // Clear text channel (after grace period for recovery)
      if (pipeline.config.enableTextChannel) {
        setTimeout(() => {
          textChannelService.clearSession(sessionId);
          logger.info('Text channel cleared', { sessionId });
        }, 300000); // 5 minutes grace period
      }

      // Update session status
      await sessionService.updateSessionStatus(sessionId, SessionStatus.STOPPED);

      // Update pipeline state
      pipeline.state = PipelineState.STOPPED;
      pipeline.stoppedAt = new Date();

      this.emit('pipeline:stopped', { sessionId });
      logger.info('Pipeline stopped successfully', { sessionId });

      // Remove from active pipelines after a delay
      setTimeout(() => {
        this.activePipelines.delete(sessionId);
        logger.info('Pipeline removed from active list', { sessionId });
      }, 60000); // Keep for 1 minute for stats
    } catch (error: any) {
      logger.error('Failed to stop pipeline', { 
        sessionId, 
        error: error.message 
      });

      const pipeline = this.activePipelines.get(sessionId);
      if (pipeline) {
        pipeline.state = PipelineState.ERROR;
        pipeline.errors.push(error.message);
      }

      this.emit('pipeline:error', { sessionId, error: error.message });
      throw error;
    }
  }

  /**
   * Get pipeline state
   */
  getPipelineState(sessionId: string): PipelineState {
    const pipeline = this.activePipelines.get(sessionId);
    return pipeline ? pipeline.state : PipelineState.IDLE;
  }

  /**
   * Get pipeline health
   */
  getPipelineHealth(sessionId: string): PipelineHealth | null {
    const pipeline = this.activePipelines.get(sessionId);
    if (!pipeline) {
      return null;
    }

    const uptime = Date.now() - pipeline.startedAt.getTime();
    const ttsStats = ttsService.getTTSStats();
    const textStats = textChannelService.getBufferStats();
    const cacheStats = translationService.getCacheStats();

    return {
      sessionId,
      state: pipeline.state,
      uptime,
      metrics: {
        sttActive: sttService.isSessionActive(sessionId),
        translationsProcessed: cacheStats.activeTranslations,
        ttsActive: ttsStats.activeSessions > 0,
        textMessagesBuffered: textStats.totalMessages,
        connectedStudents: textStats.trackedStudents,
      },
      lastActivity: pipeline.lastActivity,
      errors: [...pipeline.errors],
    };
  }

  /**
   * Get all active pipelines
   */
  getActivePipelines(): string[] {
    return Array.from(this.activePipelines.keys()).filter(sessionId => {
      const pipeline = this.activePipelines.get(sessionId);
      return pipeline && pipeline.state === PipelineState.RUNNING;
    });
  }

  /**
   * Process STT result through the pipeline (MODULE 11: With latency telemetry)
   */
  private async processSTTResult(data: any, isFinal: boolean): Promise<void> {
    const { result, latency } = data;
    const { sessionId, text, language, confidence } = result;

    const pipeline = this.activePipelines.get(sessionId);
    if (!pipeline || pipeline.state !== PipelineState.RUNNING) {
      logger.debug('Pipeline not running, skipping STT result', { sessionId });
      return;
    }

    // Update activity timestamp
    pipeline.lastActivity = new Date();

    // Increment sequence number for final results
    if (isFinal) {
      pipeline.sequenceNumber++;
    }

    const sequenceNumber = pipeline.sequenceNumber;

    // MODULE 11: Record T1 (STT result timestamp)
    const t1 = Date.now();
    latencyTelemetry.recordSTTResult(sessionId, sequenceNumber, t1);

    try {
      // Translate to all target languages (MODULE 11: Parallel processing)
      if (pipeline.config.enableTranslation && text.trim().length > 0) {
        const translations = await translationService.translateForSession(
          sessionId,
          text,
          language,
          sequenceNumber
        );

        // MODULE 11: Record T2 (Translation result timestamp)
        const t2 = Date.now();

        // Broadcast translations (parallel with TTS)
        const broadcastPromises: Promise<void>[] = [];
        
        for (const [targetLanguage, translation] of translations.entries()) {
          // Record T2 per language
          latencyTelemetry.recordTranslationResult(sessionId, sequenceNumber, targetLanguage, t2);
          
          // Broadcast immediately (don't wait for TTS)
          const broadcastPromise = this.broadcastTranslation(
            sessionId,
            text,
            language,
            targetLanguage,
            translation,
            isFinal,
            sequenceNumber,
            latency
          );
          
          broadcastPromises.push(broadcastPromise);
        }

        // Wait for all broadcasts (but not TTS processing)
        await Promise.all(broadcastPromises);
      }
    } catch (error: any) {
      // Handle error with recovery service
      const errorContext = {
        category: ErrorCategory.TRANSLATION,
        severity: ErrorSeverity.HIGH,
        sessionId,
        message: 'Translation processing failed',
        error,
        timestamp: new Date(),
        retryable: true,
        metadata: {
          text,
          language,
          sequenceNumber,
        },
      };

      const strategy = errorRecoveryService.handleError(errorContext);
      
      pipeline.errors.push(`Processing error: ${error.message}`);
      
      // Emit warning but continue pipeline
      this.emit('pipeline:warning', {
        sessionId,
        message: 'Translation failed but pipeline continues',
        error: error.message,
        recoveryStrategy: strategy,
      });

      logger.error('Pipeline processing error with recovery', {
        sessionId,
        error: error.message,
        strategy,
      });
    }
  }

  /**
   * Broadcast translation result (MODULE 11: Parallel text and TTS)
   */
  private async broadcastTranslation(
    sessionId: string,
    originalText: string,
    sourceLanguage: Language,
    targetLanguage: Language,
    translation: TranslationWithMetrics,
    isFinal: boolean,
    sequenceNumber: number,
    sttLatency?: any
  ): Promise<void> {
    const payload = {
      sessionId,
      text: originalText,
      translatedText: translation.translatedText,
      sourceLanguage,
      targetLanguage,
      isFinal,
      confidence: translation.confidence,
      sequenceNumber,
      timestamp: translation.timestamp,
      latency: {
        ...sttLatency,
        ...translation.latency,
      },
    };

    // Store in text channel for recovery
    if (isFinal) {
      textChannelService.storeMessage(payload);
    }

    // MODULE 11: Emit text IMMEDIATELY (don't wait for TTS)
    this.emit(isFinal ? 'translation:final' : 'translation:interim', payload);

    // MODULE 11: Process TTS in parallel (non-blocking)
    if (isFinal && this.activePipelines.get(sessionId)?.config.enableTTS) {
      // Fire and forget - don't await
      setImmediate(async () => {
        try {
          await ttsService.processTranslation(payload);
        } catch (error: any) {
          logger.error('TTS processing error (non-blocking)', {
            error: error.message,
            sessionId,
            targetLanguage,
          });
        }
      });
    }
  }

  /**
   * Start health check for pipeline
   */
  private startHealthCheck(sessionId: string): void {
    const pipeline = this.activePipelines.get(sessionId);
    if (!pipeline) return;

    // Clear existing interval
    if (pipeline.healthCheckInterval) {
      clearInterval(pipeline.healthCheckInterval);
    }

    pipeline.healthCheckInterval = setInterval(() => {
      this.performHealthCheck(sessionId);
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check
   */
  private performHealthCheck(sessionId: string): void {
    const pipeline = this.activePipelines.get(sessionId);
    if (!pipeline) return;

    const health = this.getPipelineHealth(sessionId);
    if (!health) return;

    // Check for stalls (no activity for too long)
    const timeSinceActivity = Date.now() - pipeline.lastActivity.getTime();
    if (timeSinceActivity > this.STALL_DETECTION_TIMEOUT) {
      logger.warn('Pipeline stall detected', {
        sessionId,
        timeSinceActivity,
        state: pipeline.state,
      });

      this.emit('pipeline:stall', {
        sessionId,
        timeSinceActivity,
      });
    }

    // Log health metrics
    logger.debug('Pipeline health check', {
      sessionId,
      health,
    });

    this.emit('pipeline:health', health);
  }

  /**
   * Setup listeners for all service events (MODULE 10: With error recovery)
   */
  private setupServiceListeners(): void {
    // STT events
    sttService.on('interim', (data: any) => {
      this.processSTTResult(data, false);
    });

    sttService.on('final', (data: any) => {
      this.processSTTResult(data, true);
    });

    sttService.on('error', (data: any) => {
      const pipeline = this.activePipelines.get(data.sessionId);
      if (pipeline) {
        // Handle with error recovery
        const errorContext = {
          category: ErrorCategory.STT,
          severity: ErrorSeverity.HIGH,
          sessionId: data.sessionId,
          message: `STT error: ${data.error}`,
          error: data.error,
          timestamp: new Date(),
          retryable: true,
        };

        const strategy = errorRecoveryService.handleError(errorContext);
        pipeline.errors.push(`STT error: ${data.error}`);
        
        logger.error('STT error in pipeline with recovery', {
          ...data,
          strategy,
        });

        // Text channel continues independently
        this.emit('pipeline:warning', {
          sessionId: data.sessionId,
          message: 'STT failed but text channel continues',
          error: data.error,
        });
      }
    });

    // Translation service errors
    translationService.on('error', (data: any) => {
      const pipeline = this.activePipelines.get(data.sessionId);
      if (pipeline) {
        // Handle with error recovery
        const errorContext = {
          category: ErrorCategory.TRANSLATION,
          severity: ErrorSeverity.HIGH,
          sessionId: data.sessionId,
          message: `Translation error: ${data.error}`,
          error: data.error,
          timestamp: new Date(),
          retryable: true,
        };

        const strategy = errorRecoveryService.handleError(errorContext);
        pipeline.errors.push(`Translation error: ${data.error}`);
        
        logger.error('Translation error in pipeline with recovery', {
          ...data,
          strategy,
        });
      }
    });

    // TTS events
    ttsService.on('tts:error', (data: any) => {
      const pipeline = this.activePipelines.get(data.sessionId);
      if (pipeline) {
        // Handle with error recovery (TTS is non-critical)
        const errorContext = {
          category: ErrorCategory.TTS,
          severity: ErrorSeverity.MEDIUM,
          sessionId: data.sessionId,
          message: `TTS error: ${data.error}`,
          error: data.error,
          timestamp: new Date(),
          retryable: false, // TTS failure should not retry
        };

        const strategy = errorRecoveryService.handleError(errorContext);
        pipeline.errors.push(`TTS error: ${data.error}`);
        
        logger.warn('TTS error in pipeline (text continues)', {
          ...data,
          strategy,
        });

        // Emit warning - text channel continues independently
        this.emit('pipeline:warning', {
          sessionId: data.sessionId,
          message: 'TTS failed but text translation continues',
          error: data.error,
        });
      }
    });

    logger.info('Pipeline service listeners configured with error recovery');
  }

  /**
   * Cleanup all pipelines (for shutdown) (MODULE 10: With error recovery)
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up all pipelines', {
      count: this.activePipelines.size,
    });

    const sessionIds = Array.from(this.activePipelines.keys());
    
    await Promise.all(
      sessionIds.map(sessionId => 
        this.stopPipeline(sessionId).catch(error => {
          logger.error('Error stopping pipeline during cleanup', {
            sessionId,
            error: error.message,
          });
        })
      )
    );

    // Clear all intervals
    for (const pipeline of this.activePipelines.values()) {
      if (pipeline.healthCheckInterval) {
        clearInterval(pipeline.healthCheckInterval);
      }
    }

    this.activePipelines.clear();
    
    // Cleanup error recovery service
    errorRecoveryService.cleanup();
    
    logger.info('Pipeline orchestrator cleanup complete');
  }

  /**
   * Get statistics
   */
  getStats(): PipelineStats {
    let runningCount = 0;
    let stoppedCount = 0;
    let errorCount = 0;
    let totalErrors = 0;

    for (const pipeline of this.activePipelines.values()) {
      switch (pipeline.state) {
        case PipelineState.RUNNING:
          runningCount++;
          break;
        case PipelineState.STOPPED:
          stoppedCount++;
          break;
        case PipelineState.ERROR:
          errorCount++;
          break;
      }
      totalErrors += pipeline.errors.length;
    }

    return {
      totalPipelines: this.activePipelines.size,
      running: runningCount,
      stopped: stoppedCount,
      error: errorCount,
      totalErrors,
    };
  }
}

/**
 * Pipeline Statistics
 */
interface PipelineStats {
  totalPipelines: number;
  running: number;
  stopped: number;
  error: number;
  totalErrors: number;
}

// Singleton instance
export const pipelineOrchestrator = new PipelineOrchestratorService();
