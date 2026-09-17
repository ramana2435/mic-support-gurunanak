import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { Language } from '@live-translation/shared';
import {
  ITTSProvider,
  VoiceConfig,
  TTSStreamEvent,
} from './tts-provider.interface';
import logger from '../../utils/logger';

/**
 * Google Cloud Text-to-Speech Provider
 * Supports Telugu and all Indian languages with high-quality voices
 */
export class GoogleTTSProvider implements ITTSProvider {
  private client: TextToSpeechClient;
  private isInitialized = false;

  constructor() {
    try {
      // Initialize Google Cloud TTS client
      // Supports 3 authentication methods:
      // 1. GOOGLE_APPLICATION_CREDENTIALS env var (JSON key file path)
      // 2. Application Default Credentials (ADC) in production
      // 3. Service account key JSON in GOOGLE_CLOUD_KEY_JSON env var
      
      const keyJson = process.env.GOOGLE_CLOUD_KEY_JSON;
      
      if (keyJson) {
        // Use JSON key from environment variable
        const credentials = JSON.parse(keyJson);
        this.client = new TextToSpeechClient({ credentials });
        logger.info('Google TTS initialized with JSON key from environment');
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Use key file path
        this.client = new TextToSpeechClient();
        logger.info('Google TTS initialized with credentials file:', {
          path: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        });
      } else {
        // Use Application Default Credentials (works in GCP, or with gcloud auth)
        this.client = new TextToSpeechClient();
        logger.info('Google TTS initialized with Application Default Credentials');
      }

      this.isInitialized = true;
    } catch (error: any) {
      logger.error('Failed to initialize Google TTS', {
        error: error.message,
        stack: error.stack,
      });
      this.isInitialized = false;
    }
  }

  async *synthesize(
    text: string,
    language: Language,
    voiceConfig: VoiceConfig
  ): AsyncGenerator<TTSStreamEvent> {
    if (!this.isInitialized) {
      yield {
        type: 'error',
        error: 'Google TTS not initialized. Check credentials.',
      };
      return;
    }

    try {
      logger.info('[GoogleTTS] Synthesizing speech', {
        language,
        textLength: text.length,
        text: text.substring(0, 50),
        voice: voiceConfig.voiceId,
      });

      // Build the request
      const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text },
        voice: {
          languageCode: voiceConfig.languageCode,
          name: voiceConfig.voiceId,
          ssmlGender: this.mapGenderToGoogle(voiceConfig.gender),
        },
        audioConfig: {
          audioEncoding: 'LINEAR16', // PCM format
          sampleRateHertz: 24000, // 24kHz for balance of quality/size
          pitch: 0.0,
          speakingRate: 1.0,
        },
      };

