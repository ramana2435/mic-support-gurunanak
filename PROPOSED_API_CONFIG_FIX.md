# 🔧 PROPOSED FIX: Production API Configuration

## 🎯 ROOT CAUSE

### The Problem
The frontend has **hardcoded fallback to localhost** in multiple locations:

1. **`apps/frontend/src/lib/api.ts`:**
   ```typescript
   const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
   ```

2. **`apps/frontend/src/lib/socket.ts`:**
   ```typescript
   const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
   ```

3. **`apps/frontend/next.config.js`:**
   ```javascript
   env: {
     NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
   }
   ```

### Why Mobile Shows "Network error"

**Sequence:**
1. Vercel builds frontend **without** `NEXT_PUBLIC_API_URL` environment variable
2. All three files above default to `'http://localhost:3002'`
3. **This value is baked into the production build at build time**
4. Mobile browser loads production frontend
5. User clicks "Sign In"
6. axios attempts: `POST http://localhost:3002/api/auth/login`
7. **localhost:3002 doesn't exist on mobile device**
8. Connection refused → axios error
9. `handleApiError()` returns: `axiosError.message` → **"Network Error"**
10. User sees: "Network error"

### Additional Problem: Poor Error Messages

Current `handleApiError`:
```typescript
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse>
    return axiosError.response?.data?.error || axiosError.message || 'An error occurred'
  }
  return 'An unexpected error occurred'
}
```

**Issues:**
- Returns raw axios error message ("Network Error")
- Doesn't distinguish network failure from HTTP errors
- No user-friendly messages
- No configuration error detection

---

## 📋 FILES THAT NEED MODIFICATION

### 1. Create: `apps/frontend/src/lib/config.ts` (NEW FILE)
Environment-aware configuration with proper fallbacks and validation.

### 2. Modify: `apps/frontend/src/lib/api.ts`
- Import config from new config.ts
- Improve error handling
- Remove localhost fallback

### 3. Modify: `apps/frontend/src/lib/socket.ts`
- Import config from new config.ts
- Remove localhost fallback

### 4. Modify: `apps/frontend/next.config.js`
- Remove localhost fallback in env section
- Let it read from environment only

---

## 🔧 EXACT PROPOSED CHANGES

### Change 1: Create `apps/frontend/src/lib/config.ts`

```typescript
/**
 * Frontend Configuration
 * Environment-aware API and Socket URL configuration
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Get API URL with environment-aware fallback
 */
function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL

  // Development: Allow localhost fallback
  if (isDevelopment) {
    return envUrl || 'http://localhost:3002'
  }

  // Production: Require environment variable
  if (isProduction && !envUrl) {
    console.error(
      'PRODUCTION ERROR: NEXT_PUBLIC_API_URL is not configured. ' +
      'Add it to Vercel environment variables.'
    )
    // Return a clear error URL that will fail with identifiable message
    return 'https://MISSING_API_URL_CONFIGURATION'
  }

  return envUrl || 'http://localhost:3002'
}

/**
 * Normalize URL: remove trailing slash
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '')
}

/**
 * Get Socket URL (uses same base as API)
 */
function getSocketUrl(): string {
  return getApiUrl()
}

export const config = {
  apiUrl: normalizeUrl(getApiUrl()),
  socketUrl: normalizeUrl(getSocketUrl()),
  isDevelopment,
  isProduction,
}

// Development-only logging
if (isDevelopment && typeof window !== 'undefined') {
  console.log('[Config] API URL:', config.apiUrl)
  console.log('[Config] Socket URL:', config.socketUrl)
}

// Production configuration check
if (isProduction && typeof window !== 'undefined' && config.apiUrl.includes('MISSING')) {
  console.error(
    '%c⚠️ CONFIGURATION ERROR',
    'color: red; font-size: 16px; font-weight: bold',
    '\n\nNEXT_PUBLIC_API_URL is not set in Vercel environment variables.\n' +
    'The application will not function correctly.\n\n' +
    'Fix: Add NEXT_PUBLIC_API_URL in Vercel Dashboard → Settings → Environment Variables\n'
  )
}
```

### Change 2: Modify `apps/frontend/src/lib/api.ts`

```typescript
import axios, { AxiosError } from 'axios'
import {
  ApiResponse,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  Session,
} from '@live-translation/shared'
import { config } from './config'

const api = axios.create({
  baseURL: `${config.apiUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((axiosConfig) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    axiosConfig.headers.Authorization = `Bearer ${token}`
  }
  return axiosConfig
})

// Handle API errors with better messages
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse>
    
    // Configuration error
    if (axiosError.config?.baseURL?.includes('MISSING')) {
      return 'Application configuration error. Please contact the administrator.'
    }
    
    // No response (network error, timeout, CORS, etc.)
    if (!axiosError.response) {
      if (config.isDevelopment) {
        console.error('[API] Network error:', {
          message: axiosError.message,
          code: axiosError.code,
          url: axiosError.config?.url,
        })
      }
      return 'Unable to connect to the server. Please check your internet connection.'
    }
    
    // HTTP error responses
    const status = axiosError.response.status
    const serverError = axiosError.response.data?.error
    
    switch (status) {
      case 400:
        return serverError || 'Invalid request. Please check your input.'
      case 401:
        return serverError || 'Invalid email or password.'
      case 403:
        return serverError || 'Access denied.'
      case 404:
        return serverError || 'Resource not found.'
      case 409:
        return serverError || 'Conflict. This resource may already exist.'
      case 422:
        return serverError || 'Validation error. Please check your input.'
      case 500:
      case 502:
      case 503:
      case 504:
        if (config.isDevelopment) {
          console.error('[API] Server error:', {
            status,
            message: serverError,
          })
        }
        return 'Server error. Please try again later.'
      default:
        return serverError || `Error: ${status}`
    }
  }
  
  return 'An unexpected error occurred'
}

