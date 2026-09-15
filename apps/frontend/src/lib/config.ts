/**
 * Frontend Configuration
 * Centralized environment-aware API and Socket URL configuration
 *
 * Production behavior:
 * - Requires NEXT_PUBLIC_API_URL to be set
 * - NEVER falls back to localhost
 * - Returns null for missing configuration (explicit failure state)
 *
 * Development behavior:
 * - Allows localhost fallback
 * - Provides helpful logging
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Configuration error state
 * Used to signal that production configuration is missing
 */
export const CONFIG_ERROR = {
  isConfigError: true,
  message: 'Application configuration error. Please contact the administrator.',
} as const

/**
 * Get API URL with environment-aware fallback
 * Returns null in production if NEXT_PUBLIC_API_URL is not set
 */
function getApiUrl(): string | null {
  const envUrl = process.env.NEXT_PUBLIC_API_URL

  // Development: Allow localhost fallback
  if (isDevelopment) {
    return envUrl || 'http://localhost:3002'
  }

  // Production: Require environment variable, return null if missing
  if (isProduction && !envUrl) {
    if (typeof window !== 'undefined') {
      console.error(
        '🚨 PRODUCTION ERROR: NEXT_PUBLIC_API_URL is not configured.\n' +
        'The application cannot connect to the backend.\n' +
        'This must be set in Vercel environment variables.'
      )
    }
    return null
  }

  // Fallback for other environments (test, etc.)
  return envUrl || 'http://localhost:3002'
}

/**
 * Get Socket URL with environment-aware fallback
 * Uses NEXT_PUBLIC_SOCKET_URL if available, otherwise same as API URL
 */
function getSocketUrl(apiUrl: string | null): string | null {
  const envSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL

  // If socket URL is explicitly provided, use it
  if (envSocketUrl) {
    return envSocketUrl
  }

  // Otherwise, use the same URL as API
  // (most deployments use the same server for HTTP and WebSocket)
  return apiUrl
}

/**
 * Normalize URL: remove trailing slash
 */
function normalizeUrl(url: string | null): string | null {
  if (url === null) {
    return null
  }
  return url.replace(/\/+$/, '')
}

const rawApiUrl = getApiUrl()
const rawSocketUrl = getSocketUrl(rawApiUrl)

/**
 * Exported configuration
 */
export const config = {
  apiUrl: normalizeUrl(rawApiUrl),
  socketUrl: normalizeUrl(rawSocketUrl),
  isDevelopment,
  isProduction,
  hasConfigError: rawApiUrl === null,
}

// Development-only logging (safe, no secrets)
if (isDevelopment && typeof window !== 'undefined') {
  console.log('[Config] Environment:', process.env.NODE_ENV)
  console.log('[Config] API URL:', config.apiUrl)
  console.log('[Config] Socket URL:', config.socketUrl)
}

// Production configuration check
if (isProduction && typeof window !== 'undefined' && config.hasConfigError) {
  console.error(
    '%c⚠️ APPLICATION CONFIGURATION ERROR',
    'color: red; font-size: 16px; font-weight: bold',
    '\n\nNEXT_PUBLIC_API_URL is not set.\n' +
    'The application cannot connect to the backend server.\n\n' +
    'This must be configured in Vercel:\n' +
    'Dashboard → Settings → Environment Variables → Add NEXT_PUBLIC_API_URL\n'
  )
}