      // Call Google Cloud TTS API
      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content in response');
      }

      // Convert audio content to Buffer
      const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

      logger.info('[GoogleTTS] Speech synthesized successfully', {
        language,
        audioSize: audioBuffer.length,
        format: 'LINEAR16',
        sampleRate: 24000,
      });

      // Chunk the audio for streaming (split into ~100ms chunks)
      const chunkSize = 4800; // 24000 Hz * 2 bytes * 0.1s = 4800 bytes per 100ms
      let offset = 0;

      while (offset < audioBuffer.length) {
        const chunk = audioBuffer.slice(offset, offset + chunkSize);
        
        yield {
          type: 'chunk',
          chunk,
        };

        offset += chunkSize;
      }

      // Signal end of audio
      yield {
        type: 'end',
      };

      logger.debug('[GoogleTTS] Audio streaming completed', {
        language,
        totalChunks: Math.ceil(audioBuffer.length / chunkSize),
      });
    } catch (error: any) {
      logger.error('[GoogleTTS] Synthesis failed', {
        error: error.message,
        language,
        text: text.substring(0, 100),
      });

      yield {
        type: 'error',
        error: error.message || 'Google TTS synthesis failed',
      };
    }
  }

  getVoicesForLanguage(language: Language): VoiceConfig[] {
    // Map of supported languages to their best Google Cloud voices
    const voiceMap: Record<Language, VoiceConfig[]> = {
      en: [
        {
          voiceId: 'en-US-Neural2-J', // Male, natural
          languageCode: 'en-US',
          gender: 'male',
          name: 'English (US) - Neural',
        },
        {
          voiceId: 'en-US-Neural2-F', // Female, natural
          languageCode: 'en-US',
          gender: 'female',
          name: 'English (US) - Neural Female',
        },
      ],
      te: [
        {
          voiceId: 'te-IN-Standard-A', // Telugu female
          languageCode: 'te-IN',
          gender: 'female',
          name: 'Telugu (India) - Standard',
        },
        {
          voiceId: 'te-IN-Standard-B', // Telugu male
          languageCode: 'te-IN',
          gender: 'male',
          name: 'Telugu (India) - Standard Male',
        },
      ],
      hi: [
        {
          voiceId: 'hi-IN-Neural2-A', // Hindi female, neural
          languageCode: 'hi-IN',
          gender: 'female',
          name: 'Hindi (India) - Neural',
        },
        {
          voiceId: 'hi-IN-Neural2-C', // Hindi male, neural
          languageCode: 'hi-IN',
          gender: 'male',
          name: 'Hindi (India) - Neural Male',
        },
      ],
      ta: [
        {
          voiceId: 'ta-IN-Standard-A', // Tamil female
          languageCode: 'ta-IN',
          gender: 'female',
          name: 'Tamil (India) - Standard',
        },
        {
          voiceId: 'ta-IN-Standard-B', // Tamil male
          languageCode: 'ta-IN',
          gender: 'male',
          name: 'Tamil (India) - Standard Male',
        },
      ],
      kn: [
        {
          voiceId: 'kn-IN-Standard-A', // Kannada female
          languageCode: 'kn-IN',
          gender: 'female',
          name: 'Kannada (India) - Standard',
        },
        {
          voiceId: 'kn-IN-Standard-B', // Kannada male
          languageCode: 'kn-IN',
          gender: 'male',
          name: 'Kannada (India) - Standard Male',
        },
      ],
      ml: [
        {
          voiceId: 'ml-IN-Standard-A', // Malayalam female
          languageCode: 'ml-IN',
          gender: 'female',
          name: 'Malayalam (India) - Standard',
        },
        {
          voiceId: 'ml-IN-Standard-B', // Malayalam male
          languageCode: 'ml-IN',
          gender: 'male',
          name: 'Malayalam (India) - Standard Male',
        },
      ],
      bn: [
        {
          voiceId: 'bn-IN-Standard-A', // Bengali female
          languageCode: 'bn-IN',
          gender: 'female',
          name: 'Bengali (India) - Standard',
        },
        {
          voiceId: 'bn-IN-Standard-B', // Bengali male
          languageCode: 'bn-IN',
          gender: 'male',
          name: 'Bengali (India) - Standard Male',
        },
      ],
      gu: [
        {
          voiceId: 'gu-IN-Standard-A', // Gujarati female
          languageCode: 'gu-IN',
          gender: 'female',
          name: 'Gujarati (India) - Standard',
        },
        {
          voiceId: 'gu-IN-Standard-B', // Gujarati male
          languageCode: 'gu-IN',
          gender: 'male',
          name: 'Gujarati (India) - Standard Male',
        },
      ],
      mr: [
        {
          voiceId: 'mr-IN-Standard-A', // Marathi female
          languageCode: 'mr-IN',
          gender: 'female',
          name: 'Marathi (India) - Standard',
        },
        {
          voiceId: 'mr-IN-Standard-B', // Marathi male
          languageCode: 'mr-IN',
          gender: 'male',
          name: 'Marathi (India) - Standard Male',
        },
      ],
      pa: [
        {
          voiceId: 'pa-IN-Standard-A', // Punjabi female
          languageCode: 'pa-IN',
          gender: 'female',
          name: 'Punjabi (India) - Standard',
        },
        {
          voiceId: 'pa-IN-Standard-B', // Punjabi male
          languageCode: 'pa-IN',
          gender: 'male',
          name: 'Punjabi (India) - Standard Male',
        },
      ],
    };

    return voiceMap[language] || voiceMap.en; // Default to English if not found
  }

  cancel(): void {
    // Google Cloud TTS doesn't support cancellation mid-synthesis
    // Since we use non-streaming API, synthesis completes before we can cancel
    logger.debug('[GoogleTTS] Cancel requested (not supported for non-streaming)');
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getProviderName(): string {
    return 'Google Cloud Text-to-Speech';
  }

  private mapGenderToGoogle(
    gender: 'male' | 'female' | 'neutral'
  ): protos.google.cloud.texttospeech.v1.SsmlVoiceGender {
    const genderMap: Record<
      string,
      protos.google.cloud.texttospeech.v1.SsmlVoiceGender
    > = {
      male: 'MALE',
      female: 'FEMALE',
      neutral: 'NEUTRAL',
    };

    return genderMap[gender] || 'NEUTRAL';
  }
}
