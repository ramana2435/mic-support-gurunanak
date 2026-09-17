import { EventEmitter } from 'events';
import { Language, TranslationResultPayload } from '@live-translation/shared';
import {
  ITTSProvider,
  TTSStreamEvent,
  VoiceConfig,
  TTSLatencyMetrics,
} from './tts-provider.interface';
import { MockTTSProvider } from './mock-tts-provider';
import { GoogleTTSProvider } from './google-tts-provider';
import { latencyTelemetry } from '../telemetry/latency-telemetry.service';
import logger from '../../utils/logger';

/**
 * TTS Audio Chunk
 */
export interface TTSAudioChunk {
  sessionId: string;
  targetLanguage: Language;
  sequenceNumber: number;
  chunkIndex: number;
  audioData: Buffer;
  format: string;
  sampleRate: number;
  isLast: boolean;
  timestamp: Date;
  latency?: TTSLatencyMetrics;
}

/**
 * TTS Request
 */
interface TTSRequest {
  sessionId: string;
  text: string;
  targetLanguage: Language;
  sequenceNumber: number;
  translationTimestamp: number;
}

/**
 * Active TTS Session
 */
interface TTSSession {
  sessionId: string;
  targetLanguage: Language;
  currentSequence: number;
  processing: boolean;
  queue: TTSRequest[];
  lastProcessedTime: number;
}

/**
 * TTS Service
 * Manages text-to-speech conversion with streaming delivery
 * CRITICAL: TTS failure must NEVER stop text translation
 */
export class TTSService extends EventEmitter {
  private provider: ITTSProvider;
  private activeSessions: Map<string, TTSSession> = new Map();

  // Maximum queue size per session-language (MODULE 11: Reduced for lower latency)
  private readonly MAX_QUEUE_SIZE = 5; // Reduced from 10

  // If TTS falls behind, skip to recent translations (MODULE 11: More aggressive)
  private readonly MAX_BACKLOG_AGE_MS = 2000; // Reduced from 5000ms

  // Audio format settings (MODULE 11: Optimized for low latency)
  private readonly SAMPLE_RATE = 24000; // Reduced from 48000 for faster processing
  private readonly AUDIO_FORMAT = 'pcm';
  private readonly CHUNK_SIZE_MS = 100; // 100ms chunks for balance of latency/quality

  constructor(provider?: ITTSProvider) {
    super();
    this.provider = provider || new MockTTSProvider();
    logger.info('TTS Service initialized', {
      provider: this.provider.getProviderName(),
    });
  }

  /**
   * Process translation result through TTS
   * Called by translation event handler
   */
  async processTranslation(payload: TranslationResultPayload): Promise<void> {
    try {
      // Only process final translations for TTS
      if (!payload.isFinal) {
        return;
      }

      const { sessionId, translatedText, targetLanguage, sequenceNumber, timestamp } = payload;
      const sessionKey = this.getSessionKey(sessionId, targetLanguage);

      // Get or create session
      let session = this.activeSessions.get(sessionKey);
      if (!session) {
        session = {
          sessionId,
          targetLanguage,
          currentSequence: 0,
          processing: false,
          queue: [],
          lastProcessedTime: Date.now(),
        };
        this.activeSessions.set(sessionKey, session);

        logger.info('TTS session created', { sessionId, targetLanguage });
      }

      // Create TTS request
      const request: TTSRequest = {
        sessionId,
        text: translatedText,
        targetLanguage,
        sequenceNumber,
        translationTimestamp: new Date(timestamp).getTime(),
      };

      // Check queue size - if too large, drop oldest non-processing items
      if (session.queue.length >= this.MAX_QUEUE_SIZE) {
        logger.warn('TTS queue full, dropping oldest requests', {
          sessionId,
          targetLanguage,
          queueSize: session.queue.length,
        });

        // Keep only the most recent requests
        session.queue = session.queue.slice(-Math.floor(this.MAX_QUEUE_SIZE / 2));
      }

      // Add to queue
      session.queue.push(request);

      logger.debug('TTS request queued', {
        sessionId,
        targetLanguage,
        sequenceNumber,
        queueSize: session.queue.length,
      });

      // Process queue if not already processing
      if (!session.processing) {
        this.processQueue(sessionKey);
      }
    } catch (error: any) {
      logger.error('TTS processing failed', {
        error: error.message,
        sessionId: payload.sessionId,
        targetLanguage: payload.targetLanguage,
      });

      // Emit error but don't throw - TTS failure must not stop text
      this.emit('tts:error', {
        sessionId: payload.sessionId,
        targetLanguage: payload.targetLanguage,
        error: error.message,
      });
    }
  }

