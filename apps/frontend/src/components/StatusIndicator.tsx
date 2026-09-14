/**
 * Status Indicator Component
 * MODULE 15: Professional status indicators for system health
 */

import React from 'react';

export type StatusType = 'idle' | 'active' | 'error' | 'warning' | 'success';

interface StatusIndicatorProps {
  status: StatusType;
  label: string;
  subtitle?: string;
  large?: boolean;
  showPulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = React.memo(({
  status,
  label,
  subtitle,
  large = false,
  showPulse = true,
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-800 dark:text-green-200',
          dot: 'bg-green-500',
          border: 'border-green-300 dark:border-green-700',
        };
      case 'error':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-800 dark:text-red-200',
          dot: 'bg-red-500',
          border: 'border-red-300 dark:border-red-700',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-800 dark:text-yellow-200',
          dot: 'bg-yellow-500',
          border: 'border-yellow-300 dark:border-yellow-700',
        };
      case 'success':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-800 dark:text-blue-200',
          dot: 'bg-blue-500',
          border: 'border-blue-300 dark:border-blue-700',
        };
      default: // idle
        return {
          bg: 'bg-gray-100 dark:bg-gray-800/30',
          text: 'text-gray-600 dark:text-gray-400',
          dot: 'bg-gray-400 dark:bg-gray-600',
          border: 'border-gray-300 dark:border-gray-700',
        };
    }
  };

  const styles = getStatusStyles();
  const dotSize = large ? 'h-3 w-3' : 'h-2 w-2';

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} border rounded-lg
        ${large ? 'p-4' : 'px-3 py-2'}
        transition-colors duration-200
      `}
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`${dotSize} ${styles.dot} rounded-full`} />
          {showPulse && status === 'active' && (
            <div className={`absolute inset-0 ${styles.dot} rounded-full animate-ping opacity-75`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`${large ? 'text-sm' : 'text-xs'} font-medium ${styles.text}`}>
            {label}
          </div>
          {subtitle && (
            <div className={`text-xs ${styles.text} opacity-75 truncate`}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

StatusIndicator.displayName = 'StatusIndicator';
