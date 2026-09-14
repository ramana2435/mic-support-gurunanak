import { EventEmitter } from 'events';
import { Socket } from 'socket.io';
import logger from '../../utils/logger';

/**
 * Connection Info
 */
export interface ConnectionInfo {
  socketId: string;
  sessionId: string;
  studentId: string;
  language: string;
  connectedAt: Date;
  lastActivity: Date;
  messageCount: number;
  isHealthy: boolean;
  slowClient: boolean;
  errorCount: number; // MODULE 13: Track errors per connection
  lastError?: { message: string; timestamp: Date }; // MODULE 13: Last error for isolation
  lastHeartbeat?: Date; // MODULE 13: Last successful heartbeat
}

/**
 * Language Group Info
 */
export interface LanguageGroupInfo {
  sessionId: string;
  language: string;
  studentCount: number;
  studentIds: string[];
}

/**
 * Rate Limit Bucket
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Connection Manager Service
 * MODULE 12: Manages connections with health tracking, rate limiting, and cleanup
 */
export class ConnectionManagerService extends EventEmitter {
  // Connection tracking
  private connections: Map<string, ConnectionInfo> = new Map(); // socketId -> ConnectionInfo
  private studentSockets: Map<string, string> = new Map(); // studentId -> socketId
  
  // Language groups per session
  private languageGroups: Map<string, LanguageGroupInfo> = new Map(); // sessionId:language -> info
  
  // Rate limiting (per IP address)
  private rateLimits: Map<string, RateLimitBucket> = new Map();
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_JOINS = 10; // Max 10 joins per minute per IP
  
