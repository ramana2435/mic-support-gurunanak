import { Language, LanguageConfig } from '../types';

export const LANGUAGES: Record<Language, LanguageConfig> = {
  // Indian Languages
  [Language.ENGLISH]: {
    code: Language.ENGLISH,
    name: 'English',
    nativeName: 'English',
    sttCode: 'en-IN',
    ttsCode: 'en-IN-Neural2-A',
  },
  [Language.HINDI]: {
    code: Language.HINDI,
    name: 'Hindi',
    nativeName: 'हिन्दी',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN-Neural2-A',
  },
  [Language.TELUGU]: {
    code: Language.TELUGU,
    name: 'Telugu',
    nativeName: 'తెలుగు',
    sttCode: 'te-IN',
    ttsCode: 'te-IN-Standard-A',
  },
  [Language.TAMIL]: {
    code: Language.TAMIL,
    name: 'Tamil',
    nativeName: 'தமிழ்',
    sttCode: 'ta-IN',
    ttsCode: 'ta-IN-Standard-A',
  },
  [Language.KANNADA]: {
    code: Language.KANNADA,
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    sttCode: 'kn-IN',
    ttsCode: 'kn-IN-Standard-A',
  },
  [Language.MALAYALAM]: {
    code: Language.MALAYALAM,
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    sttCode: 'ml-IN',
    ttsCode: 'ml-IN-Standard-A',
  },
  [Language.BENGALI]: {
    code: Language.BENGALI,
    name: 'Bengali',
    nativeName: 'বাংলা',
    sttCode: 'bn-IN',
    ttsCode: 'bn-IN-Standard-A',
  },
  [Language.MARATHI]: {
    code: Language.MARATHI,
    name: 'Marathi',
    nativeName: 'मराठी',
    sttCode: 'mr-IN',
    ttsCode: 'mr-IN-Standard-A',
  },
  [Language.GUJARATI]: {
    code: Language.GUJARATI,
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    sttCode: 'gu-IN',
    ttsCode: 'gu-IN-Standard-A',
  },
  [Language.PUNJABI]: {
    code: Language.PUNJABI,
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    sttCode: 'pa-IN',
    ttsCode: 'pa-IN-Standard-A',
  },
  [Language.URDU]: {
    code: Language.URDU,
    name: 'Urdu',
    nativeName: 'اردو',
    sttCode: 'ur-IN',
    ttsCode: 'ur-IN-Standard-A',
  },
  [Language.ODIA]: {
    code: Language.ODIA,
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    sttCode: 'or-IN',
    ttsCode: 'or-IN-Standard-A',
  },
  [Language.ASSAMESE]: {
    code: Language.ASSAMESE,
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    sttCode: 'as-IN',
    ttsCode: 'as-IN-Standard-A',
  },
  
  // International Languages
  [Language.SPANISH]: {
    code: Language.SPANISH,
    name: 'Spanish',
    nativeName: 'Español',
    sttCode: 'es-ES',
    ttsCode: 'es-ES-Neural2-A',
  },
  [Language.FRENCH]: {
    code: Language.FRENCH,
    name: 'French',
    nativeName: 'Français',
    sttCode: 'fr-FR',
    ttsCode: 'fr-FR-Neural2-A',
  },
  [Language.GERMAN]: {
    code: Language.GERMAN,
    name: 'German',
    nativeName: 'Deutsch',
    sttCode: 'de-DE',
    ttsCode: 'de-DE-Neural2-A',
  },
  [Language.CHINESE]: {
    code: Language.CHINESE,
    name: 'Chinese',
    nativeName: '中文',
    sttCode: 'zh-CN',
    ttsCode: 'zh-CN-Standard-A',
  },
  [Language.JAPANESE]: {
    code: Language.JAPANESE,
    name: 'Japanese',
    nativeName: '日本語',
    sttCode: 'ja-JP',
    ttsCode: 'ja-JP-Neural2-A',
  },
  [Language.KOREAN]: {
    code: Language.KOREAN,
    name: 'Korean',
    nativeName: '한국어',
    sttCode: 'ko-KR',
    ttsCode: 'ko-KR-Neural2-A',
  },
  [Language.ARABIC]: {
    code: Language.ARABIC,
    name: 'Arabic',
    nativeName: 'العربية',
    sttCode: 'ar-SA',
    ttsCode: 'ar-XA-Standard-A',
  },
};

export const LANGUAGE_OPTIONS = Object.values(LANGUAGES);

export const getLanguageConfig = (code: Language): LanguageConfig => {
  return LANGUAGES[code];
};
