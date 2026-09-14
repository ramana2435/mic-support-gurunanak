import { EventEmitter } from 'events';
import logger from '../../utils/logger';

/**
 * Latency Measurement Points
 * T0 = Speaker audio captured (client timestamp)
 * T1 = STT partial/final result (server timestamp)
 * T2 = Translation result (server timestamp)
 * T3 = TTS first audio chunk (server timestamp)
 * T4 = Audio reaches student device (client timestamp)
 * T5 = Student playback begins (client timestamp)
 */
export interface LatencyTimestamps {
  t0_audioCaptured?: number;
  t1_sttResult?: number;
  t2_translationResult?: number;
  t3_ttsFirstChunk?: number;
  t4_audioDelivered?: number;
  t5_playbackStarted?: number;
}

/**
 * Calculated Latencies
 */
export interface CalculatedLatencies {
  sttLatency: number;           // T1 - T0
  translationLatency: number;   // T2 - T1
  ttsLatency: number;           // T3 - T2
  audioDeliveryLatency: number; // T4 - T3
  playbackLatency: number;      // T5 - T4
  totalLatency: number;         // T5 - T0
  textDeliveryLatency: number;  // T2 - T0 (important: text should be fast!)
}

/**
 * Latency Sample
 */
export interface LatencySample {
  sessionId: string;
  sequenceNumber: number;
  targetLanguage?: string;
  timestamps: LatencyTimestamps;
  latencies: Partial<CalculatedLatencies>;
  recordedAt: Date;
}

/**
 * Latency Statistics
 */
export interface LatencyStats {
  component: string;
  samples: number;
  average: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

/**
 * Aggregated Latency Report
 */
export interface LatencyReport {
  sessionId: string;
  sampleCount: number;
  duration: number; // milliseconds
  stt: LatencyStats;
  translation: LatencyStats;
  tts: LatencyStats;
  audioDelivery: LatencyStats;
  textDelivery: LatencyStats;
  totalEndToEnd: LatencyStats;
  recentSamples: LatencySample[];
}

/**
 * Latency Telemetry Service
 * MODULE 11: Comprehensive latency tracking and analysis
 */
export class LatencyTelemetryService extends EventEmitter {
  // Store samples per session
  private samples: Map<string, LatencySample[]> = new Map();
  
  // In-flight measurements (by sessionId:sequenceNumber)
  private inflightMeasurements: Map<string, LatencyTimestamps> = new Map();
  
  // Configuration
  private readonly MAX_SAMPLES_PER_SESSION = 1000;
  private readonly SAMPLE_RETENTION_MS = 3600000; // 1 hour
  
  // Performance targets (for alerting)
  private readonly TARGET_TEXT_LATENCY_MS = 500;   // Text should be < 500ms
  private readonly TARGET_TOTAL_LATENCY_MS = 1000; // Total should be ~1s
  private readonly WARNING_TOTAL_LATENCY_MS = 2000; // Warning if > 2s

  constructor() {
    super();
    
    // Periodic cleanup
    setInterval(() => {
      this.cleanupOldSamples();
    }, 60000); // Every minute
    
    logger.info('Latency Telemetry Service initialized');
  }

  /**
   * Record T0: Audio captured at client
   */
  recordAudioCaptured(sessionId: string, sequenceNumber: number, timestamp: number): void {
    const key = this.getKey(sessionId, sequenceNumber);
    let timestamps = this.inflightMeasurements.get(key);
    
    if (!timestamps) {
      timestamps = {};
      this.inflightMeasurements.set(key, timestamps);
    }
    
    timestamps.t0_audioCaptured = timestamp;
    
    logger.debug('T0: Audio captured', { sessionId, sequenceNumber, timestamp });
  }

