/**
 * Text-Only Mode Component
 * MODULE 13: Fallback mode when audio fails
 * 
 * CRITICAL: Text translation continues even when audio fails
 * Clear UI indication that audio is unavailable
 * User can still read translations in real-time
 */

import React from 'react';

interface TextOnlyModeProps {
  reason: string;
  canRetryAudio: boolean;
  onRetryAudio?: () => void;
}

export const TextOnlyMode: React.FC<TextOnlyModeProps> = ({
  reason,
  canRetryAudio,
  onRetryAudio,
}) => {
  return (
    <div className="text-only-mode-banner">
      <div className="text-only-content">
        <div className="text-only-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <line x1="12" y1="20" x2="12" y2="20" />
            <path d="m19 10-7 7-7-7" />
          </svg>
        </div>
        
        <div className="text-only-message">
          <strong>Text-Only Mode</strong>
          <p>{reason}</p>
          <p className="text-only-assurance">
            ✓ Text translations are still working
          </p>
        </div>

        {canRetryAudio && onRetryAudio && (
          <button
            onClick={onRetryAudio}
            className="text-only-retry-button"
          >
            Retry Audio
          </button>
        )}
      </div>

      <style jsx>{`
        .text-only-mode-banner {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .text-only-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .text-only-icon {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f59e0b;
        }

        .text-only-message {
          flex: 1;
        }

        .text-only-message strong {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 4px;
        }

        .text-only-message p {
          margin: 4px 0;
          font-size: 14px;
          color: #78350f;
        }

        .text-only-assurance {
          font-weight: 500;
          color: #065f46 !important;
          margin-top: 8px !important;
        }

        .text-only-retry-button {
          flex-shrink: 0;
          padding: 8px 16px;
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .text-only-retry-button:hover {
          background: #d97706;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .text-only-retry-button:active {
          transform: translateY(0);
        }

        @media (max-width: 640px) {
          .text-only-content {
            flex-direction: column;
            text-align: center;
          }

          .text-only-retry-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Hook to manage text-only mode state
 */
export function useTextOnlyMode() {
  const [isTextOnly, setIsTextOnly] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const enableTextOnlyMode = React.useCallback((errorReason: string) => {
    console.log('[TextOnlyMode] Enabled:', errorReason);
    setIsTextOnly(true);
    setReason(errorReason);
  }, []);

  const disableTextOnlyMode = React.useCallback(() => {
    console.log('[TextOnlyMode] Disabled');
    setIsTextOnly(false);
    setReason('');
  }, []);

  return {
    isTextOnly,
    reason,
    enableTextOnlyMode,
    disableTextOnlyMode,
  };
}