  // Stale connection detection
  private readonly STALE_CONNECTION_TIMEOUT_MS = 300000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private cleanupInterval?: NodeJS.Timeout;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    super();
    logger.info('Connection Manager Service initialized');
  }

  /**
   * Start cleanup and heartbeat
   */
  start(): void {
    // Start stale connection cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, this.HEARTBEAT_INTERVAL_MS);

    // Start heartbeat requests
    this.heartbeatInterval = setInterval(() => {
      this.requestHeartbeats();
    }, this.HEARTBEAT_INTERVAL_MS);

    logger.info('Connection manager started');
  }

  /**
   * Stop cleanup and heartbeat
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    logger.info('Connection manager stopped');
  }

  /**
   * Check rate limit for IP
   */
  checkRateLimit(ipAddress: string): boolean {
    const now = Date.now();
    let bucket = this.rateLimits.get(ipAddress);

    if (!bucket || now > bucket.resetAt) {
      // Create new bucket
      bucket = {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW_MS,
      };
      this.rateLimits.set(ipAddress, bucket);
      return true;
    }

    if (bucket.count >= this.RATE_LIMIT_MAX_JOINS) {
      logger.warn('Rate limit exceeded', { ipAddress, count: bucket.count });
      this.emit('rateLimit:exceeded', { ipAddress });
      return false;
    }

    bucket.count++;
    return true;
  }

  /**
   * Register connection
   * MODULE 13: Enhanced with error tracking initialization
   */
  registerConnection(
    socket: Socket,
    sessionId: string,
    studentId: string,
    language: string
  ): void {
    const info: ConnectionInfo = {
      socketId: socket.id,
      sessionId,
      studentId,
      language,
      connectedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      isHealthy: true,
      slowClient: false,
      errorCount: 0, // MODULE 13
      lastHeartbeat: new Date(), // MODULE 13
    };

    this.connections.set(socket.id, info);
    this.studentSockets.set(studentId, socket.id);

    // Update language group
    const groupKey = this.getLanguageGroupKey(sessionId, language);
    let group = this.languageGroups.get(groupKey);
    
    if (!group) {
      group = {
        sessionId,
        language,
        studentCount: 0,
        studentIds: [],
      };
      this.languageGroups.set(groupKey, group);
    }

    group.studentCount++;
    group.studentIds.push(studentId);

    logger.info('Connection registered', {
      socketId: socket.id,
      sessionId,
      studentId,
      language,
      groupSize: group.studentCount,
    });

    this.emit('connection:registered', info);
  }

  /**
   * Unregister connection
   */
  unregisterConnection(socketId: string): void {
    const info = this.connections.get(socketId);
    
    if (!info) {
      return;
    }

    // Remove from language group
    const groupKey = this.getLanguageGroupKey(info.sessionId, info.language);
    const group = this.languageGroups.get(groupKey);
    
    if (group) {
      group.studentCount--;
      group.studentIds = group.studentIds.filter(id => id !== info.studentId);
      
      if (group.studentCount === 0) {
        this.languageGroups.delete(groupKey);
        logger.info('Language group removed', { sessionId: info.sessionId, language: info.language });
      }
    }

    this.connections.delete(socketId);
    this.studentSockets.delete(info.studentId);

    logger.info('Connection unregistered', {
      socketId,
      sessionId: info.sessionId,
      studentId: info.studentId,
    });

    this.emit('connection:unregistered', info);
  }

  /**
   * Update activity
   */
  updateActivity(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.lastActivity = new Date();
      info.messageCount++;
    }
  }

  /**
   * Mark connection as slow
   */
  markSlowClient(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info && !info.slowClient) {
      info.slowClient = true;
      logger.warn('Client marked as slow', {
        socketId,
        sessionId: info.sessionId,
        studentId: info.studentId,
      });
      this.emit('client:slow', info);
    }
  }

  /**
   * Mark connection as unhealthy
   */
  markUnhealthy(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info && info.isHealthy) {
      info.isHealthy = false;
      logger.warn('Connection marked unhealthy', {
        socketId,
        sessionId: info.sessionId,
        studentId: info.studentId,
      });
      this.emit('connection:unhealthy', info);
    }
  }

  /**
   * Get language group info
   */
  getLanguageGroup(sessionId: string, language: string): LanguageGroupInfo | null {
    const key = this.getLanguageGroupKey(sessionId, language);
    return this.languageGroups.get(key) || null;
  }

  /**
   * Get all language groups for session
   */
  getSessionLanguageGroups(sessionId: string): LanguageGroupInfo[] {
    const groups: LanguageGroupInfo[] = [];
    
    for (const [key, group] of this.languageGroups.entries()) {
      if (key.startsWith(`${sessionId}:`)) {
        groups.push(group);
      }
    }
    
    return groups;
  }

  /**
   * Get connection info
   */
  getConnection(socketId: string): ConnectionInfo | null {
    return this.connections.get(socketId) || null;
  }

  /**
   * Get all connections for session
   */
  getSessionConnections(sessionId: string): ConnectionInfo[] {
    const connections: ConnectionInfo[] = [];
    
    for (const info of this.connections.values()) {
      if (info.sessionId === sessionId) {
        connections.push(info);
      }
    }
    
    return connections;
  }

  /**
   * Get socket ID for student
   */
  getStudentSocket(studentId: string): string | null {
    return this.studentSockets.get(studentId) || null;
  }

  /**
   * Cleanup stale connections
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleConnections: string[] = [];

    for (const [socketId, info] of this.connections.entries()) {
      const inactiveTime = now - info.lastActivity.getTime();
      
      if (inactiveTime > this.STALE_CONNECTION_TIMEOUT_MS) {
        staleConnections.push(socketId);
      }
    }

    if (staleConnections.length > 0) {
      logger.warn('Stale connections detected', { count: staleConnections.length });
      
      for (const socketId of staleConnections) {
        const info = this.connections.get(socketId);
        if (info) {
          this.emit('connection:stale', info);
          this.unregisterConnection(socketId);
        }
      }
    }
  }

  /**
   * Request heartbeats from all connections
   */
  private requestHeartbeats(): void {
    this.emit('heartbeat:request');
    // The socket handler will emit pings to all connections
  }

  /**
   * Get language group key
   */
  private getLanguageGroupKey(sessionId: string, language: string): string {
    return `${sessionId}:${language}`;
  }

  /**
   * Get statistics
   */
  getStats() {
    const connectionsBySession: Record<string, number> = {};
    const connectionsByLanguage: Record<string, number> = {};
    let slowClients = 0;
    let unhealthyConnections = 0;

    for (const info of this.connections.values()) {
      connectionsBySession[info.sessionId] = (connectionsBySession[info.sessionId] || 0) + 1;
      connectionsByLanguage[info.language] = (connectionsByLanguage[info.language] || 0) + 1;
      
      if (info.slowClient) slowClients++;
      if (!info.isHealthy) unhealthyConnections++;
    }

    return {
      totalConnections: this.connections.size,
      connectionsBySession,
      connectionsByLanguage,
      languageGroups: this.languageGroups.size,
      slowClients,
      unhealthyConnections,
      rateLimitBuckets: this.rateLimits.size,
    };
  }

  /**
   * Get detailed stats for session
   */
  getSessionStats(sessionId: string) {
    const connections = this.getSessionConnections(sessionId);
    const languageGroups = this.getSessionLanguageGroups(sessionId);

    const byLanguage: Record<string, number> = {};
    let totalMessages = 0;

    for (const conn of connections) {
      byLanguage[conn.language] = (byLanguage[conn.language] || 0) + 1;
      totalMessages += conn.messageCount;
    }

    return {
      sessionId,
      totalConnections: connections.length,
      languageGroups: languageGroups.length,
      connectionsByLanguage: byLanguage,
      totalMessages,
      languageDistribution: languageGroups.map(g => ({
        language: g.language,
        students: g.studentCount,
      })),
    };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stop();
    this.connections.clear();
    this.studentSockets.clear();
    this.languageGroups.clear();
    this.rateLimits.clear();
    logger.info('Connection manager cleanup complete');
  }

  /**
   * MODULE 13: Record error for a connection (isolation)
   * Tracks errors per connection without affecting others
   */
  recordConnectionError(socketId: string, error: Error): void {
    const info = this.connections.get(socketId);
    if (!info) {
      return;
    }

    info.errorCount++;
    info.lastError = {
      message: error.message,
      timestamp: new Date(),
    };

    logger.warn('Connection error recorded', {
      socketId,
      studentId: info.studentId,
      errorCount: info.errorCount,
      error: error.message,
    });

    // Mark as unhealthy if too many errors
    if (info.errorCount >= 5) {
      info.isHealthy = false;
      logger.error('Connection marked unhealthy due to errors', {
        socketId,
        studentId: info.studentId,
        errorCount: info.errorCount,
      });
      this.emit('connection:unhealthy', {
        socketId,
        studentId: info.studentId,
        reason: `${info.errorCount} consecutive errors`,
      });
    }

    this.emit('connection:error', {
      socketId,
      studentId: info.studentId,
      error: error.message,
      errorCount: info.errorCount,
    });
  }

  /**
   * MODULE 13: Update heartbeat for a connection
   */
  updateHeartbeat(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.lastHeartbeat = new Date();
      
      // Restore health if was unhealthy
      if (!info.isHealthy) {
        info.isHealthy = true;
        info.errorCount = 0; // Reset error count on successful heartbeat
        logger.info('Connection health restored', {
          socketId,
          studentId: info.studentId,
        });
        this.emit('connection:healthy', {
          socketId,
          studentId: info.studentId,
        });
      }
    }
  }

  /**
   * MODULE 13: Get connection health
   */
  getConnectionHealth(socketId: string): {
    isHealthy: boolean;
    errorCount: number;
    lastError?: { message: string; timestamp: Date };
    lastHeartbeat?: Date;
  } | null {
    const info = this.connections.get(socketId);
    if (!info) {
      return null;
    }

    return {
      isHealthy: info.isHealthy,
      errorCount: info.errorCount,
      lastError: info.lastError,
      lastHeartbeat: info.lastHeartbeat,
    };
  }

  /**
   * MODULE 13: Get unhealthy connections
   */
  getUnhealthyConnections(): ConnectionInfo[] {
    const unhealthy: ConnectionInfo[] = [];
    
    for (const info of this.connections.values()) {
      if (!info.isHealthy) {
        unhealthy.push(info);
      }
    }
    
    return unhealthy;
  }
}

// Singleton instance
export const connectionManager = new ConnectionManagerService();
