import { Language } from '@live-translation/shared';

/**
 * Abstract interface for translation providers
 * Allows switching between different translation services (Google, Azure, AWS, etc.)
 */
export interface ITranslationProvider {
  /**
   * Translate text from source language to target language
   * @param text - Text to translate
   * @param sourceLanguage - Source language code
   * @param targetLanguage - Target language code
   * @returns Translated text
   */
  translate(
    text: string,
    sourceLanguage: Language,
    targetLanguage: Language
  ): Promise<TranslationResult>;

  /**
   * Batch translate multiple texts to multiple target languages
   * More efficient than individual calls when multiple targets exist
   * @param text - Text to translate
   * @param sourceLanguage - Source language code
   * @param targetLanguages - Array of target language codes
   * @returns Map of language to translated text
   */
  translateBatch(
    text: string,
    sourceLanguage: Language,
    targetLanguages: Language[]
  ): Promise<Map<Language, TranslationResult>>;

  /**
   * Check if provider is ready
   */
  isReady(): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string;
}

/**
 * Translation result with metadata
 */
export interface TranslationResult {
  translatedText: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  confidence?: number;
  detectedLanguage?: Language;
}

/**
 * Translation provider configuration
 */
export interface TranslationProviderConfig {
  apiKey?: string;
  endpoint?: string;
  region?: string;
  model?: string;
  format?: 'text' | 'html';
}
