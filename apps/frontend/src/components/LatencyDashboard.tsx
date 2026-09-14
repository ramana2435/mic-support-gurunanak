'use client'

import { useEffect, useState } from 'react'
import { Card } from './Card'

/**
 * Latency Statistics Component
 * MODULE 11: Real-time latency monitoring dashboard
 */

interface LatencyStats {
  component: string
  samples: number
  average: number
  p50: number
  p95: number
  p99: number
  min: number
  max: number
}

interface LatencyReport {
  sessionId: string
  sampleCount: number
  duration: number
  stt: LatencyStats
  translation: LatencyStats
  tts: LatencyStats
  audioDelivery: LatencyStats
  textDelivery: LatencyStats
  totalEndToEnd: LatencyStats
  recentSamples: any[]
}

interface LatencyDashboardProps {
  sessionId: string
  refreshInterval?: number
}

export function LatencyDashboard({ sessionId, refreshInterval = 5000 }: LatencyDashboardProps) {
  const [report, setReport] = useState<LatencyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLatencyReport = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/monitoring/session/${sessionId}/latency`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('No latency data available yet')
            return
          }
          throw new Error('Failed to fetch latency report')
        }
        
        const data = await response.json()
        setReport(data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching latency report:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLatencyReport()
    const interval = setInterval(fetchLatencyReport, refreshInterval)
    
    return () => clearInterval(interval)
  }, [sessionId, refreshInterval])

  const formatLatency = (ms: number): string => {
    if (ms < 1) return '<1ms'
    return `${Math.round(ms)}ms`
  }

  const getLatencyColor = (ms: number, component: string): string => {
    // Different thresholds for different components
    const thresholds = {
      text: { good: 300, warning: 500 },
      total: { good: 1000, warning: 2000 },
      default: { good: 200, warning: 400 },
    }
    
    const threshold = component === 'textDelivery' ? thresholds.text
      : component === 'totalEndToEnd' ? thresholds.total
      : thresholds.default
    
    if (ms <= threshold.good) return 'text-green-600'
    if (ms <= threshold.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusBadge = (ms: number, component: string): JSX.Element => {
    const thresholds = {
      text: { good: 300, warning: 500 },
      total: { good: 1000, warning: 2000 },
      default: { good: 200, warning: 400 },
    }
    
    const threshold = component === 'textDelivery' ? thresholds.text
      : component === 'totalEndToEnd' ? thresholds.total
      : thresholds.default
    
    if (ms <= threshold.good) {
      return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">Excellent</span>
    }
    if (ms <= threshold.warning) {
      return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">Good</span>
    }
    return <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">Needs Improvement</span>
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading latency data...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Latency data will appear once the session starts receiving audio</p>
        </div>
      </Card>
    )
  }

  if (!report) {
    return null
  }

  const renderLatencyCard = (stats: LatencyStats, icon: string, description: string) => {
    if (stats.samples === 0) {
      return null
    }

    return (
      <Card className="bg-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{stats.component}</h3>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </div>
          {getStatusBadge(stats.average, stats.component.toLowerCase().replace(' ', ''))}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Average</p>
            <p className={`text-2xl font-bold ${getLatencyColor(stats.average, stats.component.toLowerCase().replace(' ', ''))}`}>
              {formatLatency(stats.average)}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">P95</p>
            <p className={`text-xl font-semibold ${getLatencyColor(stats.p95, stats.component.toLowerCase().replace(' ', ''))}`}>
              {formatLatency(stats.p95)}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">Min / Max</p>
            <p className="text-sm font-medium text-gray-700">
              {formatLatency(stats.min)} / {formatLatency(stats.max)}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">P50 (Median)</p>
            <p className="text-sm font-medium text-gray-700">
              {formatLatency(stats.p50)}
            </p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {stats.samples} samples collected
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>📊</span>
              Latency Dashboard
            </h2>
            <p className="text-sm text-gray-600">Real-time performance metrics</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Samples</p>
            <p className="text-2xl font-bold text-blue-600">{report.sampleCount}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Total End-to-End Latency */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">🎯 Total End-to-End</p>
            <p className={`text-3xl font-bold ${getLatencyColor(report.totalEndToEnd.average, 'totalEndToEnd')}`}>
              {formatLatency(report.totalEndToEnd.average)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Target: ~1000ms | P95: {formatLatency(report.totalEndToEnd.p95)}
            </p>
            <div className="mt-2">
              {getStatusBadge(report.totalEndToEnd.average, 'totalEndToEnd')}
            </div>
          </div>
          
          {/* Text Delivery Latency */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">⚡ Text Delivery</p>
            <p className={`text-3xl font-bold ${getLatencyColor(report.textDelivery.average, 'textDelivery')}`}>
              {formatLatency(report.textDelivery.average)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Target: &lt;500ms | P95: {formatLatency(report.textDelivery.p95)}
            </p>
            <div className="mt-2">
              {getStatusBadge(report.textDelivery.average, 'textDelivery')}
            </div>
          </div>
        </div>
      </Card>

      {/* Component Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>🔍</span>
          Component Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderLatencyCard(
            report.stt,
            '🎤',
            'Speech to text processing'
          )}
          {renderLatencyCard(
            report.translation,
            '🌐',
            'Translation processing'
          )}
          {renderLatencyCard(
            report.tts,
            '🔊',
            'Text to speech synthesis'
          )}
          {renderLatencyCard(
            report.audioDelivery,
            '📡',
            'Audio network delivery'
          )}
        </div>
      </div>

      {/* Performance Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <span>💡</span>
          Performance Tips
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Text delivery should be &lt;500ms for best experience</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Total latency ~1 second is the target under good conditions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Text translation always continues even if audio is delayed</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Good network connection is essential for low latency</span>
          </li>
        </ul>
      </Card>
    </div>
  )
}

/**
 * Compact Latency Badge - For showing in headers
 */
interface LatencyBadgeProps {
  sessionId: string
  refreshInterval?: number
}

export function LatencyBadge({ sessionId, refreshInterval = 10000 }: LatencyBadgeProps) {
  const [avgLatency, setAvgLatency] = useState<number | null>(null)

  useEffect(() => {
    const fetchLatency = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/monitoring/session/${sessionId}/latency`)
        if (response.ok) {
          const data = await response.json()
          setAvgLatency(data.totalEndToEnd.average)
        }
      } catch (err) {
        console.error('Error fetching latency:', err)
      }
    }

    fetchLatency()
    const interval = setInterval(fetchLatency, refreshInterval)
    
    return () => clearInterval(interval)
  }, [sessionId, refreshInterval])

  if (avgLatency === null) {
    return null
  }

  const getColor = () => {
    if (avgLatency <= 1000) return 'bg-green-100 text-green-800'
    if (avgLatency <= 2000) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getColor()} flex items-center gap-1`}>
      <span>⚡</span>
      <span>{Math.round(avgLatency)}ms</span>
    </div>
  )
}