  /**
   * Process TTS queue for a session
   */
  private async processQueue(sessionKey: string): Promise<void> {
    const session = this.activeSessions.get(sessionKey);
    if (!session || session.processing) {
      return;
    }

    session.processing = true;

    try {
      while (session.queue.length > 0) {
        // Get next request
        const request = session.queue.shift()!;

        // Check if request is too old (backlog management)
        const age = Date.now() - request.translationTimestamp;
        if (age > this.MAX_BACKLOG_AGE_MS && session.queue.length > 0) {
          logger.info('Skipping old TTS request', {
            sessionId: request.sessionId,
            sequenceNumber: request.sequenceNumber,
            age,
            remainingQueue: session.queue.length,
          });
          continue; // Skip to newer requests
        }

        // Process this request
        await this.synthesize(request, session);

        // MODULE 11: No delay between requests for lower latency
        // Remove the artificial 100ms delay
      }
    } catch (error: any) {
      logger.error('TTS queue processing error', {
        error: error.message,
        sessionKey,
      });
    } finally {
      session.processing = false;
      session.lastProcessedTime = Date.now();
    }
  }

  /**
   * Synthesize single request
   */
  private async synthesize(request: TTSRequest, session: TTSSession): Promise<void> {
    const { sessionId, text, targetLanguage, sequenceNumber, translationTimestamp } = request;

    try {
      const ttsStartTimestamp = Date.now();
      let firstAudioChunkTimestamp = 0;
      let chunkIndex = 0;

      logger.info('TTS synthesis started', {
        sessionId,
        targetLanguage,
        sequenceNumber,
        text: text.substring(0, 50),
      });

      // Get voice config for language
      const voices = this.provider.getVoicesForLanguage(targetLanguage);
      const voiceConfig = voices[0]; // Use first available voice

      // Start synthesis (streaming)
      const stream = this.provider.synthesize(text, targetLanguage, voiceConfig);

      for await (const event of stream) {
        if (event.type === 'chunk' && event.chunk) {
          // MODULE 11: Record T3 for first chunk only
          if (chunkIndex === 0) {
            firstAudioChunkTimestamp = Date.now();
            latencyTelemetry.recordTTSFirstChunk(
              sessionId,
              sequenceNumber,
              targetLanguage,
              firstAudioChunkTimestamp
            );
          }

          const audioDeliveryTimestamp = Date.now();

          const latency: TTSLatencyMetrics = {
            translationResultTimestamp: translationTimestamp,
            ttsStartTimestamp,
            firstAudioChunkTimestamp,
            audioDeliveryTimestamp,
            ttsLatency: firstAudioChunkTimestamp - ttsStartTimestamp,
            totalLatency: audioDeliveryTimestamp - translationTimestamp,
          };

          const chunk: TTSAudioChunk = {
            sessionId,
            targetLanguage,
            sequenceNumber,
            chunkIndex,
            audioData: event.chunk,
            format: this.AUDIO_FORMAT,
            sampleRate: this.SAMPLE_RATE,
            isLast: false,
            timestamp: new Date(),
            latency: chunkIndex === 0 ? latency : undefined,
          };

          // Emit audio chunk
          this.emit('tts:chunk', chunk);

          chunkIndex++;
        } else if (event.type === 'end') {
          // Send final chunk marker
          const endChunk: TTSAudioChunk = {
            sessionId,
            targetLanguage,
            sequenceNumber,
            chunkIndex,
            audioData: Buffer.alloc(0),
            format: this.AUDIO_FORMAT,
            sampleRate: this.SAMPLE_RATE,
            isLast: true,
            timestamp: new Date(),
          };

          this.emit('tts:chunk', endChunk);

          logger.info('TTS synthesis completed', {
            sessionId,
            targetLanguage,
            sequenceNumber,
            chunkCount: chunkIndex,
            ttsLatency: firstAudioChunkTimestamp ? firstAudioChunkTimestamp - ttsStartTimestamp : 0,
          });

          break;
        } else if (event.type === 'error') {
          throw new Error(event.error || 'TTS synthesis error');
        }
      }

      // Update session
      session.currentSequence = sequenceNumber;
    } catch (error: any) {
      logger.error('TTS synthesis error', {
        error: error.message,
        sessionId,
        targetLanguage,
        sequenceNumber,
      });

      // Emit error event
      this.emit('tts:error', {
        sessionId,
        targetLanguage,
        sequenceNumber,
        error: error.message,
      });

      // Continue processing - don't let one failure stop the queue
    }
  }

