import React, { useEffect } from 'react'
import { useMicrophone } from '@/hooks/useMicrophone'
import { Button } from './Button'
import { Card } from './Card'

interface MicrophoneSetupProps {
  onStreamReady?: (stream: MediaStream) => void
  onStreamStopped?: () => void
}

export const MicrophoneSetup: React.FC<MicrophoneSetupProps> = ({
  onStreamReady,
  onStreamStopped,
}) => {
  const {
    devices,
    state,
    requestPermission,
    startCapture,
    stopCapture,
    selectDevice,
    getStream,
  } = useMicrophone()

  useEffect(() => {
    // Check permission status on mount
    if (state.permission === 'prompt') {
      // Don't auto-request, let user initiate
    }
  }, [state.permission])

  useEffect(() => {
    // Notify parent when stream changes
    if (state.isCapturing) {
      const stream = getStream()
      if (stream && onStreamReady) {
        onStreamReady(stream)
      }
    } else {
      if (onStreamStopped) {
        onStreamStopped()
      }
    }
  }, [state.isCapturing, getStream, onStreamReady, onStreamStopped])

  const handleRequestPermission = async () => {
    await requestPermission()
  }

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectDevice(e.target.value)
  }

  const handleStartCapture = async () => {
    if (state.selectedDeviceId) {
      await startCapture(state.selectedDeviceId)
    }
  }

  const handleStopCapture = () => {
    stopCapture()
  }

  const getPermissionIcon = () => {
    if (state.permission === 'granted') return '🟢'
    if (state.permission === 'denied') return '🔴'
    return '🟡'
  }

  const getPermissionText = () => {
    if (state.permission === 'granted') return 'Granted'
    if (state.permission === 'denied') return 'Denied'
    return 'Not Requested'
  }

  const getConnectionIcon = () => {
    if (!state.selectedDeviceId) return '⚪'
    const device = devices.find(d => d.deviceId === state.selectedDeviceId)
    return device ? '🟢' : '🔴'
  }

  const getConnectionText = () => {
    if (!state.selectedDeviceId) return 'No Device Selected'
    const device = devices.find(d => d.deviceId === state.selectedDeviceId)
    return device ? 'Connected' : 'Disconnected'
  }

  const getCaptureIcon = () => {
    return state.isCapturing ? '🟢' : '⚪'
  }

  const getCaptureText = () => {
    return state.isCapturing ? 'Capturing' : 'Stopped'
  }

  const renderAudioLevelMeter = () => {
    const level = Math.min(100, Math.max(0, state.audioLevel))
    const barCount = 20
    const filledBars = Math.round((level / 100) * barCount)

    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5 flex-1">
          {Array.from({ length: barCount }).map((_, i) => (
            <div
              key={i}
              className={`h-6 flex-1 rounded-sm transition-colors ${
                i < filledBars
                  ? i < barCount * 0.7
                    ? 'bg-green-500'
                    : i < barCount * 0.9
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600 w-12 text-right">
          {Math.round(level)}%
        </span>
      </div>
    )
  }

  // Permission not granted yet
  if (state.permission !== 'granted') {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4">Microphone Setup</h3>
        
        {state.permission === 'prompt' && (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Microphone Access Required
            </h4>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              To capture live audio from your microphone, we need permission to access your audio input devices.
            </p>
            <Button onClick={handleRequestPermission}>
              Grant Microphone Permission
            </Button>
          </div>
        )}

        {state.permission === 'denied' && (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-red-900 mb-2">
              Microphone Permission Denied
            </h4>
            <p className="text-red-700 mb-4 max-w-md mx-auto">
              {state.error || 'Microphone access was denied. Please enable microphone permissions in your browser settings and try again.'}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
              <p className="text-sm text-red-800 font-medium mb-2">How to enable microphone:</p>
              <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
                <li>Click the lock/info icon in your browser&apos;s address bar</li>
                <li>Find &quot;Microphone&quot; in the permissions list</li>
                <li>Change permission to &quot;Allow&quot;</li>
                <li>Refresh this page</li>
              </ol>
            </div>
            <Button onClick={handleRequestPermission}>
              Try Again
            </Button>
          </div>
        )}
      </Card>
    )
  }

  // No devices available
  if (devices.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4">Microphone Setup</h3>
        <div className="text-center py-8">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            No Microphone Input Detected
          </h4>
          <p className="text-gray-600 max-w-md mx-auto">
            No audio input devices were found. Please connect a microphone and refresh the page.
          </p>
        </div>
      </Card>
    )
  }

  // Main microphone setup UI
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        Microphone Setup
      </h3>

      <div className="space-y-4">
        {/* Input Device Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Input Device:
          </label>
          <select
            value={state.selectedDeviceId || ''}
            onChange={handleDeviceChange}
            disabled={state.isCapturing}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
          {state.isCapturing && (
            <p className="mt-1 text-xs text-gray-500">
              Stop capture to change device
            </p>
          )}
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600 mb-1">Status:</p>
            <p className="text-sm font-medium flex items-center gap-1">
              <span>{getConnectionIcon()}</span>
              <span>{getConnectionText()}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Permission:</p>
            <p className="text-sm font-medium flex items-center gap-1">
              <span>{getPermissionIcon()}</span>
              <span>{getPermissionText()}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Audio:</p>
            <p className="text-sm font-medium flex items-center gap-1">
              <span>{getCaptureIcon()}</span>
              <span>{getCaptureText()}</span>
            </p>
          </div>
        </div>

        {/* Audio Level Meter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Input Level:
          </label>
          {renderAudioLevelMeter()}
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {state.error}
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-3">
          {!state.isCapturing ? (
            <Button
              onClick={handleStartCapture}
              disabled={!state.selectedDeviceId}
              fullWidth
            >
              Test Microphone
            </Button>
          ) : (
            <Button
              onClick={handleStopCapture}
              variant="danger"
              fullWidth
            >
              Stop
            </Button>
          )}
        </div>

        {/* Help Text */}
        {state.isCapturing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">🎤 Test in progress:</span> Speak into your microphone and watch the level meter respond.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
