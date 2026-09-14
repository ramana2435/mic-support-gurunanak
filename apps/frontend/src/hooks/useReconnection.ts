/**
 * Reconnection Hook
 * MODULE 13: Frontend reconnection with exponential backoff
 * 
 * Handles:
 * - Automatic reconnection on disconnect
 * - Exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
 * - Session recovery
 * - Connection status tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
}

interface ReconnectionConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  backoffMultiplier: number;
}

interface UseReconnectionReturn {
  status: ConnectionStatus;
  attempts: number;
  nextRetryIn: number;
  error: string | null;
  manualReconnect: () => void;
}

const defaultConfig: ReconnectionConfig = {
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  maxRetries: 10,
  backoffMultiplier: 2,
};

/**
 * useReconnection Hook
 * Manages socket reconnection with exponential backoff
 */
export function useReconnection(
  socket: Socket | null,
  sessionInfo: { sessionCode: string; studentId?: string } | null,
  onReconnected?: () => void
): UseReconnectionReturn {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [attempts, setAttempts] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const retriesRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentDelayRef = useRef(defaultConfig.initialDelayMs);
  const isReconnectingRef = useRef(false);

  /**
   * Calculate next delay with exponential backoff
   */
  const getNextDelay = useCallback((): number => {
    const delay = Math.min(
      currentDelayRef.current * defaultConfig.backoffMultiplier,
      defaultConfig.maxDelayMs
    );
    currentDelayRef.current = delay;
    return delay;
  }, []);

  /**
   * Reset reconnection state
   */
  const resetReconnectionState = useCallback(() => {
    retriesRef.current = 0;
    currentDelayRef.current = defaultConfig.initialDelayMs;
    isReconnectingRef.current = false;
    setAttempts(0);
    setNextRetryIn(0);
    setError(null);
  }, []);

  /**
   * Attempt reconnection
   */
  const attemptReconnection = useCallback(() => {
    if (!socket || !sessionInfo) {
      return;
    }

    if (retriesRef.current >= defaultConfig.maxRetries) {
      setStatus(ConnectionStatus.FAILED);
      setError('Maximum reconnection attempts reached');
      isReconnectingRef.current = false;
      return;
    }

    retriesRef.current++;
    setAttempts(retriesRef.current);
    setStatus(ConnectionStatus.RECONNECTING);

    console.log(`[Reconnection] Attempt ${retriesRef.current}/${defaultConfig.maxRetries}`);

    // Try to reconnect socket
    if (!socket.connected) {
      socket.connect();

      // Wait for connection
      const connectionTimeout = setTimeout(() => {
        if (!socket.connected) {
          console.warn('[Reconnection] Connection timeout, scheduling retry');
          scheduleRetry();
        }
      }, 5000);

      // Listen for successful connection
      const onConnect = () => {
        clearTimeout(connectionTimeout);
        console.log('[Reconnection] Socket connected, recovering session');

        // Session recovery will be handled by SESSION_JOINED event
        socket.off('connect', onConnect);
      };

      socket.on('connect', onConnect);
    }
  }, [socket, sessionInfo]);

  /**
   * Schedule next retry
   */
  const scheduleRetry = useCallback(() => {
    if (retriesRef.current >= defaultConfig.maxRetries) {
      setStatus(ConnectionStatus.FAILED);
      setError('Maximum reconnection attempts reached');
      isReconnectingRef.current = false;
      return;
    }

    const delay = getNextDelay();
    const retryAt = Date.now() + delay;

    console.log(`[Reconnection] Scheduling retry in ${delay}ms`);

    // Update countdown
    const countdownInterval = setInterval(() => {
      const remaining = Math.max(0, retryAt - Date.now());
      setNextRetryIn(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 100);

    // Schedule retry
    timerRef.current = setTimeout(() => {
      clearInterval(countdownInterval);
      setNextRetryIn(0);
      attemptReconnection();
    }, delay);
  }, [getNextDelay, attemptReconnection]);

  /**
   * Manual reconnect trigger
   */
  const manualReconnect = useCallback(() => {
    if (isReconnectingRef.current) {
      console.warn('[Reconnection] Already reconnecting');
      return;
    }

    console.log('[Reconnection] Manual reconnect triggered');
    resetReconnectionState();
    isReconnectingRef.current = true;
    attemptReconnection();
  }, [resetReconnectionState, attemptReconnection]);

  /**
   * Handle socket events
   */
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('[Reconnection] Connected');
      setStatus(ConnectionStatus.CONNECTED);
      resetReconnectionState();

      if (onReconnected) {
        onReconnected();
      }
    };

    const handleDisconnect = (reason: string) => {
      console.warn('[Reconnection] Disconnected:', reason);
      setStatus(ConnectionStatus.DISCONNECTED);
      setError(`Disconnected: ${reason}`);

      // Start reconnection if not manual disconnect
      if (reason !== 'io client disconnect') {
        isReconnectingRef.current = true;
        scheduleRetry();
      }
    };

    const handleConnectError = (error: Error) => {
      console.error('[Reconnection] Connection error:', error.message);
      setError(error.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    // Initial status
    if (socket.connected) {
      setStatus(ConnectionStatus.CONNECTED);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [socket, onReconnected, resetReconnectionState, scheduleRetry]);

  return {
    status,
    attempts,
    nextRetryIn,
    error,
    manualReconnect,
  };
}
