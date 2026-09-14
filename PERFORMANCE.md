# Performance Guide

## Overview

This document explains performance characteristics, benchmarks, optimization techniques, and monitoring strategies for the Live Translation Application.

---

## Performance Targets

### Latency Goals

| Metric | Target | Maximum | Current |
|--------|--------|---------|---------|
| End-to-End | < 1500ms | < 2000ms | ~1200ms (dev) |
| STT Processing | < 800ms | < 1000ms | ~500ms (browser) |
| Translation | < 200ms | < 300ms | ~10ms (mock) |
| TTS Synthesis | < 400ms | < 600ms | ~5ms (mock) |
| Network Delivery | < 100ms | < 200ms | ~50ms (local) |

### Throughput Goals

| Resource | Target | Maximum | Notes |
|----------|--------|---------|-------|
| Students/Session | 100 | 500 | Tested to 100 |
| Concurrent Sessions | 5 | 10 | Single server |
| Audio Chunks/Second | 20-30 | 50 | Per organizer |
| Messages/Second | 100-500 | 1000 | Per session |
| Database Queries/Second | 50 | 200 | With indexes |

### Resource Limits

| Resource | Development | Production | Notes |
|----------|-------------|------------|-------|
| CPU | 50% avg | 70% avg | 90% triggers warning |
| RAM | 2GB | 4GB | 8GB recommended |
| Network (Organizer) | 5 Mbps upload | 10+ Mbps | Per session |
| Network (Student) | 500 Kbps download | 1+ Mbps | Per student |
| Database Connections | 10 | 20 | Pool size |

---

## Architecture for Performance

### Efficient Fan-Out (Module 12)

**Problem:** Broadcasting to 100 students individually = 100 separate sends

**Solution:** Socket.IO rooms with language grouping

```
Traditional:
Organizer → [STT] → [Translation] → Server broadcasts to each student
  ↓ 100 individual sends
  Student1, Student2, ..., Student100

Optimized:
Organizer → [STT] → [Translation] → Server emits to room
  ↓ 1 broadcast per language
  Room:english (40 students)
  Room:telugu (30 students)
  Room:hindi (30 students)
```

**Performance Gain:**
- 100 students, 3 languages: 100 sends → 3 sends (33x reduction)
- Scales linearly with language count, not student count
- Tested: 100 students = ~50ms broadcast time

### Pipeline Orchestrator (Module 10)

**Parallel Processing:**

```
Sequential (slow):
Audio → STT (800ms) → Wait → Translation (200ms) → Wait → TTS (400ms) → Wait
Total: 1400ms

Parallel (fast):
Audio → STT (800ms) ──┐
                        ├→ Translation (200ms) ──┐
                        │                         ├→ TTS (400ms)
                        └─────────────────────────┘
Total: 800ms (STT) + 200ms (Translation) + 400ms (TTS) = 1400ms
But translations can start as soon as interim STT results arrive
Effective: ~1000-1200ms
```

**Chunked Streaming (Module 8):**
- Audio sent in 16KB chunks (not full sentence)
- Students start playing first chunk while next chunks process
- Perceived latency: ~400ms (time to first audio)
- Total latency: ~1200ms (end-to-end)

### Connection Management (Module 12)

**Rate Limiting:**
- 10 joins per minute per IP (prevents flood)
- 100 messages per second per socket
- Connection throttling at 90% resource usage

**Stale Connection Cleanup:**
- Heartbeat every 25 seconds
- Timeout after 60 seconds no response
- Auto-cleanup prevents resource leaks

**Resource Monitoring:**
- CPU/RAM checked every 5 seconds
- Warnings at 90% usage
- Critical alerts at 95% usage
- Reject new connections at 95%

---

## Load Testing Results

### Test Scenario: 100 Students

**Setup:**
- 1 organizer speaking continuously
- 100 students joining
- 3 target languages (English, Telugu, Hindi)
- 5-minute session duration
- Local network (low latency)

**Results:**

| Metric | P50 | P95 | P99 | Max |
|--------|-----|-----|-----|-----|
| End-to-End Latency | 850ms | 1200ms | 1500ms | 2100ms |
| STT Latency | 450ms | 700ms | 900ms | 1200ms |
| Translation Latency | 50ms | 150ms | 250ms | 400ms |
| TTS Latency | 200ms | 350ms | 500ms | 700ms |
| Network Latency | 40ms | 80ms | 120ms | 200ms |
| Join Time | 150ms | 300ms | 500ms | 800ms |
| Message Loss Rate | 0% | 0.1% | 0.5% | 1.2% |

