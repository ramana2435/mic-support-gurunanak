import Groq from 'groq-sdk';
import { Language } from '@live-translation/shared';
import {
  ITranslationProvider,
  TranslationResult,
} from './translation-provider.interface';
import logger from '../../utils/logger';

/**
 * Groq Translation Provider - Real translation using Groq LLM
 */
export class GroqTranslationProvider implements ITranslationProvider {
  private groqClient: Groq;
  private translationCache: Map<string, TranslationResult> = new Map();
  private readonly CACHE_TTL = 1800000; // 30 minutes

  constructor(apiKey: string) {
    this.groqClient = new Groq({ apiKey });
    logger.info('Groq Translation Provider initialized');
  }

  async translate(
    text: string,
    sourceLanguage: Language,
    targetLanguage: Language
  ): Promise<TranslationResult> {
    // Check cache first
    const cacheKey = `${text}:${sourceLanguage}:${targetLanguage}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      logger.debug('[GroqTranslation] Cache hit', {
        sourceLanguage,
        targetLanguage,
        textLength: text.length,
      });
      return cached;
    }

    try {
      logger.info('[GroqTranslation] Translating text with Groq', {
        sourceLanguage,
        targetLanguage,
        textLength: text.length,
        text: text.substring(0, 50),
      });

      const targetLanguageName = this.getLanguageName(targetLanguage);
      const sourceLanguageName = this.getLanguageName(sourceLanguage);

      // Use Groq LLM for translation
      const completion = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the text from ${sourceLanguageName} to ${targetLanguageName}. Output ONLY the translated text, nothing else. Maintain the tone, formality, and meaning accurately. Do not add explanations or notes.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        model: 'llama-3.3-70b-versatile', // Fast and high-quality model
        temperature: 0.3, // Low temperature for consistent translations
        max_tokens: 1000,
      });

      const translatedText = completion.choices[0]?.message?.content?.trim() || '';

      if (!translatedText) {
        throw new Error('Empty translation result from Groq');
      }

      logger.info('[GroqTranslation] Translation received from Groq', {
        sourceLanguage,
        targetLanguage,
        originalLength: text.length,
        translatedLength: translatedText.length,
        translatedText: translatedText.substring(0, 50),
      });

      const result: TranslationResult = {
        translatedText,
        sourceLanguage,
        targetLanguage,
        confidence: 0.95, // Groq LLM is high quality
      };

      // Cache result
      this.translationCache.set(cacheKey, result);

      // Clean old cache entries periodically
      if (this.translationCache.size > 1000) {
        this.cleanCache();
      }

      return result;
    } catch (error: any) {
      logger.error('[GroqTranslation] Translation failed', {
        sourceLanguage,
        targetLanguage,
        error: error.message,
        text: text.substring(0, 100),
      });

      // Return original text as fallback
      return {
        translatedText: `[Translation Error] ${text}`,
        sourceLanguage,
        targetLanguage,
        confidence: 0.0,
      };
    }
  }

  async translateBatch(
    text: string,
    sourceLanguage: Language,
    targetLanguages: Language[]
  ): Promise<Map<Language, TranslationResult>> {
    // Process translations in parallel
    const promises = targetLanguages.map(async targetLanguage => {
      const result = await this.translate(text, sourceLanguage, targetLanguage);
      return [targetLanguage, result] as [Language, TranslationResult];
    });

    const results = await Promise.all(promises);
    return new Map(results);
  }

  isReady(): boolean {
    return !!this.groqClient;
  }

  private getLanguageName(language: Language): string {
    const languageNames: Record<string, string> = {
      en: 'English',
      te: 'Telugu',
      hi: 'Hindi',
      ta: 'Tamil',
      kn: 'Kannada',
      ml: 'Malayalam',
      bn: 'Bengali',
      gu: 'Gujarati',
      mr: 'Marathi',
      pa: 'Punjabi',
    };

    return languageNames[language] || 'English';
  }

  private cleanCache(): void {
    // Simple cache cleanup: remove oldest entries
    const entries = Array.from(this.translationCache.entries());
    const toRemove = Math.floor(entries.length / 2);

    for (let i = 0; i < toRemove; i++) {
      this.translationCache.delete(entries[i][0]);
    }

    logger.debug('[GroqTranslation] Cache cleaned', {
      removed: toRemove,
      remaining: this.translationCache.size,
    });
  }

  getProviderName(): string {
    return 'Groq LLM Translation';
  }
}
