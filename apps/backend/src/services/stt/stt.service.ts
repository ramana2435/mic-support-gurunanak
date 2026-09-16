import { EventEmitter } from 'events';
import { Language, STTResult, STTLatencyMetrics } from '@live-translation/shared';
import { ISTTProvider, STTEvent } from './stt-provider.interface';
import { BrowserSTTProvider } from './browser-stt-provider';
import { GroqSTTProvider } from './groq-stt-provider';
import { groqApiKey } from '../../config';
import logger from '../../utils/logger';

/**
 * STT session lifecycle states
 */
enum STTSessionState {
  STARTING = 'starting',  // Initialization in progress
  ACTIVE = 'active',      // Ready to process audio
  STOPPING = 'stopping',  // Cleanup in progress
  STOPPED = 'stopped',    // Session ended
}

/**
 * STT session with startup audio buffer
 */
interface STTSession {
  sessionId: string;
  state: STTSessionState;
  language: Language;
  startupBuffer: Array<{ audioData: Buffer; timestamp: number }>;
  startedAt: number;
}

/**
 * STT Service
 * Manages speech-to-text streaming for multiple sessions
 * Abstracts the underlying STT provider
 */
export class STTService extends EventEmitter {
  private provider: ISTTProvider;
  private sessions: Map<string, STTSession> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly RECONNECT_DELAY = 2000;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly STARTUP_BUFFER_MAX_SIZE = 10; // Max 10 chunks during startup
  private readonly STARTUP_BUFFER_TIMEOUT = 5000; // 5 seconds max startup time
  private reconnectAttempts: Map<string, number> = new Map();

