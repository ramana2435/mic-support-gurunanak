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
import { config, CONFIG_ERROR } from './config'

const api = axios.create({
  baseURL: config.apiUrl ? `${config.apiUrl}/api` : 'http://invalid.config',
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

// Handle API errors with user-friendly messages
export const handleApiError = (error: unknown): string => {
  // Check for configuration error
  if (config.hasConfigError) {
    return CONFIG_ERROR.message
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse>

    // No response (network error, timeout, CORS failure, connection refused, etc.)
    if (!axiosError.response) {
      // Development logging (safe - no secrets)
      if (config.isDevelopment) {
        console.error('[API Error] Network failure:', {
          message: axiosError.message,
          code: axiosError.code,
          url: `${axiosError.config?.baseURL || ''}${axiosError.config?.url || ''}`,
        })
      }
      return 'Unable to connect to the server. Please check your internet connection.'
    }

    // HTTP error responses
    const status = axiosError.response.status
    const serverError = axiosError.response.data?.error

    // Status-specific messages
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
        // Development logging for server errors (safe - no secrets)
        if (config.isDevelopment) {
          console.error('[API Error] Server error:', {
            status,
            message: serverError,
            url: axiosError.config?.url,
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