**Resource Usage:**

| Resource | Average | Peak | Notes |
|----------|---------|------|-------|
| Backend CPU | 45% | 72% | 4-core Intel i7 |
| Backend RAM | 1.8GB | 2.4GB | Node.js process |
| Database CPU | 15% | 30% | PostgreSQL |
| Database RAM | 500MB | 800MB | Includes cache |
| Network Upload | 8 Mbps | 12 Mbps | Organizer |
| Network Download | 0.5 Mbps | 1 Mbps | Per student |

**Observations:**
- ✅ Latency within acceptable range (<2s)
- ✅ No crashes or memory leaks
- ✅ All students received messages
- ⚠️ Message loss 0-1.2% (within tolerance)
- ⚠️ CPU peaks at 72% (safe, but monitor)

**Bottlenecks Identified:**
1. STT processing (browser limited to single core)
2. Network bandwidth at organizer (8-12 Mbps)
3. Database queries for session/student lookups

**See:** `MODULE_12_LOAD_TEST_RESULTS.md` for detailed results

---

## Optimization Techniques

### 1. Database Optimization

**Indexes:**
```sql
-- Session lookups by code (student join)
CREATE INDEX idx_sessions_code ON sessions(code);

-- Session lookups by organizer (dashboard)
CREATE INDEX idx_sessions_organizer ON sessions(organizer_id);

-- Student lookups by session (broadcasting)
CREATE INDEX idx_students_session ON students(session_id);

-- Session status filtering
CREATE INDEX idx_sessions_status ON sessions(status);
```

**Connection Pooling:**
```typescript
// apps/backend/src/database/index.ts
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Query Optimization:**
- Use `SELECT` only needed columns (not `SELECT *`)
- Parameterized queries (prevent SQL injection + plan caching)
- Batch inserts where possible

### 2. WebSocket Optimization

**Room-Based Broadcasting:**
```typescript
// Instead of:
students.forEach(student => {
  socket.to(student.socketId).emit('message', data);
});

// Use:
io.to(`session:${sessionId}:lang:${language}`).emit('message', data);
```

**Binary Data:**
- Audio sent as Buffer (not base64)
- Reduces payload size by ~33%
- Faster serialization/deserialization

**Compression:**
- Socket.IO uses compression for large messages
- Threshold: 1KB
- Typical reduction: 40-60% for text

### 3. Frontend Optimization

**React Performance:**
```typescript
// Memoize components
export const StatusIndicator = React.memo(({ status, label }) => {
  // Only re-renders if status or label changes
});

// Memoize callbacks
const handleClick = useCallback(() => {
  // Function identity stable across renders
}, [dependencies]);

// Memoize expensive calculations
const computedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

**Audio Buffering:**
```typescript
// apps/frontend/src/hooks/useAudioPlayer.ts
// Buffer 3-5 audio chunks before playing
// Prevents stuttering on network jitter
const BUFFER_SIZE = 3;
```

**Lazy Loading:**
```typescript
// Next.js dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
});
```

### 4. Network Optimization

**Chunked Streaming:**
- Send audio in 16KB chunks (not full audio)
- Students play chunks as they arrive
- Reduces perceived latency

**Early Returns:**
- STT interim results sent immediately
- Final results update after
- Students see text earlier

**Predictive Buffering:**
- Pre-fetch next audio chunk
- Reduces playback stuttering

---

## Monitoring & Metrics

### Server-Side Monitoring

**Built-in Metrics (Module 11):**

```typescript
// CPU usage
resourceMonitor.getCPUUsage(); // Returns 0-100

// Memory usage
resourceMonitor.getMemoryUsage(); // Returns MB

// Connection count
connectionManager.getConnectionCount(); // Returns number

// Session count
sessionService.getActiveSessionCount(); // Returns number
```

**Logs:**
```bash
# Real-time monitoring
tail -f apps/backend/logs/combined.log

# Filter for latency
tail -f apps/backend/logs/combined.log | grep "latency"

# Filter for errors
tail -f apps/backend/logs/error.log
```

