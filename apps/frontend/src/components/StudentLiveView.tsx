/**
 * Student Live Translation View Component
 * MODULE 15: Mobile-first, large readable text, minimal distractions
 */

import React from 'react';
import { StatusIndicator, StatusType } from './StatusIndicator';

interface StudentLiveViewProps {
  sessionName: string;
  speakerLanguage: string;
  selectedLanguage: string;
  connectionStatus: StatusType;
  audioStatus: StatusType;
  translatedText: string;
  originalText?: string;
  showOriginal?: boolean;
  onToggleOriginal?: () => void;
}

export const StudentLiveView: React.FC<StudentLiveViewProps> = React.memo(({
  sessionName,
  speakerLanguage,
  selectedLanguage,
  connectionStatus,
  audioStatus,
  translatedText,
  originalText,
  showOriginal = false,
  onToggleOriginal,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header - Always visible */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">
              🎙️ LIVE TRANSLATION
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {sessionName}
            </p>
          </div>

          {/* Status Row */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <StatusIndicator
              status={connectionStatus}
              label="Connection"
              subtitle={connectionStatus === 'active' ? 'Connected' : 'Disconnected'}
            />
            <StatusIndicator
              status={audioStatus}
              label="Audio"
              subtitle={audioStatus === 'active' ? 'Playing' : 'Paused'}
            />
          </div>

          {/* Languages */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">From:</span>
              <span className="font-semibold text-gray-900 dark:text-white uppercase">
                {speakerLanguage}
              </span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 px-3 py-2 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">To:</span>
              <span className="font-semibold text-primary-700 dark:text-primary-300 uppercase">
                {selectedLanguage}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Translated Text - Large and Readable */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 mb-6 min-h-[300px]">
            {translatedText ? (
              <>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4 font-semibold">
                  Translation ({selectedLanguage})
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl leading-relaxed text-gray-900 dark:text-white font-medium break-words">
                  {translatedText}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg
                  className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
                <p className="text-lg text-gray-500 dark:text-gray-400">
                  Waiting for translation...
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  The speaker will begin shortly
                </p>
              </div>
            )}
          </div>

          {/* Original Text - Optional, Collapsible */}
          {originalText && onToggleOriginal && (
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl overflow-hidden">
              <button
                onClick={onToggleOriginal}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Original Text ({speakerLanguage})
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${showOriginal ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showOriginal && (
                <div className="px-6 py-4 border-t dark:border-gray-700">
                  <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                    {originalText}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer - Connection Help */}
      {connectionStatus !== 'active' && (
        <footer className="bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3 text-sm">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-yellow-800 dark:text-yellow-300">
              Connection lost. Attempting to reconnect...
            </p>
          </div>
        </footer>
      )}
    </div>
  );
});

StudentLiveView.displayName = 'StudentLiveView';
