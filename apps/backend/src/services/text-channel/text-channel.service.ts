import { EventEmitter } from 'events';
import { Language, TranslationResultPayload } from '@live-translation/shared';
import logger from '../../utils/logger';

/**
 * Text Message for persistence and recovery
 */
export interface TextMessage {
  id: string;
  sessionId: string;
  sequenceNumber: number;
  text: string;
  translatedText: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  timestamp: Date;
  isFinal: boolean;
  confidence?: number;
  latency?: any;
}

/**
 * Text Channel Service
 * Manages persistent text delivery with reconnection recovery
 * CRITICAL: Text must continue working even if audio/TTS fails
 * MODULE 11: Optimized - DB operations moved to background
 */
export class TextChannelService extends EventEmitter {
  // Message buffer per session and language (in-memory for speed)
  // Key: "{sessionId}:{targetLanguage}"
  // Value: Ordered array of messages
  private messageBuffers: Map<string, TextMessage[]> = new Map();

  // Maximum messages to keep per session-language buffer (MODULE 11: Reduced)
  private readonly MAX_BUFFER_SIZE = 50; // Reduced from 100 for lower memory

  // Message retention time (MODULE 11: Reduced)
  private readonly MESSAGE_RETENTION_MS = 1800000; // 30 minutes (reduced from 1 hour)

  // Track last sent sequence number per student (in-memory, no DB)
  // Key: studentId, Value: sequenceNumber
  private studentSequenceTracking: Map<string, number> = new Map();

  constructor() {
    super();
    
    // Periodic cleanup of old messages
    setInterval(() => {
      this.cleanupOldMessages();
    }, 60000); // Every minute

    logger.info('Text Channel Service initialized');
  }

  /**
   * Store a translation message for potential recovery (MODULE 11: In-memory only)
   */
  storeMessage(payload: TranslationResultPayload): void {
    const message: TextMessage = {
      id: `${payload.sessionId}:${payload.targetLanguage}:${payload.sequenceNumber}`,
      sessionId: payload.sessionId,
      sequenceNumber: payload.sequenceNumber,
      text: payload.text,
      translatedText: payload.translatedText,
      sourceLanguage: payload.sourceLanguage,
      targetLanguage: payload.targetLanguage,
      timestamp: new Date(payload.timestamp),
      isFinal: payload.isFinal,
      confidence: payload.confidence,
      latency: payload.latency,
    };

    const bufferKey = this.getBufferKey(payload.sessionId, payload.targetLanguage);
    let buffer = this.messageBuffers.get(bufferKey);

    if (!buffer) {
      buffer = [];
      this.messageBuffers.set(bufferKey, buffer);
    }

    // Add message in order
    const insertIndex = buffer.findIndex(m => m.sequenceNumber > payload.sequenceNumber);
    if (insertIndex === -1) {
      buffer.push(message);
    } else {
      buffer.splice(insertIndex, 0, message);
    }

    // Trim buffer if too large
    if (buffer.length > this.MAX_BUFFER_SIZE) {
      buffer.splice(0, buffer.length - this.MAX_BUFFER_SIZE);
    }

    logger.debug('Message stored in buffer', {
      sessionId: payload.sessionId,
      targetLanguage: payload.targetLanguage,
      sequenceNumber: payload.sequenceNumber,
      bufferSize: buffer.length,
    });
  }

  /**
   * Get missed messages for a student after reconnection
   * Returns messages with sequenceNumber > lastReceivedSequence
   */
  getMissedMessages(
    sessionId: string,
    targetLanguage: Language,
    lastReceivedSequence: number
  ): TextMessage[] {
    const bufferKey = this.getBufferKey(sessionId, targetLanguage);
    const buffer = this.messageBuffers.get(bufferKey);

    if (!buffer || buffer.length === 0) {
      return [];
    }

    // Get only final messages that are newer than last received
    const missedMessages = buffer.filter(
      msg => msg.isFinal && msg.sequenceNumber > lastReceivedSequence
    );

    logger.info('Retrieved missed messages', {
      sessionId,
      targetLanguage,
      lastReceivedSequence,
      missedCount: missedMessages.length,
    });

    return missedMessages;
  }

  /**
   * Track what sequence number a student has received
   */
  updateStudentSequence(studentId: string, sequenceNumber: number): void {
    const current = this.studentSequenceTracking.get(studentId) || 0;
    if (sequenceNumber > current) {
      this.studentSequenceTracking.set(studentId, sequenceNumber);
    }
  }

  /**
   * Get last received sequence for a student
   */
  getStudentLastSequence(studentId: string): number {
    return this.studentSequenceTracking.get(studentId) || 0;
  }

  /**
   * Clear student tracking on disconnect (after grace period)
   */
  clearStudentTracking(studentId: string): void {
    this.studentSequenceTracking.delete(studentId);
    logger.debug('Cleared student sequence tracking', { studentId });
  }

  /**
   * Clear all messages for a session
   */
  clearSession(sessionId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.messageBuffers.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.messageBuffers.delete(key));

    logger.info('Cleared session messages', { 
      sessionId, 
      buffersCleared: keysToDelete.length 
    });
  }

  /**
   * Get buffer statistics for monitoring
   */
  getBufferStats(): BufferStats {
    let totalMessages = 0;
    let totalBuffers = this.messageBuffers.size;

    for (const buffer of this.messageBuffers.values()) {
      totalMessages += buffer.length;
    }

    return {
      totalBuffers,
      totalMessages,
      trackedStudents: this.studentSequenceTracking.size,
    };
  }

  /**
   * Get buffer key
   */
  private getBufferKey(sessionId: string, targetLanguage: Language): string {
    return `${sessionId}:${targetLanguage}`;
  }

  /**
   * Cleanup old messages
   */
  private cleanupOldMessages(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, buffer] of this.messageBuffers.entries()) {
      const before = buffer.length;
      
      // Remove messages older than retention time
      const filtered = buffer.filter(
        msg => now - msg.timestamp.getTime() < this.MESSAGE_RETENTION_MS
      );

      if (filtered.length !== before) {
        this.messageBuffers.set(key, filtered);
        cleaned += before - filtered.length;
      }

      // Remove empty buffers
      if (filtered.length === 0) {
        this.messageBuffers.delete(key);
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned old messages', { count: cleaned });
    }
  }
}

/**
 * Buffer statistics
 */
interface BufferStats {
  totalBuffers: number;
  totalMessages: number;
  trackedStudents: number;
}

// Singleton instance
export const textChannelService = new TextChannelService();
