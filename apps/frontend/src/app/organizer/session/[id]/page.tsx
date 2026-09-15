'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { sessionApi, handleApiError } from '@/lib/api'
import { Session, SessionStatus } from '@live-translation/shared'
import { initSocket, connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { SocketEvent } from '@live-translation/shared'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { MicrophoneSetup } from '@/components/MicrophoneSetup'
import { SessionInfoCard } from '@/components/SessionInfoCard'
import { SystemHealthMonitor, SystemHealth, LatencyMetrics } from '@/components/SystemHealthMonitor'
import { StatusType } from '@/components/StatusIndicator'
import { useAudioStreaming } from '@/hooks/useAudioStreaming'
import toast from 'react-hot-toast'

export default function SessionManagePage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const { isAuthenticated, initAuth } = useAuthStore()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrValue, setQrValue] = useState('')
  const [connectedStudents, setConnectedStudents] = useState(0)
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null)
  const [sttActive, setSttActive] = useState(false)
  const [translationActive, setTranslationActive] = useState(false)
  const [ttsActive, setTtsActive] = useState(false)
  const [connected, setConnected] = useState(false)

  // Audio streaming hook
  const { isStreaming } = useAudioStreaming({
    sessionId,
    enabled: sttActive && session?.status === SessionStatus.ACTIVE,
    stream: microphoneStream,
  })

  // System health state - memoized to prevent re-renders
  const systemHealth: SystemHealth = useMemo(() => ({
    microphone: microphoneStream ? 'active' : 'idle',
    stt: sttActive ? 'active' : 'idle',
    translation: translationActive ? 'active' : 'idle',
    tts: ttsActive ? 'active' : 'idle',
    connection: connected ? 'active' : 'error',
  }), [microphoneStream, sttActive, translationActive, ttsActive, connected])

  // Mock latency metrics (TODO: integrate real metrics when available)
  const latencyMetrics: LatencyMetrics = useMemo(() => ({
    p50: 120,
    p95: 250,
    p99: 380,
  }), [])

  useEffect(() => {
    initAuth()
  }, [initAuth])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/organizer/login')
      return
    }

    loadSession()
    setupSocket()

    return () => {
      disconnectSocket()
    }
  }, [isAuthenticated, sessionId, router])

  const loadSession = async () => {
    try {
      const data = await sessionApi.getById(sessionId)
      setSession(data)
      setQrValue(`${window.location.origin}/join?code=${data.code}`)
    } catch (error) {
      toast.error(handleApiError(error))
      router.push('/organizer/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const setupSocket = () => {
    const socket = initSocket()
    connectSocket()

    socket.on('connect', () => {
      setConnected(true)
      toast.success('Connected to server')
    })

    socket.on('disconnect', () => {
      setConnected(false)
      toast.error('Disconnected from server')
    })

    // Join the session room to receive updates
    socket.emit('join:organizer:room', sessionId)

    socket.on(SocketEvent.SESSION_STARTED, ({ session: updatedSession }) => {
      setSession(updatedSession)
      toast.success('Session started!')
    })

    socket.on(SocketEvent.SESSION_STOPPED, ({ session: updatedSession }) => {
      setSession(updatedSession)
      toast.success('Session stopped')
    })

    socket.on(SocketEvent.STUDENT_JOINED, ({ student }) => {
      toast.success(`${student.name || 'A student'} joined`)
    })

    socket.on(SocketEvent.STUDENT_LEFT, ({ studentId }) => {
      toast('A student left')
    })

    socket.on(SocketEvent.STUDENTS_COUNT_UPDATED, ({ count }) => {
      setConnectedStudents(count)
    })

    // Listen for translation activity
    socket.on(SocketEvent.TRANSLATION_FINAL, () => {
      setTranslationActive(true)
      // Reset after a delay to show activity
      setTimeout(() => setTranslationActive(false), 500)
    })

    socket.on('tts:status', (status: { active: boolean }) => {
      setTtsActive(status.active)
    })
  }

  const handleStartSession = useCallback(() => {
    const socket = getSocket()
    if (socket) {
      socket.emit(SocketEvent.START_SESSION, sessionId)
    }
  }, [sessionId])

  const handleStopSession = useCallback(() => {
    if (confirm('Are you sure you want to stop this session? Students will not be able to join anymore.')) {
      const socket = getSocket()
      if (socket) {
        socket.emit(SocketEvent.STOP_SESSION, sessionId)
      }
    }
  }, [sessionId])

  const handleMicrophoneStreamReady = useCallback((stream: MediaStream) => {
    setMicrophoneStream(stream)
    console.log('[Organizer] Microphone stream ready:', stream.id)
  }, [])

  const handleMicrophoneStreamStopped = useCallback(() => {
    setMicrophoneStream(null)
    console.log('[Organizer] Microphone stream stopped')
    
    // Stop STT when microphone stops
    if (sttActive) {
      handleStopSTT()
    }
  }, [sttActive])

  const handleStartSTT = useCallback(() => {
    if (!session || !microphoneStream) {
      console.error('[Organizer] Cannot start STT:', { 
        hasSession: !!session, 
        hasMicrophone: !!microphoneStream 
      })
      toast.error('Please start microphone capture first')
      return
    }

    const socket = getSocket()
    if (socket) {
      console.log('[Organizer] Starting STT:', {
        sessionId: session.id,
        language: session.sourceLanguage,
        sessionStatus: session.status
      })
      socket.emit(SocketEvent.STT_START, {
        sessionId: session.id,
        language: session.sourceLanguage,
      })
      setSttActive(true)
      toast.success('Speech-to-text started')
    }
  }, [session, microphoneStream])

  // Auto-start STT when session becomes ACTIVE and microphone is ready
  useEffect(() => {
    if (session?.status === SessionStatus.ACTIVE && microphoneStream && !sttActive) {
      console.log('[Organizer] Auto-starting STT (session became ACTIVE)')
      handleStartSTT()
    }
  }, [session?.status, microphoneStream, sttActive, handleStartSTT])
  const handleStopSTT = useCallback(() => {
    const socket = getSocket()
    if (socket) {
      socket.emit(SocketEvent.STT_STOP, sessionId)
      setSttActive(false)
      toast('Speech-to-text stopped')
    }
  }, [sessionId])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }, [])

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const canStartSession = session.status === SessionStatus.CREATED
  const canStopSession = session.status === SessionStatus.ACTIVE
  const isSessionActive = session.status === SessionStatus.ACTIVE
  const joinUrl = qrValue

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link 
            href="/organizer/dashboard" 
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Session Info Card with QR Code */}
        <div className="mb-6">
          <SessionInfoCard
            sessionCode={session.code}
            sessionTitle={session.title || `Session ${session.code}`}
            sourceLanguage={session.sourceLanguage}
            targetLanguages={session.targetLanguages}
            connectedStudents={connectedStudents}
            maxStudents={session.maxStudents}
            joinUrl={joinUrl}
            status={session.status}
          />
        </div>

        {/* Session Controls */}
        <div className="mb-6">
          <Card className="bg-white dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Session Controls
            </h3>
            <div className="flex flex-wrap gap-3">
              {canStartSession && (
                <Button onClick={handleStartSession} size="lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Session
                </Button>
              )}
              {canStopSession && (
                <Button onClick={handleStopSession} variant="danger" size="lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Stop Session
                </Button>
              )}
              {!sttActive && microphoneStream && isSessionActive && (
                <Button onClick={handleStartSTT} size="lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Start Transcription
                </Button>
              )}
              {sttActive && (
                <Button onClick={handleStopSTT} variant="danger" size="lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Stop Transcription
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* System Health Monitor */}
        <div className="mb-6">
          <SystemHealthMonitor 
            health={systemHealth}
            latency={latencyMetrics}
          />
        </div>

        {/* Microphone Setup */}
        <div>
          <MicrophoneSetup
            onStreamReady={handleMicrophoneStreamReady}
            onStreamStopped={handleMicrophoneStreamStopped}
          />
        </div>
      </main>
    </div>
  )
}

