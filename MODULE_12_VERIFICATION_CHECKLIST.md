# Module 12: Verification Checklist

## Pre-Test Verification

### 1. Service Files ✅
- [x] `apps/backend/src/services/scalability/resource-monitor.service.ts` exists
- [x] `apps/backend/src/services/scalability/connection-manager.service.ts` exists
- [x] Both services export singleton instances
- [x] Both services have comprehensive event emitters

### 2. Socket Integration ✅
- [x] `apps/backend/src/socket/index.ts` imports both services
- [x] `resourceMonitor.start(5000)` called on init
- [x] `connectionManager.start()` called on init
- [x] Degradation event listeners registered
- [x] Rate limit check before JOIN_SESSION
- [x] Resource check before JOIN_SESSION
- [x] Connection registration on successful join
- [x] Connection unregistration on disconnect

### 3. Monitoring Endpoints ✅
- [x] `apps/backend/src/routes/monitoring.routes.ts` updated
- [x] `GET /api/monitoring/resources` endpoint exists
- [x] `GET /api/monitoring/connections` endpoint exists
- [x] `GET /api/monitoring/session/:sessionId/connections` endpoint exists
- [x] Routes registered in `apps/backend/src/routes/index.ts`

### 4. Load Testing Framework ✅
- [x] `apps/backend/test/load/load-test.ts` created
- [x] LoadTester class with metrics collection
- [x] 6 test scenarios defined (5, 20, 50, 100, 250, 500 users)
- [x] Realistic language distributions
- [x] Gradual ramp-up implementation
- [x] Metrics: connections, CPU, memory, latency, errors
- [x] Results saved to JSON

### 5. Documentation ✅
- [x] `MODULE_12_ARCHITECTURE.md` - Architecture validation
- [x] `MODULE_12_LOAD_TEST_RESULTS.md` - Results template
- [x] `MODULE_12_IMPLEMENTATION_SUMMARY.md` - Complete summary
- [x] `QUICK_START_MODULE_12.md` - Quick reference
- [x] `apps/backend/test/load/README.md` - Test framework docs
- [x] `MODULE_12_VERIFICATION_CHECKLIST.md` - This file

### 6. Scripts ✅
- [x] `apps/backend/test/load/run-load-test.sh` created
- [x] Script is executable (chmod +x)
- [x] Script checks server health
- [x] Script creates test session

## Runtime Verification

### Before Running Tests

```bash
# 1. Backend server is running
curl http://localhost:5000/api/health
# Expected: {"status":"ok",...}

# 2. Monitoring endpoints respond
curl http://localhost:5000/api/monitoring/resources
# Expected: JSON with current/limits/sessions/connections

# 3. Database is accessible
psql -U [user] -d live_translation -c "SELECT NOW();"
# Expected: Current timestamp

# 4. Environment variables set
cat apps/backend/.env | grep -E "(DATABASE_URL|JWT_SECRET|PORT)"
# Expected: All variables present
```

### During Tests

Monitor these in separate terminals:

**Terminal 1: Run tests**
```bash
cd apps/backend
./test/load/run-load-test.sh
```

**Terminal 2: Watch resources**
```bash
watch -n 2 'curl -s http://localhost:5000/api/monitoring/resources | jq ".current"'
```

**Terminal 3: Watch connections**
```bash
watch -n 2 'curl -s http://localhost:5000/api/monitoring/connections | jq'
```

**Terminal 4: Watch logs**
```bash
tail -f apps/backend/logs/app.log | grep -E "(WARN|ERROR|degradation)"
```

### After Tests

```bash
# 1. Results file created
ls -lh apps/backend/test/load/results.json
# Expected: File exists with reasonable size

# 2. Results are valid JSON
cat apps/backend/test/load/results.json | jq '.[0].configuration'
# Expected: First test configuration displayed

# 3. All 6 scenarios completed
cat apps/backend/test/load/results.json | jq 'length'
# Expected: 6

# 4. No catastrophic failures
cat apps/backend/test/load/results.json | jq '.[].connections.successRate'
# Expected: All > 0% (hopefully > 95%)
```

## Functional Verification

### Resource Monitor

```bash
# Test resource monitoring endpoint
curl http://localhost:5000/api/monitoring/resources | jq
```

**Expected Response**:
```json
{
  "current": {
    "timestamp": "...",
    "cpu": { "usage": <number>, "loadAverage": [...] },
    "memory": { "percentage": <number>, "usedMB": <number>, ... },
    "connections": { "total": <number>, "bySession": {...} }
  },
  "limits": {
    "maxMemoryPercentage": 80,
    "maxCPUPercentage": 85,
    "maxConnectionsPerSession": 500,
    "maxTotalConnections": 1000,
    "maxSessions": 10
  },
  "sessions": { "total": <number>, "list": [...] },
  "connections": { "total": <number>, "bySession": {...} }
}
```

### Connection Manager

```bash
# Test connection monitoring endpoint
curl http://localhost:5000/api/monitoring/connections | jq
```

**Expected Response**:
```json
{
  "totalConnections": <number>,
  "totalSessions": <number>,
  "rateLimits": {
    "active": <number>,
    "recentDenials": <number>
  },
  "staleConnections": <number>,
  "heartbeats": {
    "sent": <number>,
    "received": <number>
  }
}
```

### Session-Specific Monitoring

