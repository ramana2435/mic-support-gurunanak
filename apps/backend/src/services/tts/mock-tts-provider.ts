import { Language } from '@live-translation/shared';
import {
  ITTSProvider,
  TTSStreamEvent,
  VoiceConfig,
} from './tts-provider.interface';
import logger from '../../utils/logger';

/**
 * Mock TTS Provider
 * Simulates TTS with realistic latency for testing
 */
export class MockTTSProvider implements ITTSProvider {
  private cancelled = false;

  // Voice configurations for supported languages
  private readonly VOICE_CONFIGS: Record<Language, VoiceConfig> = {
    // Indian Languages
    [Language.ENGLISH]: {
      language: Language.ENGLISH,
      voiceId: 'en-US-mock',
      voiceName: 'English (US) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.HINDI]: {
      language: Language.HINDI,
      voiceId: 'hi-IN-mock',
      voiceName: 'Hindi (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.TELUGU]: {
      language: Language.TELUGU,
      voiceId: 'te-IN-mock',
      voiceName: 'Telugu (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.TAMIL]: {
      language: Language.TAMIL,
      voiceId: 'ta-IN-mock',
      voiceName: 'Tamil (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.KANNADA]: {
      language: Language.KANNADA,
      voiceId: 'kn-IN-mock',
      voiceName: 'Kannada (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.MALAYALAM]: {
      language: Language.MALAYALAM,
      voiceId: 'ml-IN-mock',
      voiceName: 'Malayalam (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.BENGALI]: {
      language: Language.BENGALI,
      voiceId: 'bn-IN-mock',
      voiceName: 'Bengali (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.MARATHI]: {
      language: Language.MARATHI,
      voiceId: 'mr-IN-mock',
      voiceName: 'Marathi (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.GUJARATI]: {
      language: Language.GUJARATI,
      voiceId: 'gu-IN-mock',
      voiceName: 'Gujarati (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.PUNJABI]: {
      language: Language.PUNJABI,
      voiceId: 'pa-IN-mock',
      voiceName: 'Punjabi (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.URDU]: {
      language: Language.URDU,
      voiceId: 'ur-IN-mock',
      voiceName: 'Urdu (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.ODIA]: {
      language: Language.ODIA,
      voiceId: 'or-IN-mock',
      voiceName: 'Odia (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.ASSAMESE]: {
      language: Language.ASSAMESE,
      voiceId: 'as-IN-mock',
      voiceName: 'Assamese (India) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    // International Languages
    [Language.SPANISH]: {
      language: Language.SPANISH,
      voiceId: 'es-ES-mock',
      voiceName: 'Spanish (Spain) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.FRENCH]: {
      language: Language.FRENCH,
      voiceId: 'fr-FR-mock',
      voiceName: 'French (France) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.GERMAN]: {
      language: Language.GERMAN,
      voiceId: 'de-DE-mock',
      voiceName: 'German (Germany) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.CHINESE]: {
      language: Language.CHINESE,
      voiceId: 'zh-CN-mock',
      voiceName: 'Chinese (Mandarin) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.JAPANESE]: {
      language: Language.JAPANESE,
      voiceId: 'ja-JP-mock',
      voiceName: 'Japanese (Japan) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.KOREAN]: {
      language: Language.KOREAN,
      voiceId: 'ko-KR-mock',
      voiceName: 'Korean (Korea) - Mock',
      gender: 'female',
      provider: 'mock',
    },
    [Language.ARABIC]: {
      language: Language.ARABIC,
      voiceId: 'ar-SA-mock',
      voiceName: 'Arabic (Saudi) - Mock',
      gender: 'female',
      provider: 'mock',
    },
  };

  getProviderName(): string {
    return 'Mock TTS Provider';
  }

  async *synthesize(
    text: string,
    language: Language,
    voiceConfig?: VoiceConfig
  ): AsyncGenerator<TTSStreamEvent, void, unknown> {
    this.cancelled = false;

    try {
      logger.debug('Mock TTS synthesis started', {
        text: text.substring(0, 50),
        language,
        voiceId: voiceConfig?.voiceId,
      });

      // Simulate TTS processing time (200-400ms)
      const processingTime = 200 + Math.random() * 200;
      await this.sleep(processingTime);

      if (this.cancelled) {
        logger.debug('Mock TTS synthesis cancelled');
        return;
      }

      // Calculate how many chunks we need based on text length
      // Simulate ~3 chunks per second of audio
      const estimatedDuration = Math.max(1000, text.length * 50); // 50ms per character
      const chunkCount = Math.ceil(estimatedDuration / 300); // 300ms per chunk

      // Generate audio chunks
      for (let i = 0; i < chunkCount; i++) {
        if (this.cancelled) {
          logger.debug('Mock TTS synthesis cancelled during streaming');
          return;
        }

        // Generate mock audio chunk (sine wave PCM data)
        const chunkSize = 4800; // 100ms at 48kHz, 16-bit mono
        const audioChunk = this.generateMockAudioChunk(chunkSize, i);

        // Simulate streaming delay
        if (i > 0) {
          await this.sleep(50 + Math.random() * 50); // 50-100ms between chunks
        }

        yield {
          type: 'chunk',
          chunk: audioChunk,
        };

        logger.debug('Mock TTS chunk generated', {
          chunkIndex: i,
          chunkSize: audioChunk.length,
        });
      }

      // Send end event
      yield {
        type: 'end',
      };

      logger.debug('Mock TTS synthesis completed', {
        text: text.substring(0, 50),
        chunkCount,
      });
    } catch (error: any) {
      logger.error('Mock TTS synthesis failed', {
        error: error.message,
        text: text.substring(0, 50),
      });

      yield {
        type: 'error',
        error: error.message,
      };
    }
  }

  getVoicesForLanguage(language: Language): VoiceConfig[] {
    const voice = this.VOICE_CONFIGS[language];
    return voice ? [voice] : [];
  }

  cancel(): void {
    this.cancelled = true;
    logger.debug('Mock TTS cancellation requested');
  }

  /**
   * Generate mock audio chunk (sine wave)
   */
  private generateMockAudioChunk(size: number, chunkIndex: number): Buffer {
    const buffer = Buffer.alloc(size);
    const frequency = 440 + (chunkIndex % 12) * 50; // Vary frequency slightly
    const sampleRate = 48000;

    for (let i = 0; i < size / 2; i++) {
      const t = i / sampleRate;
      const value = Math.sin(2 * Math.PI * frequency * t) * 16000; // 16-bit PCM
      const sample = Math.floor(value);

      // Write 16-bit little-endian PCM
      buffer.writeInt16LE(sample, i * 2);
    }

    return buffer;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
