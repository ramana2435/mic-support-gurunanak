import { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '@live-translation/shared';

interface TTSQueueItem {
  text: string;
  sequenceNumber: number;
  language: Language;
}

export function useBrowserTTS(targetLanguage: Language) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const queueRef = useRef<TTSQueueItem[]>([]);
  const processedSequencesRef = useRef<Set<number>>(new Set());
  const isProcessingRef = useRef(false);

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      // Load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('[BrowserTTS] Available voices:', voices.length);
        setAvailableVoices(voices);
        
        // Auto-select best voice for target language
        selectBestVoice(voices, targetLanguage);
      };

      loadVoices();
      
      // Voices may load asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    } else {
      console.warn('[BrowserTTS] Speech Synthesis not supported in this browser');
      setIsSupported(false);
      setError('Text-to-Speech is not supported in your browser');
    }

    return () => {
      // Cleanup
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [targetLanguage]);

  const selectBestVoice = (voices: SpeechSynthesisVoice[], language: Language) => {
    if (voices.length === 0) {
      console.warn('[BrowserTTS] No voices available yet');
      return;
    }

    // Map language codes to speech synthesis lang codes
    const langMap: Record<string, string[]> = {
      te: ['te-IN', 'te'],
      hi: ['hi-IN', 'hi'],
      ta: ['ta-IN', 'ta'],
      kn: ['kn-IN', 'kn'],
      ml: ['ml-IN', 'ml'],
      en: ['en-IN', 'en-US', 'en-GB', 'en'],
      bn: ['bn-IN', 'bn'],
      gu: ['gu-IN', 'gu'],
      mr: ['mr-IN', 'mr'],
      pa: ['pa-IN', 'pa'],
    };

    const preferredLangs = langMap[language] || ['en-IN', 'en'];

    // Try to find exact match
    for (const preferredLang of preferredLangs) {
      const voice = voices.find(v => v.lang === preferredLang);
      if (voice) {
        console.log('[BrowserTTS] Selected voice:', voice.name, voice.lang);
        setSelectedVoice(voice);
        return;
      }
    }

    // Try to find partial match
    for (const preferredLang of preferredLangs) {
      const prefix = preferredLang.split('-')[0];
      const voice = voices.find(v => v.lang.startsWith(prefix));
      if (voice) {
        console.log('[BrowserTTS] Selected voice (partial match):', voice.name, voice.lang);
        setSelectedVoice(voice);
        return;
      }
    }

    // Fallback to first available voice
    console.warn('[BrowserTTS] No matching voice found for language:', language);
    console.warn('[BrowserTTS] Using fallback voice:', voices[0].name);
    setSelectedVoice(voices[0]);
    setError(`Voice for ${language} not available. Using fallback voice.`);
  };

  const enableAudio = useCallback(() => {
    if (!isSupported) {
      console.error('[BrowserTTS] Cannot enable - not supported');
      return false;
    }

    // Test speech to unlock autoplay (required on mobile)
    try {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0; // Silent
      window.speechSynthesis.speak(utterance);
      
      setIsEnabled(true);
      setError(null);
      console.log('[BrowserTTS] Audio enabled');
      return true;
    } catch (err) {
      console.error('[BrowserTTS] Failed to enable audio:', err);
      setError('Failed to enable audio. Please try again.');
      return false;
    }
  }, [isSupported]);

  const disableAudio = useCallback(() => {
    setIsEnabled(false);
    window.speechSynthesis.cancel();
    queueRef.current = [];
    processedSequencesRef.current.clear();
    console.log('[BrowserTTS] Audio disabled');
  }, []);

  const speak = useCallback((text: string, sequenceNumber: number) => {
    if (!isEnabled || !isSupported) {
      console.debug('[BrowserTTS] Speech skipped - not enabled or supported');
      return;
    }

    // Check if already processed
    if (processedSequencesRef.current.has(sequenceNumber)) {
      console.debug('[BrowserTTS] Skipping duplicate sequence:', sequenceNumber);
      return;
    }

    // Add to queue
    queueRef.current.push({
      text,
      sequenceNumber,
      language: targetLanguage,
    });

    console.log('[BrowserTTS] Added to queue:', {
      sequenceNumber,
      queueLength: queueRef.current.length,
      text: text.substring(0, 50),
    });

    // Process queue
    processQueue();
  }, [isEnabled, isSupported, targetLanguage]);

  const processQueue = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const item = queueRef.current.shift()!;

    console.log('[BrowserTTS] Speaking:', {
      sequenceNumber: item.sequenceNumber,
      text: item.text.substring(0, 50),
      voice: selectedVoice?.name,
    });

    const utterance = new SpeechSynthesisUtterance(item.text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.lang = selectedVoice?.lang || 'en-IN';
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume

    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('[BrowserTTS] Started speaking:', item.sequenceNumber);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      processedSequencesRef.current.add(item.sequenceNumber);
      isProcessingRef.current = false;
      
      console.log('[BrowserTTS] Finished speaking:', item.sequenceNumber);
      
      // Process next in queue
      if (queueRef.current.length > 0) {
        setTimeout(() => processQueue(), 100); // Small delay between utterances
      }
    };

    utterance.onerror = (event) => {
      console.error('[BrowserTTS] Speech error:', event.error);
      setIsSpeaking(false);
      isProcessingRef.current = false;
      
      // Continue with next item
      if (queueRef.current.length > 0) {
        setTimeout(() => processQueue(), 100);
      }
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[BrowserTTS] Failed to speak:', err);
      isProcessingRef.current = false;
      processQueue(); // Try next item
    }
  }, [selectedVoice]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    queueRef.current = [];
    setIsSpeaking(false);
    isProcessingRef.current = false;
    console.log('[BrowserTTS] Stopped all speech');
  }, []);

  return {
    isSupported,
    isEnabled,
    isSpeaking,
    availableVoices,
    selectedVoice,
    error,
    enableAudio,
    disableAudio,
    speak,
    stop,
    queueLength: queueRef.current.length,
  };
}
