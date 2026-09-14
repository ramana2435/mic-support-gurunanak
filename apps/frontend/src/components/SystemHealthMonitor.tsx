/**
 * System Health Monitor Component
 * MODULE 15: Displays microphone, STT, translation, TTS status with latency metrics
 */

import React from 'react';
import { StatusIndicator, StatusType } from './StatusIndicator';
import { Card } from './Card';

export interface SystemHealth {
  microphone: StatusType;
  stt: StatusType;
  translation: StatusType;
  tts: StatusType;
  connection: StatusType;
}

export interface LatencyMetrics {
  p50?: number;
  p95?: number;
  p99?: number;
}

interface SystemHealthMonitorProps {
  health: SystemHealth;
  latency?: LatencyMetrics;
  compact?: boolean;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = React.memo(({
  health,
  latency,
  compact = false,
}) => {
  const formatLatency = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    return `${Math.round(ms)}ms`;
  };

  const getOverallStatus = (): StatusType => {
    const statuses = Object.values(health);
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('warning')) return 'warning';
    if (statuses.every(s => s === 'active')) return 'active';
    if (statuses.some(s => s === 'active')) return 'success';
    return 'idle';
  };

  const overallStatus = getOverallStatus();

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatusIndicator status={health.microphone} label="Mic" />
        <StatusIndicator status={health.stt} label="STT" />
        <StatusIndicator status={health.translation} label="Translation" />
        <StatusIndicator status={health.tts} label="TTS" />
        <StatusIndicator status={health.connection} label="Connection" />
      </div>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-900">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          System Health
        </h3>
        <StatusIndicator 
          status={overallStatus} 
          label={overallStatus === 'active' ? 'All Systems Operational' : 'Check Status Below'}
          large
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <StatusIndicator 
          status={health.microphone} 
          label="Microphone"
          subtitle={health.microphone === 'active' ? 'Capturing' : 'Not active'}
        />
        <StatusIndicator 
          status={health.stt} 
          label="Speech-to-Text"
          subtitle={health.stt === 'active' ? 'Processing' : 'Idle'}
        />
        <StatusIndicator 
          status={health.translation} 
          label="Translation"
          subtitle={health.translation === 'active' ? 'Translating' : 'Idle'}
        />
        <StatusIndicator 
          status={health.tts} 
          label="Text-to-Speech"
          subtitle={health.tts === 'active' ? 'Synthesizing' : 'Idle'}
        />
        <StatusIndicator 
          status={health.connection} 
          label="Connection"
          subtitle={health.connection === 'active' ? 'Connected' : 'Disconnected'}
        />
      </div>

      {latency && (
        <div className="border-t dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Latency Metrics
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatLatency(latency.p50)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">P50 (median)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatLatency(latency.p95)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">P95</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatLatency(latency.p99)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">P99 (worst)</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});

SystemHealthMonitor.displayName = 'SystemHealthMonitor';
