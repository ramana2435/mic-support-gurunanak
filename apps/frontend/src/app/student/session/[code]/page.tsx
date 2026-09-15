'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { sessionApi, handleApiError } from '@/lib/api'
import { initSocket, connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { 
  Session, Language, SocketEvent, JoinSessionPayload, SessionStatus, 
  TranslationResultPayload, TextRecoveryRequest, TextRecoveryResponse, TextSyncAck,
  TTSAudioChunkPayload, TTSErrorPayload, TTSStatusPayload
} from '@live-translation/shared'
import { LANGUAGE_OPTIONS } from '@live-translation/shared'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { TranslationDisplay, TranslationSegment } from '@/components/TranslationDisplay'
import { useAudioPlayer, BufferStats } from '@/hooks/useAudioPlayer'
import { useBrowserTTS } from '@/hooks/useBrowserTTS'
import { useNetworkQuality } from '@/hooks/useNetworkQuality'
import { 
  NetworkQualityIndicator, 
  NetworkQualityBadge, 
  AudioBufferStatus,
  ConnectionStatusBanner 
} from '@/components/NetworkQualityIndicator'
import toast from 'react-hot-toast'

export default function StudentSessionPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [joinData, setJoinData] = useState<any>(null)
  const [audioStatus, setAudioStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [translationSegments, setTranslationSegments] = useState<TranslationSegment[]>([])
  const [interimSegment, setInterimSegment] = useState<TranslationSegment | null>(null)
  
  // MODULE 7: Text Channel enhancements
  const [lastReceivedSequence, setLastReceivedSequence] = useState<number>(0)
  const [receivedSequences, setReceivedSequences] = useState<Set<number>>(new Set())
  const [textLatency, setTextLatency] = useState<number | null>(null)
  const reconnectAttemptRef = useRef<number>(0)

  // MODULE 8: TTS Audio
  const { audioStatus: ttsAudioStatus, isPlaying: isTTSPlaying, bufferStats, handleAudioChunk, handleError: handleTTSError, reset: resetAudio } = useAudioPlayer()
  const [ttsLatency, setTtsLatency] = useState<number | null>(null)
  
  // Browser-based TTS for student (Web Speech API)
  const { 
    isSupported: ttsSupported, 
    isEnabled: ttsEnabled, 
    isSpeaking: browserSpeaking,
    error: ttsError,
    selectedVoice,
    enableAudio: enableBrowserTTS,
    disableAudio: disableBrowserTTS,
    speak: speakText,
  } = useBrowserTTS(joinData?.selectedLanguage || 'en')
  
  // MODULE 9: Network Quality Monitoring
  const socket = getSocket()
  const { connectionStatus: networkConnectionStatus, networkStats, trackPacket, reset: resetNetworkStats } = useNetworkQuality(socket)
  const [showNetworkDetails, setShowNetworkDetails] = useState(false)

  useEffect(() => {
    // Get join data from sessionStorage
    const dataStr = sessionStorage.getItem('studentJoinData')
    if (!dataStr) {
      router.push(`/join?code=${code}`)
      return
    }

    try {
      const data = JSON.parse(dataStr)
      if (data.sessionCode !== code) {
        router.push(`/join?code=${code}`)
        return
      }
      setJoinData(data)
    } catch {
      router.push(`/join?code=${code}`)
      return
    }
  }, [code, router])

  useEffect(() => {
    if (!joinData) return

    loadSession()
    setupSocket()

    return () => {
      disconnectSocket()
    }
  }, [joinData])

  const loadSession = async () => {
    try {
      const data = await sessionApi.getByCode(code)
      setSession(data)
    } catch (error) {
      toast.error(handleApiError(error))
      router.push('/join')
    } finally {
      setLoading(false)
    }
  }

  const setupSocket = () => {
    const socket = initSocket()
    connectSocket()

    socket.on(SocketEvent.CONNECT, () => {
      setConnected(true)
      setReconnecting(false)
      setConnectionError(null)
      setAudioStatus('connecting')
      
      // Log successful connection
      if (process.env.NODE_ENV === 'development') {
        console.log('[Socket] Connected successfully:', socket?.id)
      }
      
      // On reconnect, request missed messages
      if (reconnectAttemptRef.current > 0 && studentId && joinData) {
        requestMissedMessages(socket)
      }
      
      reconnectAttemptRef.current += 1
      joinSession(socket)
    })

    socket.on(SocketEvent.DISCONNECT, () => {
      setConnected(false)
      setReconnecting(true)
      setAudioStatus('disconnected')
      
      // Log disconnect
      if (process.env.NODE_ENV === 'development') {
        console.log('[Socket] Disconnected from server')
      }
      
      // Don't show repeated toasts - banner will show reconnecting state
    })

    socket.on('reconnect', () => {
      setReconnecting(false)
      setConnectionError(null)
      toast.success('Reconnected!', { duration: 2000 })
    })

    socket.on(SocketEvent.SESSION_STARTED, ({ session: updatedSession }) => {
      setSession(updatedSession)
      setAudioStatus('connected')
      toast.success('Session started!')
    })

    socket.on(SocketEvent.SESSION_STOPPED, ({ session: updatedSession }) => {
      setSession(updatedSession)
      setAudioStatus('disconnected')
      toast('Session stopped by organizer', { icon: '🛑' })
    })

    socket.on(SocketEvent.SESSION_ERROR, ({ error }) => {
      toast.error(error)
    })

    // Listen for translation events with duplicate prevention
    socket.on(SocketEvent.TRANSLATION_INTERIM, (payload: TranslationResultPayload) => {
      handleTranslationMessage(payload, false)
    })

    socket.on(SocketEvent.TRANSLATION_FINAL, (payload: TranslationResultPayload) => {
      handleTranslationMessage(payload, true)
    })

    socket.on(SocketEvent.TRANSLATION_ERROR, ({ error }) => {
      toast.error(`Translation error: ${error}`)
    })

    // MODULE 7: Text recovery response
    socket.on(SocketEvent.TEXT_RECOVERY_RESPONSE, (response: TextRecoveryResponse) => {
      handleRecoveryResponse(response)
    })

    // MODULE 8: TTS audio events
    socket.on(SocketEvent.TTS_AUDIO_CHUNK, (chunk: TTSAudioChunkPayload) => {
      handleAudioChunk(chunk)
      
      // MODULE 9: Track audio packet
      const audioSize = chunk.audioData.length // Base64 string length
      trackPacket(chunk.sequenceNumber * 100 + chunk.chunkIndex, audioSize)
      
      // Track TTS latency from first chunk
      if (chunk.chunkIndex === 0 && chunk.latency) {
        setTtsLatency(chunk.latency.totalLatency)
      }
    })

    socket.on(SocketEvent.TTS_AUDIO_END, (chunk: TTSAudioChunkPayload) => {
      // End marker received
      console.log('TTS audio sequence completed:', chunk.sequenceNumber)
    })

    socket.on(SocketEvent.TTS_ERROR, (error: TTSErrorPayload) => {
      console.error('TTS error:', error.error)
      handleTTSError(error.error)
      
      // Show warning but text continues
      toast.error('Audio interrupted - text translation continues', { 
        duration: 3000,
        icon: '⚠️'
      })
    })

    // Simulate audio connection after successful WebSocket connection
    socket.on(SocketEvent.SESSION_JOINED, () => {
      setTimeout(() => {
        if (session?.status === SessionStatus.ACTIVE) {
          setAudioStatus('connected')
        }
      }, 1000)
    })
  }

  /**
   * Handle translation message with duplicate prevention (MODULE 9 Enhanced)
   */
  const handleTranslationMessage = (payload: TranslationResultPayload, isFinal: boolean) => {
    const { sequenceNumber, translatedText, text, timestamp, latency } = payload
    
    // MODULE 9: Track packet for network quality monitoring
    const estimatedSize = translatedText.length * 2 // Rough estimate in bytes
    trackPacket(sequenceNumber, estimatedSize)
    
    // Duplicate prevention: Skip if already received
    if (receivedSequences.has(sequenceNumber)) {
      console.log(`Duplicate message detected: ${sequenceNumber}`)
      return
    }

    // Measure text delivery latency
    if (latency?.translationResultTimestamp) {
      const deliveryLatency = Date.now() - latency.translationResultTimestamp
      setTextLatency(deliveryLatency)
    }

    const segment: TranslationSegment = {
      id: `${isFinal ? 'final' : 'interim'}-${sequenceNumber}`,
      originalText: text,
      translatedText,
      isFinal,
      timestamp: new Date(timestamp),
      latency: latency?.translationLatency,
    }

    if (isFinal) {
      // Add to received sequences
      setReceivedSequences(prev => new Set(prev).add(sequenceNumber))
      
      // Update last received sequence
      if (sequenceNumber > lastReceivedSequence) {
        setLastReceivedSequence(sequenceNumber)
      }

      // Add to segments list (ordered by sequence number)
      setTranslationSegments(prev => {
        const newSegments = [...prev, segment]
        // Sort by sequence number to handle out-of-order delivery
        newSegments.sort((a, b) => {
          const seqA = parseInt(a.id.split('-')[1])
          const seqB = parseInt(b.id.split('-')[1])
          return seqA - seqB
        })
        return newSegments
      })
      
      // Clear interim segment
      setInterimSegment(null)

      // Browser TTS: Speak translated text if enabled
      if (ttsEnabled && ttsSupported) {
        speakText(translatedText, sequenceNumber)
      }

      // Send acknowledgment
      if (studentId) {
        const ack: TextSyncAck = {
          studentId,
          sequenceNumber,
          timestamp: new Date(),
        }
        getSocket()?.emit(SocketEvent.TEXT_SYNC_ACK, ack)
      }
    } else {
      // Interim message - just update display
      setInterimSegment(segment)
    }
  }

  /**
   * Request missed messages after reconnection
   */
  const requestMissedMessages = (socket: any) => {
    if (!session || !studentId || !joinData) return

    const request: TextRecoveryRequest = {
      sessionId: session.id,
      studentId,
      targetLanguage: joinData.selectedLanguage as Language,
      lastReceivedSequence,
    }

    console.log('Requesting missed messages', request)
    socket.emit(SocketEvent.TEXT_RECOVERY_REQUEST, request)
  }

  /**
   * Handle recovery response
   */
  const handleRecoveryResponse = (response: TextRecoveryResponse) => {
    const { missedMessages, recoveredCount } = response

    if (recoveredCount > 0) {
      console.log(`Recovered ${recoveredCount} missed messages`)
      toast.success(`Recovered ${recoveredCount} missed message${recoveredCount > 1 ? 's' : ''}`)

      // Process each missed message
      missedMessages.forEach((msg: any) => {
        // Only process if not already received
        if (!receivedSequences.has(msg.sequenceNumber)) {
          handleTranslationMessage(msg, true)
        }
      })
    } else {
      console.log('No missed messages to recover')
    }
  }

  const joinSession = (socket: any) => {
    if (!joinData) return

    // Log join attempt
    if (process.env.NODE_ENV === 'development') {
      console.log('[Join] Attempting to join session:', {
        code,
        language: joinData.selectedLanguage,
        hasName: !!joinData.name,
      })
    }

    const payload: JoinSessionPayload = {
      sessionCode: code,
      name: joinData.name,
      selectedLanguage: joinData.selectedLanguage as Language,
    }

    socket.emit(SocketEvent.JOIN_SESSION, payload, (response: any) => {
      if (response.success) {
        setStudentId(response.data.studentId)
        setConnectionError(null)
        toast.success('Joined session successfully!', { duration: 3000 })
        
        // Log successful join
        if (process.env.NODE_ENV === 'development') {
          console.log('[Join] Successfully joined session:', response.data.studentId)
        }
      } else {
        // Handle join failure
        const errorMsg = response.error || 'Failed to join session'
        setConnectionError(errorMsg)
        
        // Log error
        if (process.env.NODE_ENV === 'development') {
          console.error('[Join] Failed to join session:', errorMsg)
        }
        
        // Show error toast (once, not repeatedly)
        toast.error(errorMsg, { duration: 5000 })
        
        // If it's a capacity error, don't redirect immediately
        if (!errorMsg.includes('capacity') && !errorMsg.includes('full')) {
          // For other errors, redirect back to join page after delay
          setTimeout(() => {
            router.push('/join')
          }, 3000)
        }
      }
    })
  }

  const handleLeave = () => {
    if (confirm('Are you sure you want to leave this session?')) {
      sessionStorage.removeItem('studentJoinData')
      disconnectSocket()
      router.push('/')
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to session...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = () => {
    if (!connected) return 'bg-red-500'
    if (reconnecting) return 'bg-yellow-500'
    if (session?.status === SessionStatus.ACTIVE) return 'bg-green-500'
    if (session?.status === SessionStatus.CREATED) return 'bg-blue-500'
    return 'bg-gray-500'
  }

  const getConnectionStatusText = () => {
    if (reconnecting) return 'Reconnecting...'
    if (!connected) return 'Disconnected'
    return 'Connected'
  }

  const getAudioStatusDisplay = () => {
    // MODULE 8: Update audio status based on TTS
    if (ttsAudioStatus === 'playing' && isTTSPlaying) {
      return { color: 'text-green-600', icon: '🔊', text: 'Audio Playing' }
    } else if (ttsAudioStatus === 'interrupted') {
      return { color: 'text-yellow-600', icon: '⚠️', text: 'Audio Interrupted' }
    } else if (ttsAudioStatus === 'error') {
      return { color: 'text-red-600', icon: '❌', text: 'Audio Error' }
    }
    
    // Fallback to connection-based status
    const statusConfig = {
      connecting: { color: 'text-yellow-600', icon: '🔄', text: 'Audio Connecting...' },
      connected: { color: 'text-green-600', icon: '🔊', text: 'Audio Ready' },
      disconnected: { color: 'text-red-600', icon: '🔇', text: 'Audio Disconnected' },
    }
    return statusConfig[audioStatus]
  }

  const getLanguageName = (code: Language): string => {
    const lang = LANGUAGE_OPTIONS.find(l => l.code === code)
    return lang ? `${lang.name} (${lang.nativeName})` : code
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* MODULE 9: Connection Status Banner */}
      <ConnectionStatusBanner 
        status={networkConnectionStatus} 
        onRetry={() => {
          disconnectSocket()
          setTimeout(() => {
            connectSocket()
          }, 500)
        }}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-gray-900 truncate">{session.title}</h1>
                <p className="text-xs text-gray-600">
                  {getConnectionStatusText()} • Code: {code}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLeave}>
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">{connectionError}</p>
                {connectionError.includes('capacity') && (
                  <p className="text-xs text-red-700 mt-1">
                    Please wait a moment and try refreshing the page.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        {/* Session Info Card */}
        <Card className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold mb-2 truncate">
                {session.organizerName}&apos;s Session
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="text-gray-600">Speaker:</span>
                  <span className="font-medium text-gray-900 truncate">
                    {getLanguageName(session.sourceLanguage)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="text-gray-600">Your Language:</span>
                  <span className="font-semibold text-primary-600 truncate">
                    {getLanguageName(joinData?.selectedLanguage as Language)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Status Indicators */}
            <div className="flex sm:flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className={`inline-flex items-center ${getConnectionStatusText() === 'Connected' ? 'text-green-600' : reconnecting ? 'text-yellow-600' : 'text-red-600'}`}>
                  <span className="mr-1">●</span>
                  {getConnectionStatusText()}
                </span>
              </div>
              <div className={`text-xs sm:text-sm flex items-center gap-1 ${getAudioStatusDisplay().color}`}>
                <span>{getAudioStatusDisplay().icon}</span>
                <span>{getAudioStatusDisplay().text}</span>
              </div>
              {/* MODULE 9: Network Quality Badge */}
              <NetworkQualityBadge 
                quality={networkStats.quality} 
                latency={networkStats.latency}
              />
              {/* MODULE 7: Text delivery latency */}
              {textLatency !== null && (
                <div className="text-xs text-gray-600 flex items-center gap-1">
                  <span>📊</span>
                  <span>Text: {textLatency}ms</span>
                </div>
              )}
              {/* MODULE 8: TTS latency */}
              {ttsLatency !== null && (
                <div className="text-xs text-purple-600 flex items-center gap-1">
                  <span>🎵</span>
                  <span>Audio: {ttsLatency}ms</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Live Translation Display */}
        <Card className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Live Translation
            </h3>
            <div className="flex items-center gap-2">
              {/* Browser TTS Control */}
              {ttsSupported && !ttsEnabled && session.status === SessionStatus.ACTIVE && (
                <Button onClick={enableBrowserTTS} size="sm" variant="primary">
                  🔊 Enable Audio
                </Button>
              )}
              {ttsEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    🔊 Audio On {browserSpeaking && '(Speaking)'}
                  </span>
                  <button
                    onClick={disableBrowserTTS}
                    className="text-xs text-gray-600 hover:text-gray-900 underline"
                  >
                    Disable
                  </button>
                </div>
              )}
              {ttsError && (
                <span className="text-xs text-red-600">Audio Error</span>
              )}
              {session.status === SessionStatus.ACTIVE && connected && (
                <span className="text-xs sm:text-sm text-green-600 flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  LIVE
                </span>
              )}
              {/* MODULE 9: Network Details Toggle */}
              <button
                onClick={() => setShowNetworkDetails(!showNetworkDetails)}
                className="text-xs text-gray-600 hover:text-gray-900 underline"
              >
                {showNetworkDetails ? 'Hide' : 'Show'} Network Stats
              </button>
            </div>
          </div>
          
          {/* MODULE 9: Network Quality Details */}
          {showNetworkDetails && (
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NetworkQualityIndicator
                connectionStatus={networkConnectionStatus}
                networkStats={networkStats}
                showDetails={true}
              />
              <AudioBufferStatus
                bufferSize={bufferStats.currentBufferSize}
                bufferedDuration={bufferStats.bufferedDuration}
                underrunCount={bufferStats.underrunCount}
                isPlaying={isTTSPlaying}
              />
            </div>
          )}
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 sm:p-6 min-h-[300px] sm:min-h-[400px] max-h-[60vh] border border-gray-200 relative">
            {session.status === SessionStatus.CREATED && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 sm:py-20">
                <div className="bg-blue-100 rounded-full p-4 mb-4">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">Waiting for Session to Start</p>
                <p className="text-sm text-gray-600 max-w-md">
                  The organizer will start the session soon. Translation will appear here once the session begins.
                </p>
              </div>
            )}
            
            {session.status === SessionStatus.ACTIVE && (
              <TranslationDisplay 
                segments={[...translationSegments, ...(interimSegment ? [interimSegment] : [])]}
                isActive={true}
              />
            )}
            
            {session.status === SessionStatus.STOPPED && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 sm:py-20">
                <div className="bg-red-100 rounded-full p-4 mb-4">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">Session Stopped</p>
                <p className="text-sm text-gray-600 max-w-md">
                  This session has been stopped by the organizer. No further translation will be provided.
                </p>
              </div>
            )}
            
            {session.status === SessionStatus.EXPIRED && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 sm:py-20">
                <div className="bg-gray-100 rounded-full p-4 mb-4">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">Session Expired</p>
                <p className="text-sm text-gray-600 max-w-md">
                  This session has expired and is no longer available.
                </p>
              </div>
            )}

            {!connected && reconnecting && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-gray-700 font-medium">Reconnecting...</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Instructions Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tips for Best Experience
          </h4>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Text translation always works - even if audio is interrupted</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Connect Bluetooth earbuds to your phone for better audio experience</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Keep your device volume at a comfortable level for audio playback</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Monitor network quality indicator for connection status</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Stable WiFi or 4G/5G connection recommended for best quality</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
