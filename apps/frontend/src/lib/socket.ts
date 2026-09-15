import { io, Socket } from 'socket.io-client'
import { SocketEvent } from '@live-translation/shared'
import { config } from './config'

let socket: Socket | null = null

export const initSocket = (): Socket => {
  if (!socket) {
    // Use config.socketUrl, which will be null if configuration is missing
    const socketUrl = config.socketUrl || 'http://invalid.config'

    socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socket.on(SocketEvent.CONNECT, () => {
      // Development-only logging (safe - no secrets)
      if (config.isDevelopment) {
        console.log('[Socket] Connected:', socket?.id)
      }
    })

    socket.on(SocketEvent.DISCONNECT, (reason) => {
      // Development-only logging (safe - no secrets)
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