// Auth API
export const authApi = {
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', credentials)
    return response.data.data!
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
    return response.data.data!
  },

  getMe: async (): Promise<any> => {
    const response = await api.get<ApiResponse>('/auth/me')
    return response.data.data
  },
}

// Session API
export const sessionApi = {
  create: async (request: CreateSessionRequest): Promise<CreateSessionResponse> => {
    const response = await api.post<ApiResponse<CreateSessionResponse>>('/sessions', request)
    return response.data.data!
  },

  getAll: async (): Promise<Session[]> => {
    const response = await api.get<ApiResponse<Session[]>>('/sessions')
    return response.data.data!
  },

  getById: async (id: string): Promise<Session> => {
    const response = await api.get<ApiResponse<Session>>(`/sessions/${id}`)
    return response.data.data!
  },

  getByCode: async (code: string): Promise<Session> => {
    const response = await api.get<ApiResponse<Session>>(`/sessions/code/${code}`)
    return response.data.data!
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/sessions/${id}`)
  },
}

// Health API
export const healthApi = {
  check: async (): Promise<any> => {
    const response = await api.get<ApiResponse>('/health')
    return response.data.data
  },
}

export default api
```

### Change 3: Modify `apps/frontend/src/lib/socket.ts`

```typescript
import { io, Socket } from 'socket.io-client'
import { SocketEvent } from '@live-translation/shared'
import { config } from './config'

let socket: Socket | null = null

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io(config.socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socket.on(SocketEvent.CONNECT, () => {
      if (config.isDevelopment) {
        console.log('[Socket] Connected:', socket?.id)
      }
    })

    socket.on(SocketEvent.DISCONNECT, (reason) => {
      if (config.isDevelopment) {
        console.log('[Socket] Disconnected:', reason)
      }
    })

    socket.on(SocketEvent.ERROR, (error) => {
      console.error('[Socket] Error:', error)
    })
  }

  return socket
}

export const getSocket = (): Socket | null => {
  return socket
}

export const connectSocket = (): void => {
  if (socket && !socket.connected) {
    socket.connect()
  }
}

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect()
  }
}

export const cleanupSocket = (): void => {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}
```

### Change 4: Modify `apps/frontend/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@live-translation/shared'],
  env: {
    // Pass through the environment variable without fallback
    // Fallback logic is handled in src/lib/config.ts
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
```

---

## ✅ WHAT THIS FIXES

### 1. **Production Can't Fall Back to Localhost**
- Development: Uses localhost if NEXT_PUBLIC_API_URL not set
- Production: Requires NEXT_PUBLIC_API_URL or shows clear error
- No silent failures

### 2. **Better Error Messages**
- Network error: "Unable to connect to the server..."
- 401: "Invalid email or password."
- 500: "Server error. Please try again later."
- Config error: "Application configuration error..."

### 3. **URL Normalization**
- Removes trailing slashes
- Prevents `https://example.com//api/auth/login`

### 4. **Development Logging**
- Logs API URL on startup (development only)
- Logs network errors with details (development only)
- No sensitive data logged (never logs passwords/tokens)

### 5. **Mobile Compatibility**
- Works on Android Chrome
- Works on iOS Safari
- Works on desktop browsers
- Proper error handling for all network conditions

---

## 🚫 WHAT THIS DOES NOT CHANGE

✅ Authentication architecture (JWT in localStorage)  
✅ No withCredentials (not using cookies)  
✅ Database schema  
✅ Backend CORS configuration  
✅ Socket.IO architecture  
✅ Form submission logic  
✅ UI components  

---

## 🔍 LOCALHOST REFERENCES AFTER FIX

### apps/frontend/src/lib/config.ts
```typescript
return envUrl || 'http://localhost:3002'  // ✅ Development-only fallback
```
**Context:** Only used when `NODE_ENV === 'development'`

### All Other Files
**No localhost references** - all import from config.ts

---

## 🧪 TESTING CHECKLIST

After implementation:

### 1. Type Check
```bash
npm run type-check --workspace=apps/frontend
```

### 2. Build
```bash
npm run build --workspace=apps/frontend
```

### 3. Inspect Build Output
Check `.next/server/chunks/*.js` for localhost references

### 4. Test Development
- Run locally with localhost
- Verify login works

### 5. Test Production (Simulated)
- Build without NEXT_PUBLIC_API_URL
- Should see configuration error in console
- Error message should be clear

### 6. Test Production (Real)
- Set NEXT_PUBLIC_API_URL in Vercel
- Deploy
- Test login from mobile
- Should POST to Railway, not localhost

---

## 📊 EXPECTED RAILWAY LOGS AFTER FIX

**Before (Broken):**
```
OPTIONS /api/auth/login -> 204
(no POST - request goes to localhost)
```

**After (Fixed):**
```
OPTIONS /api/auth/login -> 204
POST /api/auth/login -> 200
```

---

## ⚡ IMPLEMENTATION PLAN

1. Create `apps/frontend/src/lib/config.ts`
2. Modify `apps/frontend/src/lib/api.ts`
3. Modify `apps/frontend/src/lib/socket.ts`
4. Modify `apps/frontend/next.config.js`
5. Run type-check
6. Run build
7. Verify no localhost in production build
8. Show git diff
9. Wait for approval before commit

---

**Ready to implement?**
