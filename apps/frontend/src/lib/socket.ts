import { io, Socket } from 'socket.io-client'
import { SocketEvent } from '@live-translation/shared'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

let socket: Socket | null = null

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socket.on(SocketEvent.CONNECT, () => {
      console.log('Socket connected:', socket?.id)
    })

    socket.on(SocketEvent.DISCONNECT, (reason) => {
      console.log('Socket disconnected:', reason)
    })

    socket.on(SocketEvent.ERROR, (error) => {
      console.error('Socket error:', error)
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
