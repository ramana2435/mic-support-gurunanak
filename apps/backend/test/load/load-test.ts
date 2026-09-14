/**
 * Load Testing Framework for Module 12
 * 
 * Tests scalability with 5, 20, 50, 100, 250, 500 concurrent connections
 * Measures: CPU, RAM, network, latency, connection success rate
 */

import { io, Socket } from 'socket.io-client';
import * as os from 'os';
import * as process from 'process';

interface TestConfig {
  targetUsers: number;
  languageDistribution: { language: string; percentage: number }[];
  duration: number; // seconds
  rampUpTime: number; // seconds
}

interface Metrics {
  startTime: number;
  endTime?: number;
  cpuSamples: number[];
  memorySamples: number[];
  connectionAttempts: number;
  connectionSuccesses: number;
  connectionFailures: number;
  messagesSent: number;
  messagesReceived: number;
  latencies: number[];
  errors: string[];
}

class LoadTester {
  private sockets: Socket[] = [];
  private metrics: Metrics;
  private serverUrl: string;
  private sessionCode: string;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(serverUrl: string, sessionCode: string) {
    this.serverUrl = serverUrl;
    this.sessionCode = sessionCode;
    this.metrics = {
      startTime: Date.now(),
      cpuSamples: [],
      memorySamples: [],
      connectionAttempts: 0,
      connectionSuccesses: 0,
      connectionFailures: 0,
      messagesSent: 0,
      messagesReceived: 0,
      latencies: [],
      errors: [],
    };
  }

