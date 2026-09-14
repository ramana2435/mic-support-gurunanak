'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { sessionApi, handleApiError } from '@/lib/api'
import { Session, SessionStatus } from '@live-translation/shared'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import toast from 'react-hot-toast'

export default function OrganizerDashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, clearAuth, initAuth } = useAuthStore()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/organizer/login')
      return
    }

    loadSessions()
  }, [isAuthenticated, router])

  const loadSessions = async () => {
    try {
      const data = await sessionApi.getAll()
      setSessions(data)
    } catch (error) {
      toast.error(handleApiError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    toast.success('Logged out successfully')
    router.push('/')
  }

  const getStatusBadge = (status: SessionStatus) => {
    const styles = {
      created: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      stopped: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              Organizer Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              Welcome, {user?.name}
            </p>
          </div>
          <Button variant="ghost" onClick={handleLogout} size="sm">
            Logout
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Your Sessions
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Manage your translation sessions
            </p>
          </div>
          <Link href="/organizer/session/create">
            <Button className="w-full sm:w-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Session
            </Button>
          </Link>
        </div>

        {/* Sessions Grid */}
        {sessions.length === 0 ? (
          <Card className="text-center py-12 bg-white dark:bg-gray-800">
            <svg
              className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No sessions yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first translation session to get started
            </p>
            <Link href="/organizer/session/create">
              <Button>Create Your First Session</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-xl transition-shadow cursor-pointer bg-white dark:bg-gray-800">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {session.title || `Session ${session.code}`}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      Code: <span className="font-mono font-bold">{session.code}</span> • {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(session.status)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Source:</span>
                    <span className="font-medium dark:text-white">{session.sourceLanguage.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Target Languages:</span>
                    <span className="font-medium dark:text-white">{session.targetLanguages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Max Students:</span>
                    <span className="font-medium dark:text-white">{session.maxStudents}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t dark:border-gray-700 flex gap-2">
                  <Link href={`/organizer/session/${session.id}`} className="flex-1">
                    <Button variant="primary" size="sm" fullWidth>
                      Manage
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