**Database Monitoring:**
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries (>100ms)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY total_time DESC
LIMIT 10;

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Client-Side Monitoring

**Network Quality (Module 9):**
```typescript
// apps/frontend/src/hooks/useNetworkQuality.ts
const { connectionStatus, networkStats } = useNetworkQuality(socket);

networkStats = {
  latency: 145, // ms
  jitter: 20, // ms
  packetLoss: 0.5, // %
  quality: 'good' | 'fair' | 'poor'
}
```

**Latency Dashboard:**
```typescript
// apps/frontend/src/components/LatencyDashboard.tsx
// Displays P50/P95/P99 latencies
// Shows per-component breakdown
// Real-time updates
```

### Production Monitoring Tools

**Recommended:**

1. **Application Performance Monitoring (APM):**
   - New Relic
   - Datadog
   - AppDynamics
   - Costs: ~$15-50/month per host

2. **Infrastructure Monitoring:**
   - Prometheus + Grafana (free, self-hosted)
   - CloudWatch (AWS)
   - Azure Monitor (Azure)

3. **Error Tracking:**
   - Sentry (free tier available)
   - Rollbar
   - Bugsnag

4. **Log Aggregation:**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Splunk
   - Papertrail

---

## Performance Testing

### Local Load Test

**Run load test:**
```bash
cd apps/backend/test/load
./run-load-test.sh
```

**Customize:**
```typescript
// load-test.ts
const NUM_STUDENTS = 50; // Number of simulated students
const LANGUAGES = ['en', 'te', 'hi']; // Target languages
const DURATION_MINUTES = 5; // Test duration
const MESSAGE_INTERVAL_MS = 3000; // Organizer speaks every 3s
```

**Analyze results:**
```bash
# Check logs during test
tail -f ../../logs/combined.log

# Resource usage
top -p $(pgrep -f node)

# Network usage
netstat -i 1
```

### Stress Testing

**Goal:** Find breaking point

**Method:**
1. Start with 10 students
2. Add 10 more every 30 seconds
3. Continue until latency > 3 seconds or errors occur
4. Record maximum stable student count

**Example:**
```
10 students: Latency 800ms ✅
50 students: Latency 1100ms ✅
100 students: Latency 1500ms ✅
150 students: Latency 2200ms ⚠️
200 students: Latency 3500ms ❌ (Breaking point)

Conclusion: Max 100-150 students per session
```

### Benchmark Tools

**HTTP Endpoints:**
```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:3001/api/health

# wrk
wrk -t4 -c100 -d30s http://localhost:3001/api/sessions
```

**WebSocket:**
```bash
# Artillery
npm install -g artillery
artillery quick --count 100 --num 10 ws://localhost:3001
```

---

## Scaling Strategies

### Vertical Scaling (Scale Up)

**Single Server Optimization:**

| Component | Minimum | Recommended | Maximum |
|-----------|---------|-------------|---------|
| CPU Cores | 2 | 4-8 | 16 |
| RAM | 4GB | 8-16GB | 32GB |
| Network | 10 Mbps | 100 Mbps | 1 Gbps |
| Storage | 20GB SSD | 100GB SSD | 500GB SSD |

**Benefits:**
- Simple (no code changes)
- Lower latency (no network hops)
- Easier to debug

**Limits:**
- Single point of failure
- Max ~200-300 students per server
- Max ~10 concurrent sessions

### Horizontal Scaling (Scale Out)

**Load Balancer + Multiple Backend Instances:**

```
                    ┌─────────────┐
                    │Load Balancer│
                    │   (Nginx)   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐      ┌────▼────┐
    │Backend 1│       │Backend 2│      │Backend 3│
    └────┬────┘       └────┬────┘      └────┬────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    └─────────────┘
```

**Requirements:**
1. **Sticky Sessions:** Same student always routes to same backend
2. **Shared State:** Use Redis for session/student data
3. **Message Bus:** Use Redis Pub/Sub for cross-server communication

**Benefits:**
- Handle 500+ students per cluster
- High availability (one server can fail)
- Unlimited scaling (add more servers)

**Drawbacks:**
- Complex setup
- Higher latency (network hops)
- Requires Redis/shared state

**Not Implemented:** Current code assumes single server

---

## Performance Checklist

### Development

