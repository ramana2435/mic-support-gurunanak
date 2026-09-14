/**
 * Student Session Page - Enhanced Professional UI
 * MODULE 15: Mobile-first, large readable text, minimal distractions
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { sessionApi, handleApiError } from '@/lib/api'
import { initSocket, connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { 
  Session, Language, SocketEvent, SessionStatus, 
  TranslationResultPayload
} from '@live-translation/shared'
import { StudentLiveView } from '@/components/StudentLiveView'
import { StatusType } from '@/components/StatusIndicator'
import toast from 'react-hot-toast'

export default function StudentSessionPageEnhanced() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [joinData, setJoinData] = useState<any>(null)
  const [audioStatus, setAudioStatus] = useState<'idle' | 'playing' | 'paused'>('idle')
  
  // Translation state
  const [currentTranslatedText, setCurrentTranslatedText] = useState<string>('')
  const [currentOriginalText, setCurrentOriginalText] = useState<string>('')
  const [showOriginal, setShowOriginal] = useState(false)

  // Memoized status for performance
  const connectionStatus: StatusType = useMemo(() => {
    return connected ? 'active' : 'error'
  }, [connected])

  const audioStatusType: StatusType = useMemo(() => {
    switch (audioStatus) {
      case 'playing':
        return 'active'
      case 'paused':
        return 'warning'
      default:
        return 'idle'
    }
  }, [audioStatus])

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
      joinSession(socket)
    })

    socket.on(SocketEvent.DISCONNECT, () => {
      setConnected(false)
      setAudioStatus('paused')
      toast.error('Disconnected. Reconnecting...', { duration: 2000 })
    })

    socket.on('reconnect', () => {
      toast.success('Reconnected!', { duration: 2000 })
    })

    socket.on(SocketEvent.SESSION_STARTED, ({ session: updatedSession }) => {
      setSession(updatedSession)
      setAudioStatus('playing')
      toast.success('Session started!', { duration: 2000 })
    })

    socket.on(SocketEvent.SESSION_STOPPED, ({ session: updatedSession }) => {
      setSession(updatedSession)
      setAudioStatus('paused')
      toast('Session stopped by organizer', { icon: '🛑', duration: 3000 })
    })

    socket.on(SocketEvent.SESSION_JOINED, () => {
      if (session?.status === SessionStatus.ACTIVE) {
        setAudioStatus('playing')
      }
    })

    // Listen for translation events
    socket.on(SocketEvent.TRANSLATION_INTERIM, (payload: TranslationResultPayload) => {
      handleTranslation(payload, false)
    })

    socket.on(SocketEvent.TRANSLATION_FINAL, (payload: TranslationResultPayload) => {
      handleTranslation(payload, true)
    })

    socket.on(SocketEvent.TRANSLATION_ERROR, ({ error }) => {
      toast.error(`Translation error: ${error}`, { duration: 3000 })
    })

    // TTS audio status
    socket.on(SocketEvent.TTS_AUDIO_CHUNK, () => {
      setAudioStatus('playing')
    })

    socket.on(SocketEvent.TTS_ERROR, () => {
      toast.error('Audio interrupted - text continues', { 
        duration: 2000,
        icon: '⚠️'
      })
    })
  }

  const joinSession = (socket: any) => {
    if (!joinData || !session) return

    const payload = {
      code,
      name: joinData.name || 'Anonymous',
      language: joinData.selectedLanguage,
    }

    socket.emit(SocketEvent.JOIN_SESSION, payload)
  }

  const handleTranslation = useCallback((payload: TranslationResultPayload, isFinal: boolean) => {
    // Update displayed text with latest translation
    setCurrentTranslatedText(payload.translatedText)
    setCurrentOriginalText(payload.text)
  }, [])

  const handleToggleOriginal = useCallback(() => {
    setShowOriginal(prev => !prev)
  }, [])

  if (loading || !session || !joinData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    )
  }

  return (
    <StudentLiveView
      sessionName={session.title || `Session ${code}`}
      speakerLanguage={session.sourceLanguage}
      selectedLanguage={joinData.selectedLanguage}
      connectionStatus={connectionStatus}
      audioStatus={audioStatusType}
      translatedText={currentTranslatedText}
      originalText={currentOriginalText}
      showOriginal={showOriginal}
      onToggleOriginal={handleToggleOriginal}
    />
  )
}