  /**
   * Start monitoring system resources
   */
  private startMonitoring(): void {
    const cpuUsages: number[] = [];
    
    this.monitoringInterval = setInterval(async () => {
      // Memory usage
      const memUsage = process.memoryUsage();
      const memUsedMB = memUsage.heapUsed / 1024 / 1024;
      this.metrics.memorySamples.push(memUsedMB);

      // CPU usage (average over interval)
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach((cpu) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const cpuPercent = 100 - (100 * idle) / total;
      this.metrics.cpuSamples.push(cpuPercent);

      // Fetch server resources if available
      try {
        const response = await fetch(`${this.serverUrl}/api/monitoring/resources`);
        if (response.ok) {
          const serverMetrics = await response.json();
          console.log(`[MONITOR] Server CPU: ${serverMetrics.cpu.current.toFixed(1)}%, Memory: ${serverMetrics.memory.usedMB.toFixed(1)}MB, Connections: ${serverMetrics.connections.total}`);
        }
      } catch (error) {
        // Server might not be reachable
      }
    }, 2000);
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  /**
   * Create a simulated student connection
   */
  private async createConnection(
    studentId: string,
    language: string,
    index: number
  ): Promise<Socket | null> {
    return new Promise((resolve) => {
      this.metrics.connectionAttempts++;

      const socket = io(this.serverUrl, {
        transports: ['websocket'],
        reconnection: false,
      });

      const timeout = setTimeout(() => {
        this.metrics.connectionFailures++;
        this.metrics.errors.push(`Connection timeout for student ${studentId}`);
        socket.disconnect();
        resolve(null);
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);

        // Join session
        socket.emit('JOIN_SESSION', {
          sessionCode: this.sessionCode,
          studentId,
          language,
        });

        // Listen for join confirmation
        socket.on('SESSION_JOINED', () => {
          this.metrics.connectionSuccesses++;
          console.log(`[${index}] Student ${studentId} joined (${language})`);
          resolve(socket);
        });

        // Listen for errors
        socket.on('SESSION_ERROR', (error) => {
          this.metrics.connectionFailures++;
          this.metrics.errors.push(`Join error for ${studentId}: ${error.message}`);
          socket.disconnect();
          resolve(null);
        });

        // Track received messages
        socket.on('TRANSLATED_TEXT', () => {
          this.metrics.messagesReceived++;
        });

        socket.on('TRANSLATED_AUDIO_CHUNK', (data) => {
          this.metrics.messagesReceived++;
          
          // Calculate latency if we have timestamp
          if (data.timestamp) {
            const latency = Date.now() - data.timestamp;
            this.metrics.latencies.push(latency);
          }
        });
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.metrics.connectionFailures++;
        this.metrics.errors.push(`Connection error for ${studentId}: ${error.message}`);
        resolve(null);
      });

      socket.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect') {
          this.metrics.errors.push(`Unexpected disconnect for ${studentId}: ${reason}`);
        }
      });
    });
  }

  /**
   * Run load test
   */
  async runTest(config: TestConfig): Promise<void> {
    console.log(`\n=== Load Test: ${config.targetUsers} Users ===`);
    console.log(`Language distribution: ${JSON.stringify(config.languageDistribution)}`);
    console.log(`Duration: ${config.duration}s, Ramp-up: ${config.rampUpTime}s\n`);

    this.startMonitoring();

    // Calculate users per language
    const usersPerLanguage: { [lang: string]: number } = {};
    config.languageDistribution.forEach((dist) => {
      usersPerLanguage[dist.language] = Math.floor(
        (config.targetUsers * dist.percentage) / 100
      );
    });

    // Ramp up connections
    const rampUpDelay = (config.rampUpTime * 1000) / config.targetUsers;
    let connectionIndex = 0;

    for (const [language, count] of Object.entries(usersPerLanguage)) {
      for (let i = 0; i < count; i++) {
        const studentId = `student-${language}-${i}`;
        const socket = await this.createConnection(studentId, language, connectionIndex++);
        
        if (socket) {
          this.sockets.push(socket);
        }

        // Ramp up delay
        if (connectionIndex < config.targetUsers) {
          await this.sleep(rampUpDelay);
        }
      }
    }

    console.log(`\n[RAMP-UP COMPLETE] Connected: ${this.metrics.connectionSuccesses}/${this.metrics.connectionAttempts}`);

    // Hold connections for duration
    console.log(`[HOLD] Maintaining connections for ${config.duration}s...\n`);
    await this.sleep(config.duration * 1000);

    // Cleanup
    this.stopMonitoring();
    this.metrics.endTime = Date.now();
    this.disconnectAll();
  }

  /**
   * Disconnect all sockets
   */
  private disconnectAll(): void {
    console.log(`\n[CLEANUP] Disconnecting ${this.sockets.length} sockets...`);
    this.sockets.forEach((socket) => socket.disconnect());
    this.sockets = [];
  }

  /**
   * Get test results
   */
  getResults(): any {
    const duration = this.metrics.endTime
      ? (this.metrics.endTime - this.metrics.startTime) / 1000
      : 0;

    const cpuAvg = this.average(this.metrics.cpuSamples);
    const cpuMax = Math.max(...this.metrics.cpuSamples, 0);

    const memAvg = this.average(this.metrics.memorySamples);
    const memMax = Math.max(...this.metrics.memorySamples, 0);

    const latencySorted = this.metrics.latencies.sort((a, b) => a - b);
    const p50 = this.percentile(latencySorted, 50);
    const p95 = this.percentile(latencySorted, 95);
    const p99 = this.percentile(latencySorted, 99);

    return {
      configuration: {
        targetUsers: this.metrics.connectionAttempts,
        duration: duration.toFixed(2),
      },
      connections: {
        attempts: this.metrics.connectionAttempts,
        successes: this.metrics.connectionSuccesses,
        failures: this.metrics.connectionFailures,
        successRate: (
          (this.metrics.connectionSuccesses / this.metrics.connectionAttempts) *
          100
        ).toFixed(2),
      },
      resources: {
        cpu: {
          avg: cpuAvg.toFixed(2),
          max: cpuMax.toFixed(2),
          samples: this.metrics.cpuSamples.length,
        },
        memory: {
          avgMB: memAvg.toFixed(2),
          maxMB: memMax.toFixed(2),
          samples: this.metrics.memorySamples.length,
        },
      },
      messaging: {
        sent: this.metrics.messagesSent,
        received: this.metrics.messagesReceived,
      },
      latency: {
        p50: p50.toFixed(2),
        p95: p95.toFixed(2),
        p99: p99.toFixed(2),
        samples: this.metrics.latencies.length,
      },
      errors: {
        count: this.metrics.errors.length,
        messages: this.metrics.errors.slice(0, 10), // First 10 errors
      },
    };
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper: calculate average
   */
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Helper: calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

/**
 * Main test execution
 */
async function main() {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  const sessionCode = process.env.SESSION_CODE || 'TEST123';

  console.log(`Load Testing Configuration:`);
  console.log(`Server: ${serverUrl}`);
  console.log(`Session Code: ${sessionCode}`);

  // Test scenarios
  const scenarios: TestConfig[] = [
    {
      targetUsers: 5,
      languageDistribution: [
        { language: 'te', percentage: 60 },
        { language: 'hi', percentage: 40 },
      ],
      duration: 30,
      rampUpTime: 5,
    },
    {
      targetUsers: 20,
      languageDistribution: [
        { language: 'te', percentage: 70 },
        { language: 'hi', percentage: 20 },
        { language: 'ta', percentage: 10 },
      ],
      duration: 60,
      rampUpTime: 10,
    },
    {
      targetUsers: 50,
      languageDistribution: [
        { language: 'te', percentage: 70 },
        { language: 'hi', percentage: 20 },
        { language: 'ta', percentage: 10 },
      ],
      duration: 60,
      rampUpTime: 15,
    },
    {
      targetUsers: 100,
      languageDistribution: [
        { language: 'te', percentage: 70 },
        { language: 'hi', percentage: 20 },
        { language: 'ta', percentage: 10 },
      ],
      duration: 90,
      rampUpTime: 20,
    },
    {
      targetUsers: 250,
      languageDistribution: [
        { language: 'te', percentage: 70 },
        { language: 'hi', percentage: 20 },
        { language: 'ta', percentage: 10 },
      ],
      duration: 90,
      rampUpTime: 30,
    },
    {
      targetUsers: 500,
      languageDistribution: [
        { language: 'te', percentage: 70 },
        { language: 'hi', percentage: 20 },
        { language: 'ta', percentage: 10 },
      ],
      duration: 120,
      rampUpTime: 60,
    },
  ];

  const allResults: any[] = [];

  for (const scenario of scenarios) {
    const tester = new LoadTester(serverUrl, sessionCode);

    try {
      await tester.runTest(scenario);
      const results = tester.getResults();
      allResults.push(results);

      console.log('\n=== Test Results ===');
      console.log(JSON.stringify(results, null, 2));

      // Wait between tests
      console.log('\n[WAIT] Cooling down for 30s before next test...\n');
      await new Promise((resolve) => setTimeout(resolve, 30000));
    } catch (error: any) {
      console.error(`Test failed:`, error.message);
    }
  }

  // Save results
  const fs = require('fs');
  const resultsPath = 'test/load/results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));
  console.log(`\n[COMPLETE] Results saved to ${resultsPath}`);

  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { LoadTester, TestConfig };
