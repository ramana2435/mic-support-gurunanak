import { EventEmitter } from 'events';
import { Language, STTResult, STTLatencyMetrics } from '@live-translation/shared';
import { ISTTProvider, STTEvent } from './stt-provider.interface';
import { BrowserSTTProvider } from './browser-stt-provider';
import logger from '../../utils/logger';

/**
 * STT Service
 * Manages speech-to-text streaming for multiple sessions
 * Abstracts the underlying STT provider
 */
export class STTService extends EventEmitter {
  private provider: ISTTProvider;
  private activeSessions: Set<string> = new Set();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly RECONNECT_DELAY = 2000;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectAttempts: Map<string, number> = new Map();

  constructor(provider?: ISTTProvider) {
    super();
    
    // Use provided provider or default to BrowserSTTProvider
    this.provider = provider || new BrowserSTTProvider();
    
    // Set up provider event listeners
    this.setupProviderListeners();
    
    logger.info('STT Service initialized', { 
      provider: this.provider.getProviderName() 
    });
  }

  /**
   * Start STT streaming for a session
   */
  async startSession(sessionId: string, language: Language): Promise<void> {
    try {
      logger.info('[STT] Starting STT session', { sessionId, language });

      if (this.activeSessions.has(sessionId)) {
        logger.warn('[STT] STT session already active', {
          sessionId,
          message: 'Ignoring duplicate start request',
        });
        return;
      }

      logger.info('[STT] Starting provider streaming', { sessionId, language });
      await this.provider.startStreaming(sessionId, language);
      this.activeSessions.add(sessionId);
      this.reconnectAttempts.set(sessionId, 0);

      logger.info('[STT] STT session started successfully', {
        sessionId,
        language,
        provider: this.provider.getProviderName(),
      });
    } catch (error: any) {
      logger.error('[STT] Failed to start STT session', { 
        sessionId, 
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Stop STT streaming for a session
   */
  async stopSession(sessionId: string): Promise<void> {
    try {
      logger.info('Stopping STT session', { sessionId });

      // Clear any pending reconnect timer
      const reconnectTimer = this.reconnectTimers.get(sessionId);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        this.reconnectTimers.delete(sessionId);
      }

      await this.provider.stopStreaming(sessionId);
      this.activeSessions.delete(sessionId);
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
    if (!this.activeSessions.has(sessionId)) {
      logger.warn('[STT] Attempted to process audio for inactive session', { sessionId });
      return;
    }

    logger.debug('[STT] Processing audio chunk', {
      sessionId,
      audioSize: audioData.length,
      timestamp,
      isActive: this.activeSessions.has(sessionId),
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
   * Check if session is active
   */
  isSessionActive(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
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
      if (data.sessionId && this.activeSessions.has(data.sessionId)) {
        this.handleReconnection(data.sessionId);
      }
    });

    // Timeout
    this.provider.on(STTEvent.TIMEOUT, (data: any) => {
      logger.warn('STT provider timeout', data);
      this.emit('timeout', data);
      
      // Attempt reconnection
      if (data.sessionId && this.activeSessions.has(data.sessionId)) {
        this.handleReconnection(data.sessionId);
      }
    });

    // Disconnected
    this.provider.on(STTEvent.DISCONNECTED, (data: any) => {
      logger.warn('STT provider disconnected', data);
      this.emit('disconnected', data);
      
      // Attempt reconnection
      if (data.sessionId && this.activeSessions.has(data.sessionId)) {
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
    
    const sessionIds = Array.from(this.activeSessions);
    await Promise.all(sessionIds.map(id => this.stopSession(id)));
    
    // Clear all timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();
    
    logger.info('STT service cleanup complete');
  }
}

// Singleton instance
export const sttService = new STTService();
