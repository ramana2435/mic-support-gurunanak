import { Language } from '@live-translation/shared';
import {
  ITranslationProvider,
  TranslationResult,
} from './translation-provider.interface';
import logger from '../../utils/logger';

/**
 * Mock Translation Provider (for demo/testing)
 * 
 * In production, replace with:
 * - Google Cloud Translation API
 * - Azure Translator
 * - AWS Translate
 * - DeepL API
 */
export class MockTranslationProvider implements ITranslationProvider {
  private translationCache: Map<string, TranslationResult> = new Map();

  constructor() {
    logger.info('MockTranslationProvider initialized');
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
      logger.debug('Translation cache hit', { cacheKey });
      return cached;
    }

    // Simulate translation latency (50-150ms typical for cloud services)
    const latency = 50 + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, latency));

    // Generate mock translation
    const result: TranslationResult = {
      translatedText: this.mockTranslate(text, targetLanguage),
      sourceLanguage,
      targetLanguage,
      confidence: 0.92 + Math.random() * 0.07,
    };

    // Cache result
    this.translationCache.set(cacheKey, result);

    logger.debug('Translation completed', {
      sourceLanguage,
      targetLanguage,
      latency,
    });

    return result;
  }

  async translateBatch(
    text: string,
    sourceLanguage: Language,
    targetLanguages: Language[]
  ): Promise<Map<Language, TranslationResult>> {
    const results = new Map<Language, TranslationResult>();

    // Batch translation can be more efficient in production
    // For mock, we'll translate to each language
    await Promise.all(
      targetLanguages.map(async targetLanguage => {
        const result = await this.translate(text, sourceLanguage, targetLanguage);
        results.set(targetLanguage, result);
      })
    );

    return results;
  }

  isReady(): boolean {
    return true;
  }

  getProviderName(): string {
    return 'MockTranslationProvider';
  }

  /**
   * Generate mock translation
   * In production, this calls actual translation API
   */
  private mockTranslate(text: string, targetLanguage: Language): string {
    // For demo purposes, prefix with language code and add some variation
    const languageNames: Record<Language, string> = {
      // Indian Languages
      [Language.ENGLISH]: 'English',
      [Language.HINDI]: 'Hindi',
      [Language.TELUGU]: 'Telugu',
      [Language.TAMIL]: 'Tamil',
      [Language.KANNADA]: 'Kannada',
      [Language.MALAYALAM]: 'Malayalam',
      [Language.BENGALI]: 'Bengali',
      [Language.MARATHI]: 'Marathi',
      [Language.GUJARATI]: 'Gujarati',
      [Language.PUNJABI]: 'Punjabi',
      [Language.URDU]: 'Urdu',
      [Language.ODIA]: 'Odia',
      [Language.ASSAMESE]: 'Assamese',
      // International Languages
      [Language.SPANISH]: 'Spanish',
      [Language.FRENCH]: 'French',
      [Language.GERMAN]: 'German',
      [Language.CHINESE]: 'Chinese',
      [Language.JAPANESE]: 'Japanese',
      [Language.KOREAN]: 'Korean',
      [Language.ARABIC]: 'Arabic',
    };

    const langName = languageNames[targetLanguage] || targetLanguage;
    
    // Simulate translation by prefixing
    // In production, this would be actual translated text
    return `[${langName}] ${text}`;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.translationCache.clear();
    logger.info('Translation cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.translationCache.size;
  }
}