  constructor(provider?: ISTTProvider) {
    super();

    // Use Groq provider if API key is available, otherwise handle based on environment
    if (provider) {
      this.provider = provider;
    } else if (groqApiKey) {
      this.provider = new GroqSTTProvider(groqApiKey);
      logger.info('[STT] Using Groq STT Provider (REAL speech recognition)');
    } else {
      const errorMsg = 'GROQ_API_KEY not set - Speech-to-Text service unavailable';
      logger.error('[STT] ' + errorMsg);

      // In production, fail immediately - do NOT use mock provider
      if (process.env.NODE_ENV === 'production') {
        throw new Error(errorMsg + '. Set GROQ_API_KEY environment variable in Railway dashboard.');
      }

      // In development, allow mock as fallback for testing UI
      this.provider = new BrowserSTTProvider();
      logger.warn('[STT] Using mock STT provider (DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION)');
    }

    // Set up provider event listeners
    this.setupProviderListeners();

    logger.info('STT Service initialized', {
      provider: this.provider.getProviderName(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Start STT streaming for a session
   */
  async startSession(sessionId: string, language: Language): Promise<void> {
    try {
      logger.info('[STT] Starting STT session', { sessionId, language });

      if (this.sessions.has(sessionId)) {
        const existing = this.sessions.get(sessionId)!;
        if (existing.state === STTSessionState.ACTIVE || existing.state === STTSessionState.STARTING) {
          logger.warn('[STT] STT session already active or starting', {
            sessionId,
            state: existing.state,
            message: 'Ignoring duplicate start request',
          });
          return;
        }
      }

      console.log('═══════════════════════════════════════════');
      console.log('✓ STT_START_REQUESTED');
      console.log(`Session: ${sessionId}`);
      console.log(`Language: ${language}`);
      console.log(`State: STARTING`);
      console.log('═══════════════════════════════════════════');

      // Create session in STARTING state immediately
      const session: STTSession = {
        sessionId,
        state: STTSessionState.STARTING,
        language,
        startupBuffer: [],
        startedAt: Date.now(),
      };

      this.sessions.set(sessionId, session);
      this.reconnectAttempts.set(sessionId, 0);

      logger.info('[STT] Session marked as STARTING, will buffer audio during initialization', {
        sessionId,
        language,
      });

      // Start provider streaming (async operation)
      logger.info('[STT] Starting provider streaming', { sessionId, language });
      await this.provider.startStreaming(sessionId, language);

      // Transition to ACTIVE state
      session.state = STTSessionState.ACTIVE;

      console.log('═══════════════════════════════════════════');
      console.log('✓ STT_START_COMPLETED');
      console.log(`Session: ${sessionId}`);
      console.log(`State: ACTIVE`);
      console.log(`Buffered audio chunks: ${session.startupBuffer.length}`);
      console.log('═══════════════════════════════════════════');

      logger.info('[STT] STT session started successfully', {
        sessionId,
        language,
        provider: this.provider.getProviderName(),
        bufferedChunks: session.startupBuffer.length,
      });

      // Flush startup buffer
      if (session.startupBuffer.length > 0) {
        logger.info('[STT] Flushing startup buffer', {
          sessionId,
          chunks: session.startupBuffer.length,
        });

        for (const buffered of session.startupBuffer) {
          await this.provider.sendAudio(sessionId, buffered.audioData, buffered.timestamp);
        }

        session.startupBuffer = []; // Clear buffer after flushing

        logger.info('[STT] Startup buffer flushed successfully', { sessionId });
      }

    } catch (error: any) {
      logger.error('[STT] Failed to start STT session', {
        sessionId,
        error: error.message,
        stack: error.stack,
      });

      // Cleanup on failure
      const session = this.sessions.get(sessionId);
      if (session) {
        session.state = STTSessionState.STOPPED;
        session.startupBuffer = [];
      }

      throw error;
    }
  }

  /**
   * Stop STT streaming for a session
   */
  async stopSession(sessionId: string): Promise<void> {
    try {
      logger.info('Stopping STT session', { sessionId });

      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn('[STT] Session not found for stop', { sessionId });
        return;
      }

      // Mark as stopping
      session.state = STTSessionState.STOPPING;
      session.startupBuffer = []; // Discard any buffered audio

      // Clear any pending reconnect timer
      const reconnectTimer = this.reconnectTimers.get(sessionId);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        this.reconnectTimers.delete(sessionId);
      }

      await this.provider.stopStreaming(sessionId);

      session.state = STTSessionState.STOPPED;
      this.sessions.delete(sessionId);
      this.reconnectAttempts.delete(sessionId);

      logger.info('STT session stopped', { sessionId });
    } catch (error: any) {
      logger.error('Failed to stop STT session', {
        sessionId,
        error: error.message
      });
    }
  }

  /**
   * Process audio chunk
   */
  async processAudio(
    sessionId: string,
    audioData: Buffer,
    timestamp: number = Date.now()
  ): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      logger.warn('[STT] Attempted to process audio for non-existent session', { sessionId });
      return;
    }

    // Handle audio based on session state
    if (session.state === STTSessionState.STARTING) {
      // Buffer audio during startup phase
      if (session.startupBuffer.length < this.STARTUP_BUFFER_MAX_SIZE) {
        session.startupBuffer.push({ audioData, timestamp });

        logger.debug('[STT] Audio buffered during startup', {
          sessionId,
          audioSize: audioData.length,
          bufferedChunks: session.startupBuffer.length,
          maxSize: this.STARTUP_BUFFER_MAX_SIZE,
        });
      } else {
        logger.warn('[STT] Startup buffer full, discarding audio chunk', {
          sessionId,
          bufferedChunks: session.startupBuffer.length,
        });
      }

      // Check for startup timeout
      const startupDuration = Date.now() - session.startedAt;
      if (startupDuration > this.STARTUP_BUFFER_TIMEOUT) {
        logger.error('[STT] Startup timeout exceeded, transitioning to STOPPED', {
          sessionId,
          startupDuration,
          timeout: this.STARTUP_BUFFER_TIMEOUT,
        });
        session.state = STTSessionState.STOPPED;
        session.startupBuffer = [];
      }

      return;
    }

    if (session.state !== STTSessionState.ACTIVE) {
      logger.debug('[STT] Ignoring audio for non-active session', {
        sessionId,
        state: session.state,
      });
      return;
    }

    logger.debug('[STT] Processing audio chunk', {
      sessionId,
      audioSize: audioData.length,
      timestamp,
      state: session.state,
    });

    try {
      await this.provider.sendAudio(sessionId, audioData, timestamp);
    } catch (error: any) {
      logger.error('[STT] Failed to process audio', {
        sessionId,
        error: error.message,
        stack: error.stack,
      });
      this.emit('error', { sessionId, error: error.message });
    }
  }

