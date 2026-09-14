import { useEffect, useRef, useState, useCallback } from 'react';
import { TTSAudioChunkPayload } from '@live-translation/shared';

/**
 * Audio Player Hook (MODULE 9 Enhanced)
 * Manages TTS audio playback with buffering, sequencing, and network adaptation
 */
export function useAudioPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'playing' | 'interrupted' | 'error'>('idle');
  const [currentSequence, setCurrentSequence] = useState<number>(0);
  
  // Buffer for pending audio chunks
  const audioBufferRef = useRef<Map<number, AudioBufferData>>(new Map());
  const scheduledTimeRef = useRef<number>(0);
  
  // MODULE 9: Buffering statistics (MODULE 11: Reduced for lower latency)
  const [bufferStats, setBufferStats] = useState<BufferStats>({
    currentBufferSize: 0,
    maxBufferSize: 3, // Reduced from 5 for lower latency
    bufferedDuration: 0,
    underrunCount: 0,
    lastUnderrun: null,
  });

  useEffect(() => {
    // Initialize Web Audio API
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        // Resume context if suspended (browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        console.log('AudioContext initialized', {
          sampleRate: audioContextRef.current.sampleRate,
          state: audioContextRef.current.state,
        });
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
        setAudioStatus('error');
      }
    }

    return () => {
      // Cleanup on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  /**
   * MODULE 11: Update buffer statistics
   */
  const updateBufferStats = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const currentTime = audioContext.currentTime;
    const bufferedDuration = Math.max(0, scheduledTimeRef.current - currentTime);
    
    setBufferStats({
      currentBufferSize: audioBufferRef.current.size,
      maxBufferSize: 3, // Reduced for lower latency
      bufferedDuration,
      underrunCount: bufferStats.underrunCount,
      lastUnderrun: bufferStats.lastUnderrun,
    });
  }, [bufferStats.underrunCount, bufferStats.lastUnderrun]);

  /**
   * Play audio chunk (MODULE 9 Enhanced)
   */
  const playChunk = useCallback(async (chunk: TTSAudioChunkPayload) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) {
      console.error('AudioContext not initialized');
      return;
    }

    try {
      // Resume context if needed (user interaction may be required)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Decode base64 audio data
      const audioData = Uint8Array.from(atob(chunk.audioData), c => c.charCodeAt(0));

      // Convert PCM to AudioBuffer
      const audioBuffer = await convertPCMToAudioBuffer(
        audioData,
        audioContext,
        chunk.sampleRate,
        1 // mono
      );

      // Schedule playback
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      // Calculate when to start (for seamless playback)
      const now = audioContext.currentTime;
      const startTime = Math.max(now, scheduledTimeRef.current);
      
      // MODULE 9: Detect buffer underrun
      if (startTime <= now && scheduledTimeRef.current > 0) {
        console.warn('Buffer underrun detected', {
          scheduled: scheduledTimeRef.current,
          now,
          gap: now - scheduledTimeRef.current,
        });
        
        setBufferStats(prev => ({
          ...prev,
          underrunCount: prev.underrunCount + 1,
          lastUnderrun: new Date(),
        }));
      }

      source.start(startTime);
      
      // Update scheduled time for next chunk
      scheduledTimeRef.current = startTime + audioBuffer.duration;
      
      // MODULE 9: Update buffer stats
      updateBufferStats();

      // Update state
      if (!isPlaying) {
        setIsPlaying(true);
        setAudioStatus('playing');
      }

      if (chunk.chunkIndex === 0) {
        console.log('TTS audio playback started', {
          sequenceNumber: chunk.sequenceNumber,
          latency: chunk.latency?.totalLatency,
          startTime,
          currentTime: now,
        });
      }

      // Handle end of audio
      if (chunk.isLast) {
        source.onended = () => {
          setIsPlaying(false);
          setAudioStatus('idle');
          setCurrentSequence(chunk.sequenceNumber);
          updateBufferStats();
          console.log('TTS audio playback completed', {
            sequenceNumber: chunk.sequenceNumber,
          });
        };
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setAudioStatus('error');
    }
  }, [isPlaying, updateBufferStats]);

  /**
   * Handle audio chunk with buffering
   */
  const handleAudioChunk = useCallback((chunk: TTSAudioChunkPayload) => {
    // Skip if empty (end marker)
    if (chunk.isLast && chunk.audioData === '') {
      return;
    }

    // Store in buffer
    const bufferKey = chunk.sequenceNumber;
    let bufferData = audioBufferRef.current.get(bufferKey);
    
    if (!bufferData) {
      bufferData = {
        sequenceNumber: chunk.sequenceNumber,
        chunks: [],
        receivedCount: 0,
      };
      audioBufferRef.current.set(bufferKey, bufferData);
    }

    bufferData.chunks.push(chunk);
    bufferData.receivedCount++;

    // Play immediately (streaming)
    playChunk(chunk);

    // Clean up old buffers (MODULE 11: Keep fewer for lower latency)
    if (audioBufferRef.current.size > 3) {
      const oldestKey = Math.min(...Array.from(audioBufferRef.current.keys()));
      audioBufferRef.current.delete(oldestKey);
    }
  }, [playChunk]);

  /**
   * Handle TTS error
   */
  const handleError = useCallback((error: string) => {
    console.error('TTS error:', error);
    setAudioStatus('interrupted');
    setIsPlaying(false);
    
    // Clear buffers
    audioBufferRef.current.clear();
    scheduledTimeRef.current = 0;
  }, []);

  /**
   * Reset audio player
   */
  const reset = useCallback(() => {
    setIsPlaying(false);
    setAudioStatus('idle');
    audioBufferRef.current.clear();
    scheduledTimeRef.current = 0;
    
    // MODULE 9: Reset buffer stats (MODULE 11: Updated max)
    setBufferStats({
      currentBufferSize: 0,
      maxBufferSize: 3,
      bufferedDuration: 0,
      underrunCount: 0,
      lastUnderrun: null,
    });
  }, []);

  return {
    audioStatus,
    isPlaying,
    currentSequence,
    bufferStats, // MODULE 9: Export buffer statistics
    handleAudioChunk,
    handleError,
    reset,
  };
}

/**
 * Audio buffer data
 */
interface AudioBufferData {
  sequenceNumber: number;
  chunks: TTSAudioChunkPayload[];
  receivedCount: number;
}

/**
 * MODULE 9: Buffer statistics
 */
export interface BufferStats {
  currentBufferSize: number;
  maxBufferSize: number;
  bufferedDuration: number; // seconds
  underrunCount: number;
  lastUnderrun: Date | null;
}

/**
 * Convert PCM data to AudioBuffer
 */
async function convertPCMToAudioBuffer(
  pcmData: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number,
  channels: number
): Promise<AudioBuffer> {
  // PCM is 16-bit signed integers
  const samples = pcmData.length / 2;
  const audioBuffer = audioContext.createBuffer(channels, samples, sampleRate);

  // Convert 16-bit PCM to float32 for Web Audio API
  const channelData = audioBuffer.getChannelData(0);
  const dataView = new DataView(pcmData.buffer);

  for (let i = 0; i < samples; i++) {
    const sample = dataView.getInt16(i * 2, true); // Little-endian
    channelData[i] = sample / 32768.0; // Convert to -1.0 to 1.0 range
  }

  return audioBuffer;
}
