'use client'

import { useState, useEffect, useRef } from 'react'
import { TranslationResultPayload } from '@live-translation/shared'

export interface TranslationSegment {
  id: string
  originalText: string
  translatedText: string
  isFinal: boolean
  timestamp: Date
  latency?: number
}

interface TranslationDisplayProps {
  segments: TranslationSegment[]
  isActive: boolean
}

export function TranslationDisplay({ segments, isActive }: TranslationDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [segments, autoScroll])

  // Detect manual scrolling
  const handleScroll = () => {
    if (!scrollRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAutoScroll(isAtBottom)
  }

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className={`${isActive ? 'bg-green-100' : 'bg-gray-100'} rounded-full p-4 mb-4`}>
          <svg 
            className={`w-12 h-12 ${isActive ? 'text-green-600' : 'text-gray-600'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isActive ? (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            ) : (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
              />
            )}
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isActive ? 'Listening for translations...' : 'Waiting for session to start'}
        </p>
        <p className="text-sm text-gray-600 max-w-md">
          {isActive 
            ? 'Translated speech will appear here in real-time when the speaker talks.'
            : 'The organizer will start the session soon.'}
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto space-y-4 pr-2"
      >
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={`
              p-4 rounded-lg transition-all duration-300
              ${segment.isFinal 
                ? 'bg-white border-2 border-primary-200' 
                : 'bg-blue-50 border-2 border-blue-200 opacity-80'
              }
            `}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className={`
                text-xs font-medium px-2 py-1 rounded-full
                ${segment.isFinal 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
                }
              `}>
                {segment.isFinal ? '✓ Final' : '⋯ Interim'}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(segment.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <p className={`
              text-base leading-relaxed
              ${segment.isFinal ? 'text-gray-900' : 'text-gray-700'}
            `}>
              {segment.translatedText}
            </p>

            {segment.latency && segment.isFinal && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  Translation latency: {segment.latency}ms
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
          }}
          className="absolute bottom-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          Scroll to latest
        </button>
      )}
    </div>
  )
}
