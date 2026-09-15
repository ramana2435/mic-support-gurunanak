import { EventEmitter } from 'events';
import Groq from 'groq-sdk';
import { Language, STTResult } from '@live-translation/shared';
import { ISTTProvider, STTEvent } from './stt-provider.interface';
import logger from '../../utils/logger';
import { Readable } from 'stream';

/**
 * Groq STT Provider - Real speech-to-text using Groq Whisper API
 */
export class GroqSTTProvider extends EventEmitter implements ISTTProvider {
  private groqClient: Groq;
  private activeSessions: Map<string, SessionSTTState> = new Map();
  private sequenceCounter: Map<string, number> = new Map();
  private processingLocks: Map<string, boolean> = new Map();
  private readonly BUFFER_THRESHOLD = 32000; // ~2 seconds at 16kHz (32KB for processing chunk)
  private readonly MAX_BUFFER_SIZE = 480000; // ~30 seconds max

  constructor(apiKey: string) {
    super();
    this.groqClient = new Groq({ apiKey });
    logger.info('Groq STT Provider initialized');
  }

  async startStreaming(sessionId: string, language: Language): Promise<void> {
    logger.info('[GroqSTT] Starting STT streaming', { sessionId, language });

    if (this.activeSessions.has(sessionId)) {
      logger.warn('[GroqSTT] STT already active for session', { sessionId });
      return;
    }

    const state: SessionSTTState = {
      sessionId,
      language,
      isActive: true,
      buffer: Buffer.alloc(0),
      lastActivityTime: Date.now(),
      lastProcessedTime: Date.now(),
    };

    this.activeSessions.set(sessionId, state);
    this.sequenceCounter.set(sessionId, 0);
    this.processingLocks.set(sessionId, false);

    logger.info('[GroqSTT] Session started', {
      sessionId,
      language,
      bufferThreshold: this.BUFFER_THRESHOLD,
    });

    this.emit(STTEvent.RECONNECTED, { sessionId });
  }

