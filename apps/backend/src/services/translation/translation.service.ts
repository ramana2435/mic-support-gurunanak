import { EventEmitter } from 'events';
import { Language } from '@live-translation/shared';
import { ITranslationProvider, TranslationResult } from './translation-provider.interface';
import { MockTranslationProvider } from './mock-translation-provider';
import logger from '../../utils/logger';

/**
 * Translation Service
 * Manages translation for multiple sessions and languages
 * Implements efficient caching and batching
 */
export class TranslationService extends EventEmitter {
  private provider: ITranslationProvider;
  private translationCache: Map<string, CachedTranslation> = new Map();
  private activeTranslations: Map<string, Promise<TranslationResult>> = new Map();
  private readonly CACHE_TTL = 1800000; // MODULE 11: Reduced to 30 minutes from 1 hour

  // Track which languages are needed per session
  private sessionLanguages: Map<string, Set<Language>> = new Map();

  constructor(provider?: ITranslationProvider) {
    super();
    this.provider = provider || new MockTranslationProvider();
    logger.info('Translation Service initialized', {
      provider: this.provider.getProviderName(),
    });
  }

  /**
   * Register languages needed for a session
   * This allows efficient batching
   */
  registerSessionLanguages(sessionId: string, languages: Language[]): void {
    const languageSet = new Set(languages);
    this.sessionLanguages.set(sessionId, languageSet);
    logger.info('Session languages registered', {
      sessionId,
      languages: Array.from(languageSet),
    });
  }

  /**
   * Unregister session languages
   */
  unregisterSession(sessionId: string): void {
    this.sessionLanguages.delete(sessionId);
    logger.info('Session unregistered', { sessionId });
  }

  /**
   * Translate text for a specific session
   * Automatically batches to all required languages
   */
  async translateForSession(
    sessionId: string,
    text: string,
    sourceLanguage: Language,
    sequenceNumber: number
  ): Promise<Map<Language, TranslationWithMetrics>> {
    const targetLanguages = this.sessionLanguages.get(sessionId);
    
    if (!targetLanguages || targetLanguages.size === 0) {
      logger.warn('No target languages for session', { sessionId });
      return new Map();
    }

    const translationStartTimestamp = Date.now();
    const results = new Map<Language, TranslationWithMetrics>();

    // Group languages that need the same translation
    const languageGroups = this.groupByLanguage(Array.from(targetLanguages));

    // Translate to each unique target language
    await Promise.all(
      Array.from(languageGroups.entries()).map(async ([targetLanguage, _]) => {
        try {
          const translation = await this.translateWithCache(
            text,
            sourceLanguage,
            targetLanguage
          );

          const translationResultTimestamp = Date.now();
          const translationLatency = translationResultTimestamp - translationStartTimestamp;

          const result: TranslationWithMetrics = {
            ...translation,
            sequenceNumber,
            timestamp: new Date(),
            latency: {
              translationStartTimestamp,
              translationResultTimestamp,
              translationLatency,
            },
          };

          results.set(targetLanguage, result);

          logger.debug('Translation completed for session', {
            sessionId,
            targetLanguage,
            latency: translationLatency,
          });
        } catch (error: any) {
          logger.error('Translation failed', {
            sessionId,
            targetLanguage,
            error: error.message,
          });
          this.emit('error', {
            sessionId,
            targetLanguage,
            error: error.message,
          });
        }
      })
    );

    return results;
  }

  /**
   * Translate text with caching
   * Prevents duplicate work for same text + language pair
   */
  private async translateWithCache(
    text: string,
    sourceLanguage: Language,
    targetLanguage: Language
  ): Promise<TranslationResult> {
    // Skip translation if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        confidence: 1.0,
      };
    }

    const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);

    // Check cache first
    const cached = this.translationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      logger.debug('Translation cache hit', { cacheKey });
      return cached.result;
    }

    // Check if translation is already in progress
    const inProgress = this.activeTranslations.get(cacheKey);
    if (inProgress) {
      logger.debug('Translation already in progress, waiting', { cacheKey });
      return await inProgress;
    }

    // Start new translation
    const translationPromise = this.provider.translate(
      text,
      sourceLanguage,
      targetLanguage
    );

    this.activeTranslations.set(cacheKey, translationPromise);

    try {
      const result = await translationPromise;

      // Cache result
      this.translationCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } finally {
      // Clean up active translations
      this.activeTranslations.delete(cacheKey);
    }
  }

  /**
   * Get cache key for a translation (MODULE 11: Optimized hashing)
   */
  private getCacheKey(
    text: string,
    sourceLanguage: Language,
    targetLanguage: Language
  ): string {
    // MODULE 11: Use shorter key for better performance
    // For very long texts, use hash to prevent large keys
    const textKey = text.length > 100 
      ? text.substring(0, 100) + `:${text.length}` 
      : text;
    return `${sourceLanguage}:${targetLanguage}:${textKey}`;
  }

  /**
   * Group languages (in case we want to optimize further)
   */
  private groupByLanguage(languages: Language[]): Map<Language, number> {
    const groups = new Map<Language, number>();
    
    languages.forEach(lang => {
      groups.set(lang, (groups.get(lang) || 0) + 1);
    });

    return groups;
  }

  /**
   * Get languages needed for a session
   */
  getSessionLanguages(sessionId: string): Language[] {
    const languages = this.sessionLanguages.get(sessionId);
    return languages ? Array.from(languages) : [];
  }

  /**
   * Clear old cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, cached] of this.translationCache.entries()) {
      if (now - cached.timestamp >= this.CACHE_TTL) {
        this.translationCache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info('Cleared expired cache entries', { count: cleared });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      size: this.translationCache.size,
      activeTranslations: this.activeTranslations.size,
      sessions: this.sessionLanguages.size,
    };
  }

  /**
   * Cleanup - clear all caches and sessions
   */
  cleanup(): void {
    this.translationCache.clear();
    this.activeTranslations.clear();
    this.sessionLanguages.clear();
    logger.info('Translation service cleanup complete');
  }
}

/**
 * Cached translation
 */
interface CachedTranslation {
  result: TranslationResult;
  timestamp: number;
}

/**
 * Translation with metrics
 */
export interface TranslationWithMetrics extends TranslationResult {
  sequenceNumber: number;
  timestamp: Date;
  latency: {
    translationStartTimestamp: number;
    translationResultTimestamp: number;
    translationLatency: number;
  };
}

/**
 * Cache statistics
 */
interface CacheStats {
  size: number;
  activeTranslations: number;
  sessions: number;
}

// Singleton instance
export const translationService = new TranslationService();

// Periodic cache cleanup (every 10 minutes)
setInterval(() => {
  translationService.clearExpiredCache();
}, 600000);