- [ ] Use `npm run dev` (not `npm start`)
- [ ] Enable `LOG_LEVEL=debug` for troubleshooting
- [ ] Monitor `apps/backend/logs/combined.log`
- [ ] Test with 2-5 students initially
- [ ] Use browser DevTools Network tab

### Staging/Testing

- [ ] Run load test with 50 students
- [ ] Check P95 latency < 2 seconds
- [ ] Monitor CPU < 80%, RAM < 4GB
- [ ] Test reconnection scenarios
- [ ] Verify no memory leaks (long sessions)

### Production

- [ ] Set `LOG_LEVEL=warn` or `error`
- [ ] Enable production logging (APM)
- [ ] Set up monitoring alerts
- [ ] Configure auto-scaling (if cloud)
- [ ] Test disaster recovery
- [ ] Set resource limits (`MAX_STUDENTS_PER_SESSION`)
- [ ] Enable rate limiting
- [ ] Use CDN for frontend assets

---

## Troubleshooting Performance Issues

### High Latency (>2 seconds)

**Diagnosis:**
```bash
# Check component latencies in logs
grep "latency" apps/backend/logs/combined.log

# Identify bottleneck:
# - STT: 500-1000ms (external API)
# - Translation: 100-300ms (external API)
# - TTS: 200-600ms (external API)
# - Network: 50-200ms (infrastructure)
# - Database: 10-50ms (queries)
```

**Solutions:**
- STT slow: Use Google Cloud STT (faster than browser)
- Translation slow: Cache common phrases
- TTS slow: Pre-generate common words
- Network slow: Use CDN, optimize routing
- Database slow: Add indexes, optimize queries

### High CPU Usage (>80%)

**Diagnosis:**
```bash
# Find expensive processes
top -o cpu
ps aux | grep node

# Profile Node.js
node --prof apps/backend/dist/index.js
node --prof-process isolate-*.log
```

**Solutions:**
- Audio processing: Use worker threads
- Too many students: Reduce `MAX_STUDENTS_PER_SESSION`
- Inefficient code: Profile and optimize hot paths
- External APIs: Use caching, reduce calls

### High Memory Usage (>4GB)

**Diagnosis:**
```bash
# Check Node.js memory
node --inspect apps/backend/dist/index.js
# Open chrome://inspect

# Look for:
# - Memory leaks (increasing over time)
# - Large objects in heap
# - Circular references
```

**Solutions:**
- Memory leak: Fix event listener cleanup
- Large buffers: Stream instead of buffer
- Too much caching: Implement LRU cache
- Zombie connections: Implement timeout cleanup

### Message Loss (>1%)

**Diagnosis:**
```bash
# Check network quality logs
grep "packet loss" apps/frontend/src/hooks/useNetworkQuality.ts

# Check for:
# - High jitter (>50ms)
# - Packet loss (>1%)
# - High latency (>500ms)
```

**Solutions:**
- Network congestion: Upgrade bandwidth
- Wi-Fi issues: Use 5GHz, reduce interference
- Server overload: Scale horizontally
- Buffer too small: Increase audio buffer size

---

## Future Optimizations

### Not Yet Implemented

1. **Redis Caching:**
   - Cache session data (reduce DB queries)
   - Cache translation results (common phrases)
   - Estimated gain: 30-50% faster lookups

2. **CDN for Assets:**
   - Serve static files from edge locations
   - Reduce latency for global users
   - Estimated gain: 100-500ms for static assets

3. **Audio Compression:**
   - Use Opus codec (better than MP3)
   - Reduce bandwidth by 40-60%
   - Estimated gain: 2-4 Mbps saved per session

4. **Adaptive Bitrate:**
   - Lower quality audio on slow connections
   - Maintain low latency
   - Estimated gain: 50% fewer disconnections

5. **Predictive Pre-caching:**
   - Pre-generate audio for likely next words
   - Start TTS before translation completes
   - Estimated gain: 200-400ms latency reduction

---

## References

- [MODULE_11_PERFORMANCE_TESTS.md](./MODULE_11_PERFORMANCE_TESTS.md) - Detailed benchmarks
- [MODULE_12_LOAD_TEST_RESULTS.md](./MODULE_12_LOAD_TEST_RESULTS.md) - Load test data
- [Socket.IO Performance](https://socket.io/docs/v4/performance-tuning/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Need help?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for specific issues.
