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

    // DIAGNOSTIC: Log all outgoing events
    const originalEmit = socket.emit.bind(socket);
    socket.emit = function(event: string, ...args: any[]) {
      console.log('═══════════════════════════════════════════');
      console.log('📤 EMITTING EVENT');
      console.log('Event:', event);
      console.log('Args:', JSON.stringify(args, null, 2));
      console.log('Socket ID:', socket?.id);
      console.log('Connected:', socket?.connected);
      console.log('═══════════════════════════════════════════');
      return originalEmit(event, ...args);
    };

    socket.on(SocketEvent.CONNECT, () => {
      console.log('═══════════════════════════════════════════');
      console.log('✓ FRONTEND_SOCKET_CONNECTED');
      console.log('Socket ID:', socket?.id);
      console.log('Socket URL:', socketUrl);
      console.log('═══════════════════════════════════════════');
      // Development-only logging (safe - no secrets)
      if (config.isDevelopment) {
        console.log('[Socket] Connected:', socket?.id)
      }
    })

    socket.on(SocketEvent.DISCONNECT, (reason) => {
      console.log('═══════════════════════════════════════════');
      console.log('✗ FRONTEND_SOCKET_DISCONNECTED');
      console.log('Reason:', reason);
      console.log('═══════════════════════════════════════════');
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
