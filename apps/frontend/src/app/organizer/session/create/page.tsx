'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { sessionApi, handleApiError } from '@/lib/api'
import { Language } from '@live-translation/shared'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import { LanguageSelector } from '@/components/LanguageSelector'
import toast from 'react-hot-toast'

export default function CreateSessionPage() {
  const router = useRouter()
  const { user, isAuthenticated, initAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    organizerName: '',
    sourceLanguage: Language.ENGLISH,
    targetLanguages: [] as Language[],
    maxStudents: 100,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    initAuth()
  }, [initAuth])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/organizer/login')
      return
    }

    if (user) {
      setFormData((prev) => ({ ...prev, organizerName: user.name }))
    }
  }, [isAuthenticated, user, router])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (formData.title.length < 3) {
      newErrors.title = 'Session title must be at least 3 characters'
    }

    if (formData.organizerName.length < 2) {
      newErrors.organizerName = 'Organizer name is required'
    }

    if (!formData.sourceLanguage) {
      newErrors.sourceLanguage = 'Source language is required'
    }

    if (formData.targetLanguages.length === 0) {
      newErrors.targetLanguages = 'At least one target language is required'
    }

    if (formData.maxStudents < 1 || formData.maxStudents > 500) {
      newErrors.maxStudents = 'Max students must be between 1 and 500'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await sessionApi.create(formData)
      toast.success('Session created successfully!')
      router.push(`/organizer/session/${response.session.id}`)
    } catch (error) {
      const message = handleApiError(error)
      toast.error(message)
      setErrors({ form: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/organizer/dashboard" className="text-primary-600 hover:text-primary-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Session</h1>
            <p className="text-gray-600">Set up a new translation session for your event</p>
          </div>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Session Title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Advanced Physics Lecture"
                required
                fullWidth
                error={errors.title}
              />

              <Input
                label="Organizer Name"
                type="text"
                value={formData.organizerName}
                onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                placeholder="Your name"
                required
                fullWidth
                error={errors.organizerName}
              />

              <LanguageSelector
                label="Source Language (Speaker's Language)"
                value={formData.sourceLanguage}
                onChange={(value) => setFormData({ ...formData, sourceLanguage: value as Language })}
                error={errors.sourceLanguage}
              />

              <LanguageSelector
                label="Target Languages (Available for Students)"
                value={formData.targetLanguages}
                onChange={(value) => setFormData({ ...formData, targetLanguages: value as Language[] })}
                multiple
                error={errors.targetLanguages}
              />

              <Input
                label="Maximum Students"
                type="number"
                min="1"
                max="500"
                value={formData.maxStudents}
                onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) })}
                required
                fullWidth
                error={errors.maxStudents}
              />

              {errors.form && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {errors.form}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• A unique 6-character session code will be generated</li>
                  <li>• You&apos;ll receive a QR code for students to join</li>
                  <li>• Students can select their preferred language</li>
                  <li>• You can start the session when ready</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => router.back()} fullWidth>
                  Cancel
                </Button>
                <Button type="submit" loading={loading} fullWidth>
                  Create Session
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