  /**
   * Stop TTS for a session-language
   */
  stopSession(sessionId: string, targetLanguage: Language): void {
    const sessionKey = this.getSessionKey(sessionId, targetLanguage);
    const session = this.activeSessions.get(sessionKey);

    if (session) {
      // Clear queue
      session.queue = [];

      // Cancel any ongoing synthesis
      this.provider.cancel();

      // Remove session
      this.activeSessions.delete(sessionKey);

      logger.info('TTS session stopped', { sessionId, targetLanguage });
    }
  }

  /**
   * Stop all TTS for a session (all languages)
   */
  stopAllForSession(sessionId: string): void {
    const keysToDelete: string[] = [];

    for (const [key, session] of this.activeSessions.entries()) {
      if (session.sessionId === sessionId) {
        session.queue = [];
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.activeSessions.delete(key));

    // Cancel any ongoing synthesis
    this.provider.cancel();

    logger.info('TTS stopped for all languages', { sessionId, count: keysToDelete.length });
  }

  /**
   * Get TTS statistics
   */
  getTTSStats(): TTSStats {
    let totalQueued = 0;
    let activeCount = 0;

    for (const session of this.activeSessions.values()) {
      totalQueued += session.queue.length;
      if (session.processing) {
        activeCount++;
      }
    }

    return {
      activeSessions: this.activeSessions.size,
      totalQueued,
      activeProcessing: activeCount,
    };
  }

  /**
   * Get session key
   */
  private getSessionKey(sessionId: string, targetLanguage: Language): string {
    return `${sessionId}:${targetLanguage}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * TTS Statistics
 */
interface TTSStats {
  activeSessions: number;
  totalQueued: number;
  activeProcessing: number;
}

/**
 * Initialize TTS provider based on environment
 */
function initializeTTSProvider(): ITTSProvider {
  // Check if Google Cloud TTS is configured
  const hasGoogleCredentials = 
    process.env.GOOGLE_APPLICATION_CREDENTIALS || 
    process.env.GOOGLE_CLOUD_KEY_JSON;

  if (hasGoogleCredentials) {
    try {
      const googleProvider = new GoogleTTSProvider();
      if (googleProvider.isReady()) {
        logger.info('Using Google Cloud TTS provider');
        return googleProvider;
      }
    } catch (error: any) {
      logger.error('Failed to initialize Google TTS, falling back to Mock', {
        error: error.message,
      });
    }
  } else {
    logger.warn('Google Cloud TTS credentials not configured, using MockTTSProvider');
    logger.warn('Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_KEY_JSON to enable real TTS');
  }

  // Fallback to mock provider
  logger.info('Using MockTTSProvider (no real audio)');
  return new MockTTSProvider();
}

// Singleton instance with auto-detected provider
export const ttsService = new TTSService(initializeTTSProvider());
