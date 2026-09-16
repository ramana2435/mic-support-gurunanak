/**
 * Microphone Hook with Error Handling
 * MODULE 13: Robust microphone access with comprehensive error handling
 * 
 * Handles:
 * - Permission denied
 * - Device not found
 * - Device disconnected
 * - Browser not supported
 * - Clear error messages
 * - Manual retry
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export enum MicrophoneStatus {
  IDLE = 'IDLE',
  REQUESTING = 'REQUESTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
}

export interface MicrophoneError {
  type: MicrophoneStatus;
  message: string;
  canRetry: boolean;
  userAction?: string; // Suggested action for user
}

interface UseMicrophoneReturn {
  stream: MediaStream | null;
  status: MicrophoneStatus;
  error: MicrophoneError | null;
  startMicrophone: () => Promise<void>;
  stopMicrophone: () => void;
  retryMicrophone: () => Promise<void>;
}

/**
 * useMicrophoneWithErrorHandling Hook
 */
export function useMicrophoneWithErrorHandling(): UseMicrophoneReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MicrophoneStatus>(MicrophoneStatus.IDLE);
  const [error, setError] = useState<MicrophoneError | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef(false);

  /**
   * Check if browser supports getUserMedia
   */
  const checkBrowserSupport = useCallback((): boolean => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus(MicrophoneStatus.NOT_SUPPORTED);
      setError({
        type: MicrophoneStatus.NOT_SUPPORTED,
        message: 'Your browser does not support microphone access',
        canRetry: false,
        userAction: 'Please use a modern browser (Chrome, Firefox, Safari, or Edge)',
      });
      return false;
    }
    return true;
  }, []);

  /**
   * Handle microphone errors
   */
  const handleMicrophoneError = useCallback((err: any) => {
    console.error('[Microphone] Error:', err);

    let micError: MicrophoneError;

    // Permission denied
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      micError = {
        type: MicrophoneStatus.PERMISSION_DENIED,
        message: 'Microphone permission denied',
        canRetry: true,
        userAction: 'Please allow microphone access in your browser settings and try again',
      };
      setStatus(MicrophoneStatus.PERMISSION_DENIED);
    }
    // Device not found
    else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      micError = {
        type: MicrophoneStatus.DEVICE_NOT_FOUND,
        message: 'No microphone found',
        canRetry: true,
        userAction: 'Please connect a microphone and try again',
      };
      setStatus(MicrophoneStatus.DEVICE_NOT_FOUND);
    }
    // Device in use
    else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      micError = {
        type: MicrophoneStatus.ERROR,
        message: 'Microphone is already in use by another application',
        canRetry: true,
        userAction: 'Please close other applications using the microphone and try again',
      };
      setStatus(MicrophoneStatus.ERROR);
    }
    // Other errors
    else {
      micError = {
        type: MicrophoneStatus.ERROR,
        message: err.message || 'Failed to access microphone',
        canRetry: true,
        userAction: 'Please check your microphone and try again',
      };
      setStatus(MicrophoneStatus.ERROR);
    }

    setError(micError);
  }, []);

  /**
   * Start microphone
   */
  const startMicrophone = useCallback(async () => {
    // Prevent concurrent starts
    if (isStartingRef.current) {
      console.warn('[Microphone] Already starting');
      return;
    }

    // Check if already active
    if (streamRef.current) {
      console.warn('[Microphone] Already active');
      return;
    }

    isStartingRef.current = true;
    setStatus(MicrophoneStatus.REQUESTING);
    setError(null);

    // Check browser support
    if (!checkBrowserSupport()) {
      isStartingRef.current = false;
      return;
    }

    try {
      console.log('[Microphone] Requesting access...');

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('[Microphone] Access granted');

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus(MicrophoneStatus.ACTIVE);
      setError(null);

      // Monitor for device disconnection
      mediaStream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          console.warn('[Microphone] Track ended (device disconnected?)');
          handleMicrophoneError({
            name: 'DeviceDisconnected',
            message: 'Microphone was disconnected',
          });
          stopMicrophone();
        };
      });
    } catch (err: any) {
      handleMicrophoneError(err);
    } finally {
      isStartingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkBrowserSupport, handleMicrophoneError]);

  /**
   * Stop microphone
   */
  const stopMicrophone = useCallback(() => {
    console.log('[Microphone] Stopping...');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    setStream(null);
    setStatus(MicrophoneStatus.IDLE);
  }, []);

  /**
   * Retry microphone access
   */
  const retryMicrophone = useCallback(async () => {
    console.log('[Microphone] Retrying...');
    stopMicrophone();
    await startMicrophone();
  }, [stopMicrophone, startMicrophone]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    stream,
    status,
    error,
    startMicrophone,
    stopMicrophone,
    retryMicrophone,
  };
}
