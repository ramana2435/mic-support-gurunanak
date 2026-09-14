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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse>
    return axiosError.response?.data?.error || axiosError.message || 'An error occurred'
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