  /**
   * Record T1: STT result
   */
  recordSTTResult(sessionId: string, sequenceNumber: number, timestamp?: number): void {
    const key = this.getKey(sessionId, sequenceNumber);
    let timestamps = this.inflightMeasurements.get(key);
    
    if (!timestamps) {
      timestamps = {};
      this.inflightMeasurements.set(key, timestamps);
    }
    
    timestamps.t1_sttResult = timestamp || Date.now();
    
    // Calculate STT latency if T0 exists
    if (timestamps.t0_audioCaptured) {
      const sttLatency = timestamps.t1_sttResult - timestamps.t0_audioCaptured;
      logger.debug('T1: STT result', { sessionId, sequenceNumber, sttLatency });
      
      // Emit real-time event
      this.emit('latency:stt', {
        sessionId,
        sequenceNumber,
        latency: sttLatency,
      });
    }
  }

  /**
   * Record T2: Translation result
   */
  recordTranslationResult(
    sessionId: string,
    sequenceNumber: number,
    targetLanguage: string,
    timestamp?: number
  ): void {
    const key = this.getKey(sessionId, sequenceNumber, targetLanguage);
    let timestamps = this.inflightMeasurements.get(key);
    
    if (!timestamps) {
      // Try without language key (for shared measurements)
      const baseKey = this.getKey(sessionId, sequenceNumber);
      timestamps = this.inflightMeasurements.get(baseKey);
      
      if (timestamps) {
        // Clone for language-specific tracking
        timestamps = { ...timestamps };
        this.inflightMeasurements.set(key, timestamps);
      } else {
        timestamps = {};
        this.inflightMeasurements.set(key, timestamps);
      }
    }
    
    timestamps.t2_translationResult = timestamp || Date.now();
    
    // Calculate translation latency if T1 exists
    if (timestamps.t1_sttResult) {
      const translationLatency = timestamps.t2_translationResult - timestamps.t1_sttResult;
      logger.debug('T2: Translation result', { 
        sessionId, 
        sequenceNumber, 
        targetLanguage,
        translationLatency 
      });
      
      // Calculate text delivery latency (T2 - T0)
      if (timestamps.t0_audioCaptured) {
        const textDeliveryLatency = timestamps.t2_translationResult - timestamps.t0_audioCaptured;
        
        // Alert if text is too slow
        if (textDeliveryLatency > this.TARGET_TEXT_LATENCY_MS) {
          logger.warn('Slow text delivery detected', {
            sessionId,
            sequenceNumber,
            targetLanguage,
            textDeliveryLatency,
            target: this.TARGET_TEXT_LATENCY_MS,
          });
        }
        
        // Emit real-time event
        this.emit('latency:translation', {
          sessionId,
          sequenceNumber,
          targetLanguage,
          latency: translationLatency,
          textDeliveryLatency,
        });
      }
    }
  }

  /**
   * Record T3: TTS first audio chunk
   */
  recordTTSFirstChunk(
    sessionId: string,
    sequenceNumber: number,
    targetLanguage: string,
    timestamp?: number
  ): void {
    const key = this.getKey(sessionId, sequenceNumber, targetLanguage);
    let timestamps = this.inflightMeasurements.get(key);
    
    if (!timestamps) {
      timestamps = {};
      this.inflightMeasurements.set(key, timestamps);
    }
    
    timestamps.t3_ttsFirstChunk = timestamp || Date.now();
    
    // Calculate TTS latency if T2 exists
    if (timestamps.t2_translationResult) {
      const ttsLatency = timestamps.t3_ttsFirstChunk - timestamps.t2_translationResult;
      logger.debug('T3: TTS first chunk', { 
        sessionId, 
        sequenceNumber, 
        targetLanguage,
        ttsLatency 
      });
      
      // Emit real-time event
      this.emit('latency:tts', {
        sessionId,
        sequenceNumber,
        targetLanguage,
        latency: ttsLatency,
      });
    }
  }

