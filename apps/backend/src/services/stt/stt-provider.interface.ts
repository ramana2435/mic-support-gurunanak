import { Language, STTResult } from '@live-translation/shared';
import { EventEmitter } from 'events';

/**
 * Abstract interface for STT providers
 * Allows switching between different STT services (Web Speech API, Google, Azure, etc.)
 */
export interface ISTTProvider extends EventEmitter {
  /**
   * Start streaming STT for a session
   * @param sessionId - Unique session identifier
   * @param language - Language code for recognition
   */
  startStreaming(sessionId: string, language: Language): Promise<void>;

  /**
   * Stop streaming STT for a session
   * @param sessionId - Session identifier
   */
  stopStreaming(sessionId: string): Promise<void>;

  /**
   * Send audio data for processing
   * @param sessionId - Session identifier
   * @param audioData - Audio buffer to process
   * @param timestamp - Audio capture timestamp for latency tracking
   */
  sendAudio(sessionId: string, audioData: Buffer, timestamp: number): Promise<void>;

  /**
   * Check if provider is ready
   */
  isReady(): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string;
}

/**
 * STT Events
 */
export enum STTEvent {
  INTERIM_RESULT = 'interim',
  FINAL_RESULT = 'final',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  DISCONNECTED = 'disconnected',
  RECONNECTED = 'reconnected',
}

/**
 * STT Provider Configuration
 */
export interface STTProviderConfig {
  language: Language;
  interimResults: boolean;
  maxAlternatives?: number;
  profanityFilter?: boolean;
  enableAutomaticPunctuation?: boolean;
  model?: string;
}
