import { Language } from '@live-translation/shared';

/**
 * TTS Result with audio chunks
 */
export interface TTSResult {
  audioChunks: Buffer[]; // Array of audio chunks for streaming
  sampleRate: number;
  format: string; // 'pcm', 'mp3', 'opus', etc.
  duration: number; // Duration in milliseconds
  voiceId?: string;
}

/**
 * TTS Stream Event
 */
export interface TTSStreamEvent {
  type: 'chunk' | 'end' | 'error';
  chunk?: Buffer;
  error?: string;
}

/**
 * Voice configuration for a language
 */
export interface VoiceConfig {
  language: Language;
  voiceId: string;
  voiceName: string;
  gender: 'male' | 'female' | 'neutral';
  provider: string;
}

/**
 * TTS Provider Interface
 * Abstracts different TTS services (Google, Azure, AWS, Mock)
 */
export interface ITTSProvider {
  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Synthesize text to speech (streaming)
   * Returns audio chunks as they become available
   */
  synthesize(
    text: string,
    language: Language,
    voiceConfig?: VoiceConfig
  ): AsyncGenerator<TTSStreamEvent, void, unknown>;

  /**
   * Get available voices for a language
   */
  getVoicesForLanguage(language: Language): VoiceConfig[];

  /**
   * Cancel ongoing synthesis
   */
  cancel(): void;
}

/**
 * TTS Latency Metrics
 */
export interface TTSLatencyMetrics {
  translationResultTimestamp: number;
  ttsStartTimestamp: number;
  firstAudioChunkTimestamp: number;
  audioDeliveryTimestamp: number;
  ttsLatency: number; // Start to first chunk
  totalLatency: number; // Translation result to audio delivery
}
