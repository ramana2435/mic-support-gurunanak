import { useState, useEffect, useRef, useCallback } from 'react'

export interface AudioDevice {
  deviceId: string
  label: string
  kind: string
}

export interface MicrophoneState {
  permission: 'prompt' | 'granted' | 'denied'
  isCapturing: boolean
  selectedDeviceId: string | null
  audioLevel: number
  error: string | null
}

export const useMicrophone = () => {
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [state, setState] = useState<MicrophoneState>({
    permission: 'prompt',
    isCapturing: false,
    selectedDeviceId: null,
    audioLevel: 0,
    error: null,
  })

  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  /**
   * Request microphone permission and enumerate devices
   */
  const requestPermission = useCallback(async () => {
    try {
      // Request permission with a temporary stream
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Stop the temporary stream immediately
      tempStream.getTracks().forEach(track => track.stop())

      setState(prev => ({ ...prev, permission: 'granted', error: null }))
      
      // Now enumerate devices (labels will be available after permission)
      await enumerateDevices()
      
      return true
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setState(prev => ({
          ...prev,
          permission: 'denied',
          error: 'Microphone permission denied. Please allow microphone access in your browser settings.',
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: `Failed to access microphone: ${error.message}`,
        }))
      }
      return false
    }
  }, [])

  /**
   * Enumerate available audio input devices
   */
  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = allDevices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.substring(0, 8)}`,
          kind: device.kind,
        }))

      setDevices(audioInputs)

      // Auto-select first device if none selected and devices are available
      if (audioInputs.length > 0 && !state.selectedDeviceId) {
        setState(prev => ({
          ...prev,
          selectedDeviceId: audioInputs[0].deviceId,
        }))
      }

      if (audioInputs.length === 0) {
        setState(prev => ({
          ...prev,
          error: 'No microphone input detected.',
        }))
      }

      return audioInputs
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: `Failed to enumerate devices: ${error.message}`,
      }))
      return []
    }
  }, [state.selectedDeviceId])

  /**
   * Start capturing audio from selected device
   */
  const startCapture = useCallback(async (deviceId: string) => {
    try {
      // Stop any existing stream first
      stopCapture()

      // Verify device exists
      const device = devices.find(d => d.deviceId === deviceId)
      if (!device) {
        throw new Error('Selected device not found')
      }

      // Start capture with specific device
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // Setup audio analysis for level meter
      setupAudioAnalysis(stream)

      setState(prev => ({
        ...prev,
        isCapturing: true,
        selectedDeviceId: deviceId,
        error: null,
      }))

      return stream
    } catch (error: any) {
      let errorMessage = `Failed to start capture: ${error.message}`
      
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Selected microphone not found. It may have been disconnected.'
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Microphone is already in use by another application.'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Selected microphone does not meet the required constraints.'
      }

      setState(prev => ({
        ...prev,
        isCapturing: false,
        error: errorMessage,
      }))

      // Re-enumerate devices in case one was disconnected
      await enumerateDevices()

      return null
    }
  }, [devices, enumerateDevices])

  /**
   * Stop capturing audio
   */
  const stopCapture = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    setState(prev => ({
      ...prev,
      isCapturing: false,
      audioLevel: 0,
    }))
  }, [])

  /**
   * Setup audio analysis for level meter
   */
  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      microphone.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Start level monitoring
      updateAudioLevel()
    } catch (error) {
      console.error('Failed to setup audio analysis:', error)
    }
  }

  /**
   * Update audio level for meter
   */
  const updateAudioLevel = () => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const normalizedLevel = Math.min(100, (average / 255) * 100)

    setState(prev => ({
      ...prev,
      audioLevel: normalizedLevel,
    }))

    // Continue monitoring
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }

  /**
   * Select a device
   */
  const selectDevice = useCallback((deviceId: string) => {
    setState(prev => ({
      ...prev,
      selectedDeviceId: deviceId,
    }))
  }, [])

  /**
   * Check if selected device is still available
   */
  const isDeviceAvailable = useCallback((deviceId: string): boolean => {
    return devices.some(d => d.deviceId === deviceId)
  }, [devices])

  /**
   * Get current stream
   */
  const getStream = useCallback((): MediaStream | null => {
    return streamRef.current
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [stopCapture])

  /**
   * Monitor device changes
   */
  useEffect(() => {
    const handleDeviceChange = () => {
      enumerateDevices()
      
      // Check if currently capturing device is still available
      if (state.isCapturing && state.selectedDeviceId) {
        if (!isDeviceAvailable(state.selectedDeviceId)) {
          stopCapture()
          setState(prev => ({
            ...prev,
            error: 'Selected microphone was disconnected.',
          }))
        }
      }
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [enumerateDevices, isDeviceAvailable, state.isCapturing, state.selectedDeviceId, stopCapture])

  return {
    devices,
    state,
    requestPermission,
    enumerateDevices,
    startCapture,
    stopCapture,
    selectDevice,
    getStream,
    isDeviceAvailable,
  }
}
