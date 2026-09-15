'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { sessionApi, handleApiError } from '@/lib/api'
import { Language, Session, SessionStatus } from '@live-translation/shared'
import { LANGUAGE_OPTIONS } from '@live-translation/shared'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import toast from 'react-hot-toast'

export function JoinSessionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code') || ''

  const [formData, setFormData] = useState({
    sessionCode: codeFromUrl,
    name: '',
    selectedLanguage: Language.ENGLISH,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sessionValid, setSessionValid] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null)

  useEffect(() => {
    if (codeFromUrl) {
      verifySession(codeFromUrl)
    }
  }, [codeFromUrl])

  const verifySession = async (code: string) => {
    if (code.length !== 6) return

    setVerifying(true)
    setSessionInfo(null)
    setSessionValid(false)
    
    try {
      const session = await sessionApi.getByCode(code)
      
      // Check if session is joinable
      if (session.status === SessionStatus.STOPPED) {
        setErrors({ sessionCode: 'This session has been stopped and cannot be joined' })
        setSessionValid(false)
        return
      }
      
      if (session.status === SessionStatus.EXPIRED) {
        setErrors({ sessionCode: 'This session has expired and cannot be joined' })
        setSessionValid(false)
        return
      }
      
      setSessionInfo(session)
      setSessionValid(true)
      setErrors({ ...errors, sessionCode: '' })
      toast.success('Session found!')
    } catch (error) {
      setSessionValid(false)
      setSessionInfo(null)
      setErrors({ sessionCode: 'Invalid session code' })
    } finally {
      setVerifying(false)
    }
  }

  const handleCodeChange = (code: string) => {
    // Normalize: uppercase only, preserve all characters for validation
    const normalized = code.toUpperCase().slice(0, 7) // Allow 7 to show "too long" error
    
    setFormData({ ...formData, sessionCode: normalized })
    setSessionInfo(null)
    
    // Clear previous errors
    const newErrors = { ...errors }
    delete newErrors.sessionCode
    setErrors(newErrors)
    
    // Auto-verify when exactly 6 alphanumeric characters
    if (/^[A-Z0-9]{6}$/.test(normalized)) {
      verifySession(normalized)
    } else {
      setSessionValid(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    const code = formData.sessionCode

    // Check length first
    if (code.length === 0) {
      newErrors.sessionCode = 'Session code is required'
    } else if (code.length < 6) {
      newErrors.sessionCode = 'Session code must be exactly 6 characters'
    } else if (code.length > 6) {
      newErrors.sessionCode = 'Session code must be exactly 6 characters'
    } else if (!/^[A-Z0-9]+$/.test(code)) {
      // Exactly 6 chars but contains invalid characters
      newErrors.sessionCode = 'Session code can contain only letters and numbers'
    } else if (!/^[A-Z0-9]{6}$/.test(code)) {
      // Should not reach here, but safety check
      newErrors.sessionCode = 'Invalid session code format'
    }

    if (!formData.selectedLanguage) {
      newErrors.selectedLanguage = 'Please select a language'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please check the form and try again')
      return
    }

    if (!sessionValid || !sessionInfo) {
      toast.error('Please wait for session verification')
      return
    }

    setLoading(true)

    try {
      // Store join info in sessionStorage for the student session page
      const joinPayload = {
        sessionCode: formData.sessionCode,
        name: formData.name || 'Anonymous',
        selectedLanguage: formData.selectedLanguage,
      }
      
      sessionStorage.setItem('studentJoinData', JSON.stringify(joinPayload))
      
      // Log for debugging (safe - no secrets)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Join] Navigating to student session page:', {
          code: formData.sessionCode,
          language: formData.selectedLanguage,
          hasName: !!formData.name,
        })
      }
      
      // Navigate to student session page (WebSocket join happens there)
      router.push(`/student/session/${formData.sessionCode}`)
    } catch (error) {
      const message = handleApiError(error)
      toast.error(message)
      setErrors({ form: message })
      setLoading(false)
    }
  }

  const getLanguageName = (code: Language): string => {
    const lang = LANGUAGE_OPTIONS.find(l => l.code === code)
    return lang ? `${lang.name} (${lang.nativeName})` : code
  }

  const getStatusBadge = (status: SessionStatus) => {
    const styles = {
      [SessionStatus.CREATED]: 'bg-blue-100 text-blue-800 border-blue-200',
      [SessionStatus.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
      [SessionStatus.STOPPED]: 'bg-red-100 text-red-800 border-red-200',
      [SessionStatus.EXPIRED]: 'bg-gray-100 text-gray-800 border-gray-200',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Session</h1>
          <p className="text-gray-600">Enter the session code to join a translation session</p>
        </div>

        <Card>
          <form onSubmit={handleJoin} className="space-y-4">
            {/* Session Code Input */}
            <div>
              <Input
                label="Session Code"
                type="text"
                value={formData.sessionCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="ABC123"
                required
                fullWidth
                maxLength={6}
                error={errors.sessionCode}
                className="text-center text-2xl font-mono tracking-wider uppercase"
              />
              {verifying && (
                <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying session...
                </p>
              )}
              {sessionValid && sessionInfo && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Session verified!
                </p>
              )}
            </div>

            {/* Session Information Display */}
            {sessionValid && sessionInfo && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                      {sessionInfo.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Organized by {sessionInfo.organizerName}
                    </p>
                  </div>
                  {getStatusBadge(sessionInfo.status)}
                </div>
                
                <div className="border-t border-blue-200 pt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span className="font-medium text-gray-700">Speaker Language:</span>
                    <span className="text-gray-900">{getLanguageName(sessionInfo.sourceLanguage)}</span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">Available Languages:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sessionInfo.targetLanguages.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white border border-blue-200 text-gray-700"
                          >
                            {getLanguageName(lang)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Name Input - Only show when session is valid */}
            {sessionValid && sessionInfo && (
              <Input
                label="Your Name (Optional)"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                fullWidth
                error={errors.name}
              />
            )}

            {/* Language Selector - Only show available languages from session */}
            {sessionValid && sessionInfo && (
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Your Preferred Language *
                </label>
                <select
                  value={formData.selectedLanguage}
                  onChange={(e) => setFormData({ ...formData, selectedLanguage: e.target.value as Language })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 bg-white ${
                    errors.selectedLanguage ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="" className="text-gray-500">Select a language</option>
                  {sessionInfo.targetLanguages.map((lang) => {
                    const langConfig = LANGUAGE_OPTIONS.find(l => l.code === lang)
                    return langConfig ? (
                      <option key={lang} value={lang} className="text-gray-900">
                        {langConfig.name} ({langConfig.nativeName})
                      </option>
                    ) : null
                  })}
                </select>
                {errors.selectedLanguage && (
                  <p className="mt-1 text-sm text-red-600">{errors.selectedLanguage}</p>
                )}
              </div>
            )}

            {errors.form && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {errors.form}
              </div>
            )}

            {sessionValid && sessionInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Before you join:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Make sure your earbuds/headphones are connected to your phone</li>
                  <li>• Enable sound on your device</li>
                  <li>• Keep your screen on during the session</li>
                  <li>• You&apos;ll see translated text and hear audio in real-time</li>
                </ul>
              </div>
            )}

            <Button 
              type="submit" 
              loading={loading} 
              fullWidth 
              disabled={!sessionValid || !formData.selectedLanguage}
            >
              Join Session
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to Home
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