```bash
# Create a test session first
SESSION_ID="<your-session-id>"
curl http://localhost:5000/api/monitoring/session/$SESSION_ID/connections | jq
```

**Expected Response**:
```json
{
  "sessionId": "...",
  "connections": <number>,
  "languageGroups": {
    "te": { "count": <number>, "students": [...] },
    "hi": { "count": <number>, "students": [...] },
    ...
  },
  "staleCount": <number>,
  "healthySince": "..."
}
```

### Graceful Degradation

**Test at 80% threshold**:
- Expected: INFO log, no client warnings, connections accepted

**Test at 90% threshold**:
- Expected: WARNING log, SYSTEM_WARNING event to clients, connections accepted

**Test at 95% threshold**:
- Expected: CRITICAL log, SYSTEM_WARNING event to clients, new connections REJECTED

### Rate Limiting

```bash
# Simulate rapid join attempts (should be rejected after 10)
for i in {1..15}; do
  curl -X POST http://localhost:5000/api/sessions/join \
    -H "Content-Type: application/json" \
    -d '{"sessionCode":"TEST123","name":"Student'$i'","selectedLanguage":"te"}' &
done
wait
```

**Expected**: First 10 succeed, remaining 5 get rate limit error

## Architecture Verification

### Fan-Out Efficiency

During load test with 100 students (70 Te, 20 Hi, 10 Ta):

**Check STT calls**:
```bash
# Should see only ONE STT session per session
grep "STT started" apps/backend/logs/app.log | wc -l
# Expected: 1 (not 100)
```

**Check translation calls**:
```bash
# Should see 3 unique translation targets (te, hi, ta)
grep "Translation completed" apps/backend/logs/app.log | grep -oP "targetLanguage: \w+" | sort -u | wc -l
# Expected: 3 (not 100)
```

**Check Socket.IO rooms**:
```bash
# Should see language-specific rooms
grep "session:.*:lang:" apps/backend/logs/app.log | grep -oP ":lang:\w+" | sort -u
# Expected: :lang:te, :lang:hi, :lang:ta
```

### Connection Registration

```bash
# Start server and join a session
# Then check monitoring endpoint
curl http://localhost:5000/api/monitoring/connections | jq '.totalConnections'
# Expected: 1 (or number of connected students)

# Check session-specific
curl http://localhost:5000/api/monitoring/session/TEST123/connections | jq '.connections'
# Expected: Same number
```

## Performance Benchmarks

### Expected Results (Approximate)

| Users | CPU Avg | Memory Avg | Latency P95 | Success Rate |
|-------|---------|------------|-------------|--------------|
| 5     | < 10%   | < 200MB    | < 2s        | > 99%        |
| 20    | < 15%   | < 300MB    | < 2s        | > 99%        |
| 50    | < 25%   | < 500MB    | < 2.5s      | > 98%        |
| 100   | < 40%   | < 1GB      | < 3s        | > 95%        |
| 250   | < 60%   | < 2GB      | < 4s        | > 90%        |
| 500   | < 80%   | < 3GB      | < 5s        | > 85%        |

**Note**: Actual results will vary based on hardware

## Issue Checklist

### If Tests Fail to Start

- [ ] Backend server running? (`curl http://localhost:5000/api/health`)
- [ ] Session code exists? (Create via organizer dashboard or API)
- [ ] Node modules installed? (`npm install` in apps/backend)
- [ ] TypeScript compiled? (`npx tsc --noEmit` to check)
- [ ] Port 5000 available? (`netstat -ano | findstr :5000`)

### If Connections Fail

- [ ] Rate limit exceeded? (Wait 60s or adjust in connection-manager.service.ts)
- [ ] Resources at capacity? (Check `/api/monitoring/resources`)
- [ ] Session full? (Check `maxStudents` in session config)
- [ ] Socket.IO transport issues? (Check client logs for websocket errors)

### If Metrics Look Wrong

- [ ] Monitoring interval too long? (Adjust `resourceMonitor.start(interval)`)
- [ ] Not enough time between snapshots? (Wait for multiple monitoring cycles)
- [ ] Client-side vs server-side confusion? (Tests report client CPU/memory)
- [ ] Calculation errors? (Check implementation in resource-monitor.service.ts)

### If Graceful Degradation Doesn't Work

- [ ] Thresholds set correctly? (Check limits in resource-monitor.service.ts)
- [ ] Event listeners registered? (Check socket/index.ts initialization)
- [ ] Resource checks enforced? (Check JOIN_SESSION handler)
- [ ] Logs showing events? (`grep degradation apps/backend/logs/app.log`)

## Sign-Off Checklist

Before marking Module 12 as complete:

- [x] All service files implemented and tested
- [x] Socket integration complete
- [x] Monitoring endpoints functional
- [x] Load testing framework complete
- [x] Documentation comprehensive
- [ ] Load tests executed successfully (run tests to check)
- [ ] Results documented in MODULE_12_LOAD_TEST_RESULTS.md
- [ ] Bottlenecks identified and noted
- [ ] Proven capacity documented with evidence
- [ ] Limitations clearly stated

## Status

**Implementation**: ✅ COMPLETE  
**Load Testing**: ⏳ READY (awaiting execution)  
**Results Documentation**: ⏳ PENDING (awaiting test results)  
**Production Readiness**: ⚠️ REQUIRES VALIDATION

---

**Last Updated**: 2026-09-12  
**Module 12 Status**: Implementation complete, ready for load testing
