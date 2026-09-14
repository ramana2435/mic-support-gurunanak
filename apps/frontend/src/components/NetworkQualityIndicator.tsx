'use client'

import { NetworkQuality, NetworkStats, ConnectionStatus, getNetworkQualityInfo, getConnectionStatusInfo } from '@/hooks/useNetworkQuality';

/**
 * Network Quality Indicator Component (MODULE 9)
 * Displays real-time network quality and connection status
 */
interface NetworkQualityIndicatorProps {
  connectionStatus: ConnectionStatus;
  networkStats: NetworkStats;
  showDetails?: boolean;
}

export function NetworkQualityIndicator({
  connectionStatus,
  networkStats,
  showDetails = false,
}: NetworkQualityIndicatorProps) {
  const qualityInfo = getNetworkQualityInfo(networkStats.quality);
  const connectionInfo = getConnectionStatusInfo(connectionStatus);

  return (
    <div className="space-y-2">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${connectionInfo.bgColor} ${connectionInfo.color} text-xs font-medium`}>
          <span>{connectionInfo.icon}</span>
          <span>{connectionInfo.text}</span>
        </div>
      </div>

      {/* Network Quality */}
      {connectionStatus === 'connected' && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${qualityInfo.bgColor} ${qualityInfo.borderColor} ${qualityInfo.color} text-xs font-medium`}>
            <SignalBars bars={qualityInfo.bars} color={qualityInfo.color} />
            <span>{qualityInfo.text}</span>
          </div>
        </div>
      )}

      {/* Detailed Stats */}
      {showDetails && connectionStatus === 'connected' && (
        <div className={`text-xs space-y-1 p-2 rounded border ${qualityInfo.bgColor} ${qualityInfo.borderColor}`}>
          <div className="flex justify-between">
            <span className="text-gray-600">Latency:</span>
            <span className={`font-medium ${qualityInfo.color}`}>{networkStats.latency}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Jitter:</span>
            <span className={`font-medium ${qualityInfo.color}`}>{networkStats.jitter}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Packet Loss:</span>
            <span className={`font-medium ${qualityInfo.color}`}>{networkStats.packetLoss}%</span>
          </div>
          {networkStats.bandwidth > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Bandwidth:</span>
              <span className={`font-medium ${qualityInfo.color}`}>
                {formatBandwidth(networkStats.bandwidth)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Signal Bars Icon Component
 */
interface SignalBarsProps {
  bars: number; // 0-4
  color: string;
}

function SignalBars({ bars, color }: SignalBarsProps) {
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={`w-1 rounded-sm ${level <= bars ? color.replace('text-', 'bg-') : 'bg-gray-300'}`}
          style={{ height: `${level * 25}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Format bandwidth for display
 */
function formatBandwidth(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
}

/**
 * Compact Network Quality Badge (MODULE 9)
 * Minimal display for header/navigation
 */
interface NetworkQualityBadgeProps {
  quality: NetworkQuality;
  latency?: number;
}

export function NetworkQualityBadge({ quality, latency }: NetworkQualityBadgeProps) {
  const info = getNetworkQualityInfo(quality);

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${info.bgColor} ${info.color}`}>
      <SignalBars bars={info.bars} color={info.color} />
      {latency !== undefined && latency > 0 && (
        <span className="font-medium">{latency}ms</span>
      )}
    </div>
  );
}

/**
 * Audio Buffer Status Component (MODULE 9)
 * Shows audio buffering status
 */
interface AudioBufferStatusProps {
  bufferSize: number;
  bufferedDuration: number;
  underrunCount: number;
  isPlaying: boolean;
}

export function AudioBufferStatus({
  bufferSize,
  bufferedDuration,
  underrunCount,
  isPlaying,
}: AudioBufferStatusProps) {
  const bufferHealth = bufferedDuration > 0.5 ? 'good' : bufferedDuration > 0.2 ? 'warning' : 'critical';
  
  const healthColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };

  return (
    <div className="text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-gray-600">Buffer:</span>
        <div className={`px-2 py-0.5 rounded border ${healthColors[bufferHealth]}`}>
          {bufferedDuration > 0 ? `${bufferedDuration.toFixed(2)}s` : 'Empty'}
        </div>
      </div>
      
      {isPlaying && (
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Status:</span>
          <span className="text-green-600 font-medium">Playing</span>
        </div>
      )}
      
      {underrunCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Underruns:</span>
          <span className="text-orange-600 font-medium">{underrunCount}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Connection Status Banner (MODULE 9)
 * Full-width banner for important connection alerts
 */
interface ConnectionStatusBannerProps {
  status: ConnectionStatus;
  onRetry?: () => void;
}

export function ConnectionStatusBanner({ status, onRetry }: ConnectionStatusBannerProps) {
  if (status === 'connected') return null;

  const info = getConnectionStatusInfo(status);

  return (
    <div className={`w-full px-4 py-3 ${info.bgColor} border-b border-gray-200`}>
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <span className={`text-2xl ${info.color}`}>{info.icon}</span>
          <div>
            <p className={`font-medium ${info.color}`}>{info.text}</p>
            <p className="text-sm text-gray-600">{info.description}</p>
          </div>
        </div>
        
        {(status === 'disconnected' || status === 'error') && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