  /**
   * Record T4: Audio delivered to client
   */
  recordAudioDelivered(
    sessionId: string,
    sequenceNumber: number,
    targetLanguage: string,
    timestamp: number
  ): void {
    const key = this.getKey(sessionId, sequenceNumber, targetLanguage);
    let timestamps = this.inflightMeasurements.get(key);
    
    if (!timestamps) {
      timestamps = {};
      this.inflightMeasurements.set(key, timestamps);
    }
    
    timestamps.t4_audioDelivered = timestamp;
    
    // Calculate audio delivery latency if T3 exists
    if (timestamps.t3_ttsFirstChunk) {
      const audioDeliveryLatency = timestamps.t4_audioDelivered - timestamps.t3_ttsFirstChunk;
      logger.debug('T4: Audio delivered', { 
        sessionId, 
        sequenceNumber, 
        targetLanguage,
        audioDeliveryLatency 
      });
    }
  }

  /**
   * Record T5: Playback started at client
   */
  recordPlaybackStarted(
    sessionId: string,
    sequenceNumber: number,
    targetLanguage: string,
    timestamp: number
  ): void {
    const key = this.getKey(sessionId, sequenceNumber, targetLanguage);
    let timestamps = this.inflightMeasurements.get(key);
    
    if (!timestamps) {
      logger.warn('Playback recorded without prior measurements', {
        sessionId,
        sequenceNumber,
        targetLanguage,
      });
      return;
    }
    
    timestamps.t5_playbackStarted = timestamp;
    
    // Calculate all latencies and create sample
    const latencies = this.calculateLatencies(timestamps);
    
    const sample: LatencySample = {
      sessionId,
      sequenceNumber,
      targetLanguage,
      timestamps,
      latencies,
      recordedAt: new Date(),
    };
    
    // Store sample
    this.storeSample(sample);
    
    // Log complete measurement
    logger.info('T5: Playback started - Complete latency measurement', {
      sessionId,
      sequenceNumber,
      targetLanguage,
      latencies,
    });
    
    // Alert if total latency is high
    if (latencies.totalLatency && latencies.totalLatency > this.WARNING_TOTAL_LATENCY_MS) {
      logger.warn('High total latency detected', {
        sessionId,
        sequenceNumber,
        targetLanguage,
        totalLatency: latencies.totalLatency,
        warning: this.WARNING_TOTAL_LATENCY_MS,
      });
      
      this.emit('latency:warning', {
        sessionId,
        sequenceNumber,
        targetLanguage,
        totalLatency: latencies.totalLatency,
      });
    }
    
    // Emit complete measurement
    this.emit('latency:complete', sample);
    
    // Cleanup in-flight measurement
    this.inflightMeasurements.delete(key);
  }

  /**
   * Calculate latencies from timestamps
   */
  private calculateLatencies(timestamps: LatencyTimestamps): Partial<CalculatedLatencies> {
    const latencies: Partial<CalculatedLatencies> = {};
    
    if (timestamps.t0_audioCaptured && timestamps.t1_sttResult) {
      latencies.sttLatency = timestamps.t1_sttResult - timestamps.t0_audioCaptured;
    }
    
    if (timestamps.t1_sttResult && timestamps.t2_translationResult) {
      latencies.translationLatency = timestamps.t2_translationResult - timestamps.t1_sttResult;
    }
    
    if (timestamps.t2_translationResult && timestamps.t3_ttsFirstChunk) {
      latencies.ttsLatency = timestamps.t3_ttsFirstChunk - timestamps.t2_translationResult;
    }
    
    if (timestamps.t3_ttsFirstChunk && timestamps.t4_audioDelivered) {
      latencies.audioDeliveryLatency = timestamps.t4_audioDelivered - timestamps.t3_ttsFirstChunk;
    }
    
    if (timestamps.t4_audioDelivered && timestamps.t5_playbackStarted) {
      latencies.playbackLatency = timestamps.t5_playbackStarted - timestamps.t4_audioDelivered;
    }
    
    if (timestamps.t0_audioCaptured && timestamps.t5_playbackStarted) {
      latencies.totalLatency = timestamps.t5_playbackStarted - timestamps.t0_audioCaptured;
    }
    
    if (timestamps.t0_audioCaptured && timestamps.t2_translationResult) {
      latencies.textDeliveryLatency = timestamps.t2_translationResult - timestamps.t0_audioCaptured;
    }
    
    return latencies;
  }