  async stopStreaming(sessionId: string): Promise<void> {
    logger.info('[GroqSTT] Stopping STT streaming', { sessionId });

    const state = this.activeSessions.get(sessionId);
    if (state) {
      state.isActive = false;

      // Process any remaining buffer
      if (state.buffer.length > 0) {
        logger.info('[GroqSTT] Processing remaining buffer on stop', {
          sessionId,
          bufferSize: state.buffer.length,
        });
        await this.processAudioBuffer(sessionId, state.buffer);
      }

      this.activeSessions.delete(sessionId);
      this.sequenceCounter.delete(sessionId);
      this.processingLocks.delete(sessionId);
      logger.info('[GroqSTT] Session stopped', { sessionId });
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

    // Prevent buffer overflow
    if (state.buffer.length > this.MAX_BUFFER_SIZE) {
      logger.warn('[GroqSTT] Buffer size exceeded, processing and resetting', {
        sessionId,
        bufferSize: state.buffer.length,
      });
      await this.processAudioBuffer(sessionId, state.buffer, timestamp);
      state.buffer = Buffer.alloc(0);
      state.lastProcessedTime = Date.now();
      return;
    }

    // Check if we should process (threshold met AND not already processing)
    const timeSinceLastProcess = Date.now() - state.lastProcessedTime;
    const shouldProcess = state.buffer.length >= this.BUFFER_THRESHOLD && timeSinceLastProcess > 1500; // At least 1.5s between processes

    if (shouldProcess && !this.processingLocks.get(sessionId)) {
      await this.processAudioBuffer(sessionId, state.buffer, timestamp);
      state.buffer = Buffer.alloc(0); // Clear buffer after processing
      state.lastProcessedTime = Date.now();
    }
  }

  private async processAudioBuffer(sessionId: string, audioBuffer: Buffer, captureTimestamp: number = Date.now()): Promise<void> {
    const state = this.activeSessions.get(sessionId);
    if (!state || !state.isActive) return;

    // Check processing lock
    if (this.processingLocks.get(sessionId)) {
      logger.debug('[GroqSTT] Already processing, skipping', { sessionId });
      return;
    }

    this.processingLocks.set(sessionId, true);

    try {
      logger.info('[GroqSTT] Processing audio buffer with Groq Whisper', {
        sessionId,
        bufferSize: audioBuffer.length,
        language: state.language,
      });

      // Convert PCM to WAV format (Groq expects audio file)
      const wavBuffer = this.createWavBuffer(audioBuffer);

      // Create a readable stream from buffer
      const audioStream = Readable.from(wavBuffer);

      // Map language codes to Groq-supported language codes
      const groqLanguageCode = this.mapLanguageToGroqCode(state.language);

      // Call Groq Whisper API
      const transcription = await this.groqClient.audio.transcriptions.create({
        file: audioStream as any, // Groq SDK accepts readable stream
        model: 'whisper-large-v3',
        language: groqLanguageCode,
        response_format: 'verbose_json', // Get timestamps and segments
        temperature: 0.0, // More deterministic
      });

      const sttReceiveTimestamp = Date.now();
      const sequenceNumber = this.getNextSequenceNumber(sessionId);

      // Extract text from transcription
      const text = transcription.text?.trim() || '';

      if (!text) {
        logger.debug('[GroqSTT] Empty transcription result', { sessionId });
        this.processingLocks.set(sessionId, false);
        return;
      }

      logger.info('[GroqSTT] Transcription received from Groq', {
        sessionId,
        text: text.substring(0, 100),
        language: groqLanguageCode,
      });

      // Emit final result (Groq Whisper doesn't provide interim results)
      const finalResult: STTResult = {
        sessionId,
        text,
        isFinal: true,
        timestamp: new Date(),
        sequenceNumber,
        confidence: 0.95, // Groq Whisper is high quality
        language: state.language,
      };

      this.emit(STTEvent.FINAL_RESULT, {
        result: finalResult,
        latency: {
          audioCaptureTimestamp: captureTimestamp,
          sttReceiveTimestamp,
          processingTimestamp: Date.now(),
          totalLatency: Date.now() - captureTimestamp,
        },
      });

      logger.info('[GroqSTT] Final STT result emitted', {
        sessionId,
        sequenceNumber,
        textLength: text.length,
        latency: Date.now() - captureTimestamp,
      });
    } catch (error: any) {
      logger.error('[GroqSTT] Transcription failed', {
        sessionId,
        error: error.message,
        stack: error.stack,
      });

      this.emit(STTEvent.ERROR, {
        sessionId,
        error: error.message || 'Transcription failed',
      });
    } finally {
      this.processingLocks.set(sessionId, false);
    }
  }

  private createWavBuffer(pcmData: Buffer): Buffer {
    // PCM is 16-bit signed integers, mono, 16000 Hz
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize;

    const header = Buffer.alloc(44);

    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);

    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Sub-chunk size
    header.writeUInt16LE(1, 20); // Audio format (1 = PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
  }

  private mapLanguageToGroqCode(language: Language): string {
    // Map internal language codes to Groq Whisper language codes
    const languageMap: Record<string, string> = {
      en: 'en', // English
      te: 'te', // Telugu
      hi: 'hi', // Hindi
      ta: 'ta', // Tamil
      kn: 'kn', // Kannada
      ml: 'ml', // Malayalam
      bn: 'bn', // Bengali
      gu: 'gu', // Gujarati
      mr: 'mr', // Marathi
      pa: 'pa', // Punjabi
    };

    return languageMap[language] || 'en'; // Default to English if not found
  }

  private getNextSequenceNumber(sessionId: string): number {
    const current = this.sequenceCounter.get(sessionId) || 0;
    const next = current + 1;
    this.sequenceCounter.set(sessionId, next);
    return next;
  }

  isReady(): boolean {
    return !!this.groqClient;
  }

  getProviderName(): string {
    return 'Groq Whisper STT';
  }
}

interface SessionSTTState {
  sessionId: string;
  language: Language;
  isActive: boolean;
  buffer: Buffer;
  lastActivityTime: number;
  lastProcessedTime: number;
}
