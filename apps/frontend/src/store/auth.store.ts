import { create } from 'zustand'
import { OrganizerUser } from '@live-translation/shared'

interface AuthState {
  user: OrganizerUser | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: OrganizerUser, token: string) => void
  clearAuth: () => void
  initAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem('authToken', token)
    localStorage.setItem('authUser', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    set({ user: null, token: null, isAuthenticated: false })
  },

  initAuth: () => {
    const token = localStorage.getItem('authToken')
    const userStr = localStorage.getItem('authUser')
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ user, token, isAuthenticated: true })
      } catch {
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
      }
    }
  },
}))
