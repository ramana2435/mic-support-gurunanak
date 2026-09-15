import { useEffect, useRef, useCallback } from 'react'
import { getSocket } from '@/lib/socket'
import { SocketEvent } from '@live-translation/shared'

interface UseAudioStreamingProps {
  sessionId: string
  enabled: boolean
  stream: MediaStream | null
}

export const useAudioStreaming = ({ sessionId, enabled, stream }: UseAudioStreamingProps) => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const isStreamingRef = useRef(false)

  const startStreaming = useCallback(() => {
    if (!stream || !enabled || isStreamingRef.current) {
      console.log('[AudioStreaming] Cannot start:', { 
        hasStream: !!stream, 
        enabled, 
        alreadyStreaming: isStreamingRef.current 
      })
      return
    }

    try {
      const socket = getSocket()
      if (!socket) {
        console.error('[AudioStreaming] Socket not available')
        return
      }

      console.log('[AudioStreaming] Starting audio streaming', { sessionId })

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source

      // Create script processor for audio data
      // Note: ScriptProcessorNode is deprecated but still widely supported
      // In production, use AudioWorklet for better performance
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      let chunkCount = 0
      processor.onaudioprocess = (e) => {
        if (!isStreamingRef.current) return

        const inputData = e.inputBuffer.getChannelData(0)
        
        // Convert Float32Array to Int16Array (PCM 16-bit)
        const pcmData = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }

        chunkCount++
        if (chunkCount <= 3 || chunkCount % 20 === 0) {
          console.log('[AudioStreaming] Sending audio chunk', {
            sessionId,
            chunkNumber: chunkCount,
            size: pcmData.buffer.byteLength,
          })
        }

        // Send audio data to backend
        socket.emit(SocketEvent.AUDIO_STREAM, {
          sessionId,
          audio: pcmData.buffer,
          timestamp: Date.now(),
        })
      }

      // Connect nodes
      source.connect(processor)
      processor.connect(audioContext.destination)

      isStreamingRef.current = true
      console.log('[AudioStreaming] Audio streaming started successfully', { 
        sessionId,
        sampleRate: audioContext.sampleRate,
        bufferSize: processor.bufferSize,
      })
    } catch (error) {
      console.error('[AudioStreaming] Failed to start audio streaming:', error)
    }
  }, [stream, enabled, sessionId])

  const stopStreaming = useCallback(() => {
    if (!isStreamingRef.current) return

    try {
      // Disconnect nodes
      if (processorRef.current) {
        processorRef.current.disconnect()
        processorRef.current = null
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = null
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      isStreamingRef.current = false
      console.log('Audio streaming stopped', { sessionId })
    } catch (error) {
      console.error('Failed to stop audio streaming:', error)
    }
  }, [sessionId])

  // Start/stop streaming based on enabled flag and stream availability
  useEffect(() => {
    if (enabled && stream) {
      startStreaming()
    } else {
      stopStreaming()
    }

    return () => {
      stopStreaming()
    }
  }, [enabled, stream, startStreaming, stopStreaming])

  return {
    isStreaming: isStreamingRef.current,
    startStreaming,
    stopStreaming,
  }
}
