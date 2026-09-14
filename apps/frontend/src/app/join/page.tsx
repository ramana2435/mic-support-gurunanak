'use client'

import { Suspense } from 'react'
import { JoinSessionContent } from './JoinSessionContent'

export default function JoinSessionPage() {
  return (
    <Suspense fallback={<JoinSessionPageSkeleton />}>
      <JoinSessionContent />
    </Suspense>
  )
}

function JoinSessionPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Session</h1>
          <p className="text-gray-600">Enter the session code to join a translation session</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
