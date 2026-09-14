import { EventEmitter } from 'events';
import * as os from 'os';
import logger from '../../utils/logger';

/**
 * Resource Usage Snapshot
 */
export interface ResourceSnapshot {
  timestamp: Date;
  cpu: {
    usage: number; // Percentage
    loadAverage: number[];
  };
  memory: {
    total: number; // bytes
    used: number; // bytes
    free: number; // bytes
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  connections: {
    total: number;
    bySession: Map<string, number>;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

/**
 * Resource Limits
 */
export interface ResourceLimits {
  maxMemoryPercentage: number; // e.g., 80
  maxCPUPercentage: number; // e.g., 85
  maxConnectionsPerSession: number; // e.g., 500
  maxTotalConnections: number; // e.g., 1000
  maxSessions: number; // e.g., 10
}

/**
 * Session Resource Usage
 */
export interface SessionResources {
  sessionId: string;
  connections: number;
  memoryEstimate: number; // bytes
  lastActivity: Date;
}

/**
 * Resource Monitor Service
 * MODULE 12: Monitors system resources and enforces limits
 */
export class ResourceMonitorService extends EventEmitter {
  private snapshots: ResourceSnapshot[] = [];
  private readonly MAX_SNAPSHOTS = 100; // Keep last 100 snapshots
  private monitorInterval?: NodeJS.Timeout;
  private lastCPUUsage = process.cpuUsage();
  private lastNetworkStats = { bytesIn: 0, bytesOut: 0 };
  
  // Default limits (can be configured)
  private limits: ResourceLimits = {
    maxMemoryPercentage: 80,
    maxCPUPercentage: 85,
    maxConnectionsPerSession: 500,
    maxTotalConnections: 1000,
    maxSessions: 10,
  };

  // Session tracking
  private sessionResources: Map<string, SessionResources> = new Map();
  private totalConnections = 0;

  constructor() {
    super();
    logger.info('Resource Monitor Service initialized');
  }

  /**
   * Start monitoring
   */
  start(intervalMs: number = 5000): void {
    if (this.monitorInterval) {
      logger.warn('Resource monitoring already started');
      return;
    }

    this.monitorInterval = setInterval(() => {
      this.captureSnapshot();
    }, intervalMs);

    logger.info('Resource monitoring started', { intervalMs });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
      logger.info('Resource monitoring stopped');
    }
  }

  /**
   * Capture resource snapshot
   */
  private captureSnapshot(): void {
    const snapshot: ResourceSnapshot = {
      timestamp: new Date(),
      cpu: this.getCPUUsage(),
      memory: this.getMemoryUsage(),
      connections: this.getConnectionStats(),
      network: this.getNetworkStats(),
    };

    this.snapshots.push(snapshot);

    // Trim snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    // Check limits and emit warnings
    this.checkLimits(snapshot);

    // Emit snapshot event
    this.emit('snapshot', snapshot);

    // Log summary
    logger.debug('Resource snapshot', {
      cpu: `${snapshot.cpu.usage.toFixed(1)}%`,
      memory: `${snapshot.memory.percentage.toFixed(1)}%`,
      connections: snapshot.connections.total,
    });
  }

  /**
   * Get CPU usage
   */
  private getCPUUsage(): { usage: number; loadAverage: number[] } {
    const currentUsage = process.cpuUsage(this.lastCPUUsage);
    this.lastCPUUsage = process.cpuUsage();

    // Calculate percentage
    const totalUsage = (currentUsage.user + currentUsage.system) / 1000000; // Convert to seconds
    const cpuCount = os.cpus().length;
    const usage = (totalUsage / 5) * 100 / cpuCount; // Assuming 5 second interval

    return {
      usage: Math.min(usage, 100), // Cap at 100%
      loadAverage: os.loadavg(),
    };
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = process.memoryUsage();

    return {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percentage: (usedMem / totalMem) * 100,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    };
  }

  /**
   * Get connection statistics
   */
  private getConnectionStats(): { total: number; bySession: Map<string, number> } {
    return {
      total: this.totalConnections,
      bySession: new Map(
        Array.from(this.sessionResources.entries()).map(([id, res]) => [id, res.connections])
      ),
    };
  }

  /**
   * Get network statistics (placeholder - would need actual tracking)
   */
  private getNetworkStats() {
    // In a real implementation, this would track actual network I/O
    // For now, return placeholder
    return {
      bytesIn: this.lastNetworkStats.bytesIn,
      bytesOut: this.lastNetworkStats.bytesOut,
    };
  }

  /**
   * Check resource limits with graduated degradation
   * MODULE 12: Graceful degradation at 80%, 90%, 95% thresholds
   */
  private checkLimits(snapshot: ResourceSnapshot): void {
    // Check memory with graduated levels
    const memPct = snapshot.memory.percentage;
    if (memPct > this.limits.maxMemoryPercentage * 0.95) {
      logger.error('CRITICAL: Memory at 95% of limit', {
        current: memPct.toFixed(1),
        limit: this.limits.maxMemoryPercentage,
      });
      this.emit('degradation:critical', {
        resource: 'memory',
        percentage: memPct,
        level: 'critical',
      });
    } else if (memPct > this.limits.maxMemoryPercentage * 0.90) {
      logger.warn('WARNING: Memory at 90% of limit', {
        current: memPct.toFixed(1),
        limit: this.limits.maxMemoryPercentage,
      });
      this.emit('degradation:high', {
        resource: 'memory',
        percentage: memPct,
        level: 'high',
      });
    } else if (memPct > this.limits.maxMemoryPercentage * 0.80) {
      logger.info('INFO: Memory at 80% of limit', {
        current: memPct.toFixed(1),
        limit: this.limits.maxMemoryPercentage,
      });
      this.emit('degradation:medium', {
        resource: 'memory',
        percentage: memPct,
        level: 'medium',
      });
    }

    // Check CPU with graduated levels
    const cpuPct = snapshot.cpu.usage;
    if (cpuPct > this.limits.maxCPUPercentage * 0.95) {
      logger.error('CRITICAL: CPU at 95% of limit', {
        current: cpuPct.toFixed(1),
        limit: this.limits.maxCPUPercentage,
      });
      this.emit('degradation:critical', {
        resource: 'cpu',
        percentage: cpuPct,
        level: 'critical',
      });
    } else if (cpuPct > this.limits.maxCPUPercentage * 0.90) {
      logger.warn('WARNING: CPU at 90% of limit', {
        current: cpuPct.toFixed(1),
        limit: this.limits.maxCPUPercentage,
      });
      this.emit('degradation:high', {
        resource: 'cpu',
        percentage: cpuPct,
        level: 'high',
      });
    } else if (cpuPct > this.limits.maxCPUPercentage * 0.80) {
      logger.info('INFO: CPU at 80% of limit', {
        current: cpuPct.toFixed(1),
        limit: this.limits.maxCPUPercentage,
      });
      this.emit('degradation:medium', {
        resource: 'cpu',
        percentage: cpuPct,
        level: 'medium',
      });
    }

    // Check total connections
    const connPct = (snapshot.connections.total / this.limits.maxTotalConnections) * 100;
    if (connPct > 95) {
      logger.error('CRITICAL: Connections at 95% capacity', {
        current: snapshot.connections.total,
        limit: this.limits.maxTotalConnections,
      });
      this.emit('degradation:critical', {
        resource: 'connections',
        percentage: connPct,
        level: 'critical',
      });
    } else if (connPct > 90) {
      logger.warn('WARNING: Connections at 90% capacity', {
        current: snapshot.connections.total,
        limit: this.limits.maxTotalConnections,
      });
      this.emit('degradation:high', {
        resource: 'connections',
        percentage: connPct,
        level: 'high',
      });
    } else if (connPct > 80) {
      logger.info('INFO: Connections at 80% capacity', {
        current: snapshot.connections.total,
        limit: this.limits.maxTotalConnections,
      });
      this.emit('degradation:medium', {
        resource: 'connections',
        percentage: connPct,
        level: 'medium',
      });
    }

    // Check sessions
    const sessPct = (this.sessionResources.size / this.limits.maxSessions) * 100;
    if (sessPct > 90) {
      logger.warn('WARNING: Sessions at capacity', {
        current: this.sessionResources.size,
        limit: this.limits.maxSessions,
      });
      this.emit('degradation:high', {
        resource: 'sessions',
        percentage: sessPct,
        level: 'high',
      });
    }
  }

  /**
   * Register session
   */
  registerSession(sessionId: string): void {
    if (!this.sessionResources.has(sessionId)) {
      this.sessionResources.set(sessionId, {
        sessionId,
        connections: 0,
        memoryEstimate: 0,
        lastActivity: new Date(),
      });
      logger.info('Session registered', { sessionId });
    }
  }

  /**
   * Unregister session
   */
  unregisterSession(sessionId: string): void {
    this.sessionResources.delete(sessionId);
    logger.info('Session unregistered', { sessionId });
  }

  /**
   * Add connection to session
   */
  addConnection(sessionId: string): boolean {
    const sessionRes = this.sessionResources.get(sessionId);
    if (!sessionRes) {
      logger.warn('Cannot add connection to unregistered session', { sessionId });
      return false;
    }

    // Check session connection limit
    if (sessionRes.connections >= this.limits.maxConnectionsPerSession) {
      logger.warn('Session connection limit reached', {
        sessionId,
        current: sessionRes.connections,
        limit: this.limits.maxConnectionsPerSession,
      });
      this.emit('limit:sessionConnections', {
        sessionId,
        connections: sessionRes.connections,
        limit: this.limits.maxConnectionsPerSession,
      });
      return false;
    }

    // Check total connection limit
    if (this.totalConnections >= this.limits.maxTotalConnections) {
      logger.warn('Total connection limit reached', {
        current: this.totalConnections,
        limit: this.limits.maxTotalConnections,
      });
      return false;
    }

    sessionRes.connections++;
    sessionRes.lastActivity = new Date();
    sessionRes.memoryEstimate += 50000; // Estimate 50KB per connection
    this.totalConnections++;

    logger.debug('Connection added', {
      sessionId,
      sessionConnections: sessionRes.connections,
      totalConnections: this.totalConnections,
    });

    return true;
  }

  /**
   * Remove connection from session
   */
  removeConnection(sessionId: string): void {
    const sessionRes = this.sessionResources.get(sessionId);
    if (sessionRes && sessionRes.connections > 0) {
      sessionRes.connections--;
      sessionRes.lastActivity = new Date();
      sessionRes.memoryEstimate -= 50000;
      this.totalConnections--;

      logger.debug('Connection removed', {
        sessionId,
        sessionConnections: sessionRes.connections,
        totalConnections: this.totalConnections,
      });
    }
  }

  /**
   * Can accept new connection?
   */
  canAcceptConnection(sessionId: string): boolean {
    const sessionRes = this.sessionResources.get(sessionId);
    
    if (!sessionRes) {
      return false;
    }

    if (sessionRes.connections >= this.limits.maxConnectionsPerSession) {
      return false;
    }

    if (this.totalConnections >= this.limits.maxTotalConnections) {
      return false;
    }

    // Check current resource usage
    const latestSnapshot = this.snapshots[this.snapshots.length - 1];
    if (latestSnapshot) {
      if (latestSnapshot.memory.percentage > this.limits.maxMemoryPercentage) {
        return false;
      }
      if (latestSnapshot.cpu.usage > this.limits.maxCPUPercentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Can create new session?
   */
  canCreateSession(): boolean {
    if (this.sessionResources.size >= this.limits.maxSessions) {
      return false;
    }

    const latestSnapshot = this.snapshots[this.snapshots.length - 1];
    if (latestSnapshot) {
      if (latestSnapshot.memory.percentage > 70) { // More conservative for new sessions
        return false;
      }
    }

    return true;
  }

  /**
   * Get current snapshot
   */
  getCurrentSnapshot(): ResourceSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  /**
   * Get snapshots
   */
  getSnapshots(count: number = 10): ResourceSnapshot[] {
    return this.snapshots.slice(-count);
  }

  /**
   * Get session resources
   */
  getSessionResources(sessionId: string): SessionResources | null {
    return this.sessionResources.get(sessionId) || null;
  }

  /**
   * Get all session resources
   */
  getAllSessionResources(): SessionResources[] {
    return Array.from(this.sessionResources.values());
  }

  /**
   * Update limits
   */
  setLimits(limits: Partial<ResourceLimits>): void {
    this.limits = { ...this.limits, ...limits };
    logger.info('Resource limits updated', this.limits);
  }

  /**
   * Get limits
   */
  getLimits(): ResourceLimits {
    return { ...this.limits };
  }

  /**
   * Get statistics
   */
  getStats() {
    const latestSnapshot = this.getCurrentSnapshot();
    
    return {
      current: latestSnapshot || null,
      limits: this.getLimits(),
      sessions: {
        total: this.sessionResources.size,
        list: this.getAllSessionResources(),
      },
      connections: {
        total: this.totalConnections,
        bySession: Object.fromEntries(this.sessionResources.entries()),
      },
    };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stop();
    this.snapshots = [];
    this.sessionResources.clear();
    this.totalConnections = 0;
    logger.info('Resource monitor cleanup complete');
  }
}

// Singleton instance
export const resourceMonitor = new ResourceMonitorService();