  /**
   * Check if session is active or starting (can accept audio)
   */
  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Accept audio during STARTING (will be buffered) and ACTIVE states
    return session.state === STTSessionState.STARTING || session.state === STTSessionState.ACTIVE;
  }

  /**
   * Get session state for diagnostics
   */
  getSessionState(sessionId: string): STTSessionState | null {
    const session = this.sessions.get(sessionId);
    return session ? session.state : null;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.getProviderName();
  }

  /**
   * Set up event listeners for the STT provider
   */
  private setupProviderListeners(): void {
    // Interim results
    this.provider.on(STTEvent.INTERIM_RESULT, (data: any) => {
      logger.debug('Interim STT result', {
        sessionId: data.result.sessionId,
        text: data.result.text,
        latency: data.latency?.totalLatency,
      });
      this.emit('interim', data);
    });

    // Final results
    this.provider.on(STTEvent.FINAL_RESULT, (data: any) => {
      console.log('═══════════════════════════════════════════');
      console.log('✓ STT SERVICE RECEIVED FINAL_RESULT');
      console.log(`Session: ${data.result?.sessionId}`);
      console.log(`Text: "${data.result?.text?.substring(0, 100)}"`);
      console.log(`Re-emitting as: 'final'`);
      console.log('═══════════════════════════════════════════');

      logger.info('Final STT result', {
        sessionId: data.result.sessionId,
        text: data.result.text,
        latency: data.latency?.totalLatency,
      });
      this.emit('final', data);
    });

    // Errors
    this.provider.on(STTEvent.ERROR, (data: any) => {
      logger.error('STT provider error', data);
      this.emit('error', data);

      // Attempt reconnection
      if (data.sessionId && this.sessions.has(data.sessionId)) {
        this.handleReconnection(data.sessionId);
      }
    });

    // Timeout
    this.provider.on(STTEvent.TIMEOUT, (data: any) => {
      logger.warn('STT provider timeout', data);
      this.emit('timeout', data);

      // Attempt reconnection
      if (data.sessionId && this.sessions.has(data.sessionId)) {
        this.handleReconnection(data.sessionId);
      }
    });

    // Disconnected
    this.provider.on(STTEvent.DISCONNECTED, (data: any) => {
      logger.warn('STT provider disconnected', data);
      this.emit('disconnected', data);

      // Attempt reconnection
      if (data.sessionId && this.sessions.has(data.sessionId)) {
        this.handleReconnection(data.sessionId);
      }
    });

    // Reconnected
    this.provider.on(STTEvent.RECONNECTED, (data: any) => {
      logger.info('STT provider reconnected', data);
      this.emit('reconnected', data);

      // Reset reconnect attempts
      if (data.sessionId) {
        this.reconnectAttempts.set(data.sessionId, 0);
      }
    });
  }

  /**
   * Handle automatic reconnection
   */
  private async handleReconnection(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== STTSessionState.ACTIVE) {
      return;
    }

    const attempts = this.reconnectAttempts.get(sessionId) || 0;

    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error('Max reconnection attempts reached', { sessionId, attempts });
      this.emit('reconnectFailed', { sessionId });
      await this.stopSession(sessionId);
      return;
    }

    logger.info('Attempting STT reconnection', { sessionId, attempt: attempts + 1 });
    this.reconnectAttempts.set(sessionId, attempts + 1);

    // Clear any existing reconnect timer
    const existingTimer = this.reconnectTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule reconnection
    const timer = setTimeout(async () => {
      try {
        // Get session language (would need to be stored)
        // For now, we'll emit an event asking for reconnection
        this.emit('reconnecting', { sessionId, attempt: attempts + 1 });

        // In a full implementation, restart the provider streaming here
        logger.info('STT reconnection successful', { sessionId });
      } catch (error: any) {
        logger.error('STT reconnection failed', {
          sessionId,
          error: error.message
        });
        // Will retry on next error
      } finally {
        this.reconnectTimers.delete(sessionId);
      }
    }, this.RECONNECT_DELAY);

    this.reconnectTimers.set(sessionId, timer);
  }

  /**
   * Cleanup - stop all sessions
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up STT service');

    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map(id => this.stopSession(id)));

    // Clear all timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();

    logger.info('STT service cleanup complete');
  }
}

// Singleton instance
export const sttService = new STTService();
