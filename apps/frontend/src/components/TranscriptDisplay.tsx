import React, { useState, useEffect, useRef } from 'react'
import { getSocket } from '@/lib/socket'
import { SocketEvent, STTResultPayload } from '@live-translation/shared'
import { Card } from './Card'

interface TranscriptDisplayProps {
  sessionId: string
}

interface TranscriptEntry {
  id: string
  text: string
  isFinal: boolean
  timestamp: Date
  sequenceNumber: number
  confidence?: number
  latency?: number
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ sessionId }) => {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [interimText, setInterimText] = useState<string>('')
  const [latencyStats, setLatencyStats] = useState({
    current: 0,
    average: 0,
    min: Infinity,
    max: 0,
    count: 0,
  })
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Listen for interim results
    const handleInterim = (payload: STTResultPayload) => {
      if (payload.sessionId !== sessionId) return

      setInterimText(payload.text)

      // Update latency stats
      if (payload.latency) {
        updateLatencyStats(payload.latency.totalLatency)
      }
    }

    // Listen for final results
    const handleFinal = (payload: STTResultPayload) => {
      if (payload.sessionId !== sessionId) return

      const entry: TranscriptEntry = {
        id: `${payload.sequenceNumber}-${Date.now()}`,
        text: payload.text,
        isFinal: true,
        timestamp: new Date(payload.timestamp),
        sequenceNumber: payload.sequenceNumber,
        confidence: payload.confidence,
        latency: payload.latency?.totalLatency,
      }

      setTranscripts(prev => [...prev, entry])
      setInterimText('')

      // Update latency stats
      if (payload.latency) {
        updateLatencyStats(payload.latency.totalLatency)
      }
    }

    // Listen for errors
    const handleError = (payload: any) => {
      if (payload.sessionId !== sessionId) return
      console.error('STT Error:', payload.error)
    }

    socket.on(SocketEvent.STT_INTERIM, handleInterim)
    socket.on(SocketEvent.STT_FINAL, handleFinal)
    socket.on(SocketEvent.STT_ERROR, handleError)

    return () => {
      socket.off(SocketEvent.STT_INTERIM, handleInterim)
      socket.off(SocketEvent.STT_FINAL, handleFinal)
      socket.off(SocketEvent.STT_ERROR, handleError)
    }
  }, [sessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts, interimText])

  const updateLatencyStats = (latency: number) => {
    setLatencyStats(prev => {
      const newCount = prev.count + 1
      const newAverage = (prev.average * prev.count + latency) / newCount
      return {
        current: latency,
        average: newAverage,
        min: Math.min(prev.min, latency),
        max: Math.max(prev.max, latency),
        count: newCount,
      }
    })
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getLatencyColor = (latency: number): string => {
    if (latency < 500) return 'text-green-600'
    if (latency < 1000) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Live Transcript
        </h3>
        
        {latencyStats.count > 0 && (
          <div className="text-xs text-gray-600">
            <span className={`font-medium ${getLatencyColor(latencyStats.current)}`}>
              {Math.round(latencyStats.current)}ms
            </span>
            {' '}
            <span className="text-gray-400">
              (avg: {Math.round(latencyStats.average)}ms)
            </span>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] max-h-[500px] overflow-y-auto border border-gray-200">
        {transcripts.length === 0 && !interimText && (
          <div className="text-center text-gray-400 py-20">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-sm">Waiting for speech...</p>
            <p className="text-xs mt-1">Speak into your microphone to see live transcription</p>
          </div>
        )}

        {transcripts.map((entry, index) => (
          <div key={entry.id} className="mb-3 group">
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 mt-1 min-w-[70px]">
                {formatTime(entry.timestamp)}
              </span>
              <div className="flex-1">
                <p className="text-gray-900 leading-relaxed">
                  {entry.text}
                </p>
                {entry.confidence && (
                  <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {Math.round(entry.confidence * 100)}% confident
                  </span>
                )}
              </div>
              {entry.latency && (
                <span className={`text-xs ${getLatencyColor(entry.latency)} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  {Math.round(entry.latency)}ms
                </span>
              )}
            </div>
          </div>
        ))}

        {interimText && (
          <div className="mb-3 opacity-60">
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 mt-1 min-w-[70px]">
                {formatTime(new Date())}
              </span>
              <div className="flex-1">
                <p className="text-gray-600 leading-relaxed italic">
                  {interimText}
                  <span className="inline-block w-1 h-4 bg-primary-500 ml-1 animate-pulse"></span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {latencyStats.count > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">Current:</span>{' '}
            <span className={getLatencyColor(latencyStats.current)}>
              {Math.round(latencyStats.current)}ms
            </span>
          </div>
          <div>
            <span className="font-medium">Avg:</span> {Math.round(latencyStats.average)}ms
          </div>
          <div>
            <span className="font-medium">Min:</span> {Math.round(latencyStats.min)}ms
          </div>
          <div>
            <span className="font-medium">Max:</span> {Math.round(latencyStats.max)}ms
          </div>
        </div>
      )}
    </Card>
  )
}
