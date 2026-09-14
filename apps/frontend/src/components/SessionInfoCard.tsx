/**
 * Session Info Card Component
 * MODULE 15: Display session code, QR code, and connected students
 */

import React from 'react';
import QRCode from 'react-qr-code';
import { Card } from './Card';
import { Button } from './Button';

interface SessionInfoCardProps {
  sessionCode: string;
  sessionTitle: string;
  sourceLanguage: string;
  targetLanguages: string[];
  connectedStudents: number;
  maxStudents: number;
  joinUrl: string;
  status: 'created' | 'active' | 'stopped' | 'expired';
}

export const SessionInfoCard: React.FC<SessionInfoCardProps> = React.memo(({
  sessionCode,
  sessionTitle,
  sourceLanguage,
  targetLanguages,
  connectedStudents,
  maxStudents,
  joinUrl,
  status,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'stopped':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-900">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Session Info */}
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {sessionTitle}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyles()}`}>
                {status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share this code with students to join
            </p>
          </div>

          {/* Session Code */}
          <div className="bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 p-6 rounded-xl border-2 border-primary-200 dark:border-primary-800">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Code
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-5xl font-black tracking-wider text-primary-600 dark:text-primary-400 font-mono">
                {sessionCode}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Speaker Language</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
                {sourceLanguage}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Languages</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {targetLanguages.length} languages
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg col-span-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Connected Students</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {connectedStudents}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  / {maxStudents} max
                </span>
              </div>
              <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-600 h-full transition-all duration-300"
                  style={{ width: `${Math.min((connectedStudents / maxStudents) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: QR Code */}
        <div className="flex flex-col items-center justify-center lg:border-l dark:border-gray-700 lg:pl-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700">
            <QRCode
              value={joinUrl}
              size={180}
              level="M"
              className="w-full h-auto"
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center max-w-[200px]">
            Scan QR code to join
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyUrl}
            className="mt-2"
          >
            Copy Join URL
          </Button>
        </div>
      </div>
    </Card>
  );
});

SessionInfoCard.displayName = 'SessionInfoCard';