  /**
   * Store sample
   */
  private storeSample(sample: LatencySample): void {
    let samples = this.samples.get(sample.sessionId);
    
    if (!samples) {
      samples = [];
      this.samples.set(sample.sessionId, samples);
    }
    
    samples.push(sample);
    
    // Trim if too large
    if (samples.length > this.MAX_SAMPLES_PER_SESSION) {
      samples.shift();
    }
  }

  /**
   * Get latency report for session
   */
  getLatencyReport(sessionId: string, recentCount: number = 10): LatencyReport | null {
    const samples = this.samples.get(sessionId);
    
    if (!samples || samples.length === 0) {
      return null;
    }
    
    const duration = samples.length > 1
      ? samples[samples.length - 1].recordedAt.getTime() - samples[0].recordedAt.getTime()
      : 0;
    
    return {
      sessionId,
      sampleCount: samples.length,
      duration,
      stt: this.calculateStats('STT', samples, 'sttLatency'),
      translation: this.calculateStats('Translation', samples, 'translationLatency'),
      tts: this.calculateStats('TTS', samples, 'ttsLatency'),
      audioDelivery: this.calculateStats('Audio Delivery', samples, 'audioDeliveryLatency'),
      textDelivery: this.calculateStats('Text Delivery', samples, 'textDeliveryLatency'),
      totalEndToEnd: this.calculateStats('Total E2E', samples, 'totalLatency'),
      recentSamples: samples.slice(-recentCount),
    };
  }

  /**
   * Calculate statistics for a latency component
   */
  private calculateStats(
    component: string,
    samples: LatencySample[],
    field: keyof CalculatedLatencies
  ): LatencyStats {
    const values = samples
      .map(s => s.latencies[field])
      .filter(v => v !== undefined) as number[];
    
    if (values.length === 0) {
      return {
        component,
        samples: 0,
        average: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
      };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      component,
      samples: values.length,
      average: sum / values.length,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get key for in-flight measurements
   */
  private getKey(sessionId: string, sequenceNumber: number, language?: string): string {
    return language
      ? `${sessionId}:${sequenceNumber}:${language}`
      : `${sessionId}:${sequenceNumber}`;
  }

  /**
   * Cleanup old samples
   */
  private cleanupOldSamples(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, samples] of this.samples.entries()) {
      const filtered = samples.filter(
        s => now - s.recordedAt.getTime() < this.SAMPLE_RETENTION_MS
      );
      
      if (filtered.length === 0) {
        this.samples.delete(sessionId);
        cleaned++;
      } else if (filtered.length !== samples.length) {
        this.samples.set(sessionId, filtered);
      }
    }
    
    if (cleaned > 0) {
      logger.info('Cleaned up old latency samples', { sessions: cleaned });
    }
  }

  /**
   * Clear session data
   */
  clearSession(sessionId: string): void {
    this.samples.delete(sessionId);
    
    // Clear in-flight measurements
    const keysToDelete: string[] = [];
    for (const key of this.inflightMeasurements.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(k => this.inflightMeasurements.delete(k));
    
    logger.info('Cleared latency telemetry for session', { sessionId });
  }

  /**
   * Get all session IDs with samples
   */
  getSessionIds(): string[] {
    return Array.from(this.samples.keys());
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.samples.clear();
    this.inflightMeasurements.clear();
    logger.info('Latency telemetry service cleanup complete');
  }
}

// Singleton instance
export const latencyTelemetry = new LatencyTelemetryService();
