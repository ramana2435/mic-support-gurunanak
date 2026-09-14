import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

/**
 * Network Quality Levels
 */
export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

/**
 * Network Statistics
 */
export interface NetworkStats {
  quality: NetworkQuality;
  latency: number; // milliseconds
  jitter: number; // milliseconds
  packetLoss: number; // percentage
  bandwidth: number; // bytes per second
  lastUpdated: Date;
}

/**
 * Connection Status
 */
export type ConnectionStatus = 
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

/**
 * Network Quality Monitoring Hook
 * Monitors Socket.IO connection and network performance
 */
export function useNetworkQuality(socket: Socket | null) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    quality: 'disconnected',
    latency: 0,
    jitter: 0,
    packetLoss: 0,
    bandwidth: 0,
    lastUpdated: new Date(),
  });

  // Latency measurement
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latencySamplesRef = useRef<number[]>([]);
  const lastPingTimeRef = useRef<number>(0);
  
  // Packet tracking
  const expectedSequenceRef = useRef<number>(0);
  const receivedPacketsRef = useRef<number>(0);
  const lostPacketsRef = useRef<number>(0);
  
  // Bandwidth tracking
  const bytesReceivedRef = useRef<number>(0);
  const bandwidthWindowStartRef = useRef<number>(Date.now());

  /**
   * Calculate network quality based on metrics
   */
  const calculateQuality = useCallback((latency: number, jitter: number, packetLoss: number): NetworkQuality => {
    // Disconnected
    if (latency === 0 || packetLoss === 100) {
      return 'disconnected';
    }

    // Excellent: <100ms latency, <10ms jitter, <1% loss
    if (latency < 100 && jitter < 10 && packetLoss < 1) {
      return 'excellent';
    }

    // Good: <250ms latency, <30ms jitter, <3% loss
    if (latency < 250 && jitter < 30 && packetLoss < 3) {
      return 'good';
    }

    // Poor: everything else
    return 'poor';
  }, []);

  /**
   * Measure latency via ping-pong
   */
  const measureLatency = useCallback(() => {
    if (!socket || !socket.connected) return;

    const startTime = Date.now();
    lastPingTimeRef.current = startTime;

    socket.emit('ping', { timestamp: startTime }, (response: any) => {
      const endTime = Date.now();
      const latency = endTime - startTime;

      // Store latency sample (keep last 10)
      latencySamplesRef.current.push(latency);
      if (latencySamplesRef.current.length > 10) {
        latencySamplesRef.current.shift();
      }

      // Calculate average latency
      const avgLatency = latencySamplesRef.current.reduce((a, b) => a + b, 0) / latencySamplesRef.current.length;

      // Calculate jitter (standard deviation of latency)
      const mean = avgLatency;
      const variance = latencySamplesRef.current.reduce((sum, value) => {
        const diff = value - mean;
        return sum + (diff * diff);
      }, 0) / latencySamplesRef.current.length;
      const jitter = Math.sqrt(variance);

      // Calculate packet loss
      const totalPackets = receivedPacketsRef.current + lostPacketsRef.current;
      const packetLoss = totalPackets > 0 ? (lostPacketsRef.current / totalPackets) * 100 : 0;

      // Calculate bandwidth (bytes per second over last 10 seconds)
      const windowDuration = (Date.now() - bandwidthWindowStartRef.current) / 1000;
      const bandwidth = windowDuration > 0 ? bytesReceivedRef.current / windowDuration : 0;

      // Reset bandwidth window every 10 seconds
      if (windowDuration >= 10) {
        bytesReceivedRef.current = 0;
        bandwidthWindowStartRef.current = Date.now();
      }

      // Determine quality
      const quality = calculateQuality(avgLatency, jitter, packetLoss);

      // Update stats
      setNetworkStats({
        quality,
        latency: Math.round(avgLatency),
        jitter: Math.round(jitter),
        packetLoss: Math.round(packetLoss * 10) / 10, // One decimal place
        bandwidth: Math.round(bandwidth),
        lastUpdated: new Date(),
      });
    });
  }, [socket, calculateQuality]);

  /**
   * Track packet for loss calculation
   */
  const trackPacket = useCallback((sequenceNumber: number, dataSize: number) => {
    // Track received packet
    receivedPacketsRef.current++;

    // Track bandwidth
    bytesReceivedRef.current += dataSize;

    // Check for packet loss (gap in sequence numbers)
    if (sequenceNumber > expectedSequenceRef.current) {
      const lost = sequenceNumber - expectedSequenceRef.current;
      lostPacketsRef.current += lost;
    }

    expectedSequenceRef.current = sequenceNumber + 1;
  }, []);

  /**
   * Reset tracking
   */
  const reset = useCallback(() => {
    latencySamplesRef.current = [];
    expectedSequenceRef.current = 0;
    receivedPacketsRef.current = 0;
    lostPacketsRef.current = 0;
    bytesReceivedRef.current = 0;
    bandwidthWindowStartRef.current = Date.now();
    
    setNetworkStats({
      quality: 'disconnected',
      latency: 0,
      jitter: 0,
      packetLoss: 0,
      bandwidth: 0,
      lastUpdated: new Date(),
    });
  }, []);

  /**
   * Set up socket event listeners
   */
  useEffect(() => {
    if (!socket) return;

    // Connection events
    const handleConnect = () => {
      setConnectionStatus('connected');
      reset();
      
      // Start latency measurement (every 2 seconds)
      pingIntervalRef.current = setInterval(() => {
        measureLatency();
      }, 2000);
      
      // Immediate first measurement
      measureLatency();
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
      setNetworkStats(prev => ({ ...prev, quality: 'disconnected' }));
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    const handleConnectError = () => {
      setConnectionStatus('error');
      setNetworkStats(prev => ({ ...prev, quality: 'disconnected' }));
    };

    const handleReconnecting = () => {
      setConnectionStatus('reconnecting');
    };

    const handleReconnect = () => {
      setConnectionStatus('connected');
      reset();
    };

    // Register listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnecting', handleReconnecting);
    socket.on('reconnect', handleReconnect);

    // Initial state
    if (socket.connected) {
      handleConnect();
    } else {
      setConnectionStatus('connecting');
    }

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnecting', handleReconnecting);
      socket.off('reconnect', handleReconnect);

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [socket, measureLatency, reset]);

  return {
    connectionStatus,
    networkStats,
    trackPacket,
    reset,
  };
}

/**
 * Get connection status display info
 */
export function getConnectionStatusInfo(status: ConnectionStatus) {
  const statusConfig = {
    connecting: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      icon: '🔄',
      text: 'Connecting...',
      description: 'Establishing connection to server',
    },
    connected: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: '✓',
      text: 'Connected',
      description: 'Connected to server',
    },
    reconnecting: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      icon: '⟳',
      text: 'Reconnecting...',
      description: 'Attempting to reconnect',
    },
    disconnected: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '✕',
      text: 'Disconnected',
      description: 'Not connected to server',
    },
    error: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '⚠',
      text: 'Connection Error',
      description: 'Failed to connect to server',
    },
  };

  return statusConfig[status];
}

/**
 * Get network quality display info
 */
export function getNetworkQualityInfo(quality: NetworkQuality) {
  const qualityConfig = {
    excellent: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: '📶',
      bars: 4,
      text: 'Excellent',
      description: 'Optimal network conditions',
    },
    good: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: '📶',
      bars: 3,
      text: 'Good',
      description: 'Good network conditions',
    },
    poor: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: '📶',
      bars: 1,
      text: 'Poor',
      description: 'Degraded network conditions',
    },
    disconnected: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: '📵',
      bars: 0,
      text: 'Disconnected',
      description: 'No connection',
    },
  };

  return qualityConfig[quality];
}
