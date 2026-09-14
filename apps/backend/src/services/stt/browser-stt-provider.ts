import { EventEmitter } from 'events';
import { Language, STTResult } from '@live-translation/shared';
import { ISTTProvider, STTEvent, STTProviderConfig } from './stt-provider.interface';
import logger from '../../utils/logger';

/**
 * Browser-based STT Provider (for demo/testing)
 * 
 * NOTE: This is a mock provider for backend use. In production, you would:
 * 1. Use Google Speech-to-Text streaming API
 * 2. Use Azure Speech Services
 * 3. Use AWS Transcribe
 * 4. Or other cloud STT service
 * 
 * For this demo, we'll simulate STT behavior on the backend
 * In a real implementation, audio would be sent to cloud STT services
 */
export class BrowserSTTProvider extends EventEmitter implements ISTTProvider {
  private activeSessions: Map<string, SessionSTTState> = new Map();
  private sequenceCounter: Map<string, number> = new Map();

  constructor() {
    super();
    logger.info('BrowserSTTProvider initialized (Mock for demo)');
  }

  async startStreaming(sessionId: string, language: Language): Promise<void> {
    logger.info('Starting STT streaming', { sessionId, language });

    if (this.activeSessions.has(sessionId)) {
      logger.warn('STT already active for session', { sessionId });
      return;
    }

    const state: SessionSTTState = {
      sessionId,
      language,
      isActive: true,
      buffer: Buffer.alloc(0),
      lastActivityTime: Date.now(),
    };

    this.activeSessions.set(sessionId, state);
    this.sequenceCounter.set(sessionId, 0);

    // Simulate connection ready
    setTimeout(() => {
      this.emit(STTEvent.RECONNECTED, { sessionId });
    }, 100);
  }

  async stopStreaming(sessionId: string): Promise<void> {
    logger.info('Stopping STT streaming', { sessionId });

    const state = this.activeSessions.get(sessionId);
    if (state) {
      state.isActive = false;
      this.activeSessions.delete(sessionId);
      this.sequenceCounter.delete(sessionId);
    }
  }

  async sendAudio(sessionId: string, audioData: Buffer, timestamp: number): Promise<void> {
    const state = this.activeSessions.get(sessionId);
    if (!state || !state.isActive) {
      return;
    }

    // Accumulate audio buffer
    state.buffer = Buffer.concat([state.buffer, audioData]);
    state.lastActivityTime = Date.now();

    // Simulate STT processing
    // In real implementation, send audioData to cloud STT service
    
    // For demo purposes, we'll emit mock transcripts
    // In production, this would be replaced with actual STT service responses
    this.simulateSTTProcessing(sessionId, timestamp);
  }

  isReady(): boolean {
    return true;
  }

  getProviderName(): string {
    return 'BrowserSTTProvider (Mock)';
  }

  /**
   * Simulate STT processing for demo
   * In production, replace with actual cloud STT service
   */
  private simulateSTTProcessing(sessionId: string, audioCaptureTimestamp: number): void {
    const state = this.activeSessions.get(sessionId);
    if (!state) return;

    // Check if enough audio has been accumulated (simulate processing threshold)
    if (state.buffer.length < 8000) {
      // Not enough audio yet
      return;
    }

    // Simulate STT latency (50-200ms typical for cloud services)
    const simulatedLatency = 50 + Math.random() * 150;

    setTimeout(() => {
      const sttReceiveTimestamp = Date.now();
      const sequenceNumber = this.getNextSequenceNumber(sessionId);

      // Emit interim result (simulate partial transcript)
      const interimResult: STTResult = {
        sessionId,
        text: this.generateMockTranscript(false),
        isFinal: false,
        timestamp: new Date(),
        sequenceNumber,
        confidence: 0.85 + Math.random() * 0.1,
        language: state.language,
      };

      this.emit(STTEvent.INTERIM_RESULT, {
        result: interimResult,
        latency: {
          audioCaptureTimestamp,
          sttReceiveTimestamp,
          processingTimestamp: Date.now(),
          totalLatency: Date.now() - audioCaptureTimestamp,
        },
      });

      // After a short delay, emit final result
      setTimeout(() => {
        const finalResult: STTResult = {
          sessionId,
          text: this.generateMockTranscript(true),
          isFinal: true,
          timestamp: new Date(),
          sequenceNumber: sequenceNumber + 1,
          confidence: 0.92 + Math.random() * 0.05,
          language: state.language,
        };

        this.emit(STTEvent.FINAL_RESULT, {
          result: finalResult,
          latency: {
            audioCaptureTimestamp,
            sttReceiveTimestamp,
            processingTimestamp: Date.now(),
            totalLatency: Date.now() - audioCaptureTimestamp,
          },
        });

        // Clear buffer after processing
        state.buffer = Buffer.alloc(0);
      }, 200);
    }, simulatedLatency);
  }

  private generateMockTranscript(isFinal: boolean): string {
    const phrases = [
      'Hello everyone, welcome to today\'s lecture',
      'Let\'s discuss the main topic',
      'This is an important concept',
      'Please take notes',
      'Any questions so far',
      'Moving on to the next section',
      'Remember this for the exam',
      'Let me explain this in detail',
    ];

    const text = phrases[Math.floor(Math.random() * phrases.length)];
    return isFinal ? text + '.' : text.substring(0, Math.floor(text.length * 0.7)) + '...';
  }

  private getNextSequenceNumber(sessionId: string): number {
    const current = this.sequenceCounter.get(sessionId) || 0;
    const next = current + 1;
    this.sequenceCounter.set(sessionId, next);
    return next;
  }
}

interface SessionSTTState {
  sessionId: string;
  language: Language;
  isActive: boolean;
  buffer: Buffer;
  lastActivityTime: number;
}
