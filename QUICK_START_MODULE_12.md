# Module 12: Quick Start Guide

## Status: ✅ READY FOR TESTING

## Architecture Confirmed

✅ **Efficient fan-out already implemented**
- ONE STT → ONE translation per language → broadcast to language room
- 100 students with 3 languages = 4 operations (not 300)
- Socket.IO rooms: `session:{id}:lang:{language}`

## Quick Commands

### 1. Start Backend Server
```bash
cd apps/backend
npm run dev
```

### 2. Run Load Tests
```bash
cd apps/backend
./test/load/run-load-test.sh
```

Or with custom configuration:
```bash
SERVER_URL=http://localhost:5000 SESSION_CODE=CUSTOM123 npx ts-node test/load/load-test.ts
```

### 3. Monitor Resources (in another terminal)
```bash
# Overall resource usage
curl http://localhost:5000/api/monitoring/resources | jq

# Connection statistics
curl http://localhost:5000/api/monitoring/connections | jq

# Session-specific details
curl http://localhost:5000/api/monitoring/session/TEST123/connections | jq
```

### 4. View Results
```bash
cat apps/backend/test/load/results.json | jq
```

## Test Scenarios

| Scenario | Users | Duration | Languages |
|----------|-------|----------|-----------|
| 1 | 5 | 30s | 60% Te, 40% Hi |
| 2 | 20 | 60s | 70% Te, 20% Hi, 10% Ta |
| 3 | 50 | 60s | 70% Te, 20% Hi, 10% Ta |
| 4 | 100 | 90s | 70% Te, 20% Hi, 10% Ta |
| 5 | 250 | 90s | 70% Te, 20% Hi, 10% Ta |
| 6 | 500 | 120s | 70% Te, 20% Hi, 10% Ta |

**Total test time**: ~12 minutes (with 30s cooldown between tests)

## What to Watch For

### Good Signs ✅
- Connection success rate > 95%
- CPU < 80% average
- Memory growth linear and capped
- Latency P95 < 3 seconds
- No errors in logs

### Warning Signs ⚠️
- Connection success rate 90-95%
- CPU 80-90% sustained
- Memory growing continuously
- Latency P95 > 3 seconds
- Occasional errors

### Problem Signs ❌
- Connection success rate < 90%
- CPU > 90% sustained
- Out of memory errors
- Latency > 5 seconds
- Frequent errors/disconnects

## Resource Limits (Current Configuration)

```typescript
{
  maxMemoryPercentage: 80,        // 80% of system memory
  maxCPUPercentage: 85,            // 85% CPU usage
  maxConnectionsPerSession: 500,   // 500 per session
  maxTotalConnections: 1000,       // 1000 total
  maxSessions: 10,                 // 10 concurrent sessions
}
```

## Graceful Degradation

- **< 80%**: Normal operation
- **80-90%**: Continue, INFO alerts
- **90-95%**: Continue, WARNING alerts sent to clients
- **> 95%**: REJECT new connections, CRITICAL alerts

## After Testing

1. Fill in actual results in `MODULE_12_LOAD_TEST_RESULTS.md`
2. Document proven capacity
3. Identify any bottlenecks
4. Update recommendations

## Important Notes

⚠️ **DO NOT claim 500-user production capacity** without:
- Actual load test results showing stable operation
- Real STT/Translation/TTS providers (not mocks)
- Production hardware testing
- Real network conditions
- Multi-hour stability validation

✅ **CAN claim**:
- Architecture implements efficient fan-out correctly
- System has monitoring and protection mechanisms
- Graceful degradation works as designed
- Load testing framework is comprehensive

## Troubleshooting

### Server won't start
```bash
# Check if port is in use
netstat -ano | findstr :5000

# Check environment variables
cat apps/backend/.env
```

### Tests fail to connect
```bash
# Verify server is running
curl http://localhost:5000/api/health

# Check session exists
curl http://localhost:5000/api/sessions
```

### High resource usage
```bash
# Check current resources
curl http://localhost:5000/api/monitoring/resources

# Reduce test scale (edit load-test.ts scenarios array)
```

## Documentation

- **Architecture**: `MODULE_12_ARCHITECTURE.md`
- **Test Framework**: `apps/backend/test/load/README.md`
- **Results Template**: `MODULE_12_LOAD_TEST_RESULTS.md`
- **Implementation Summary**: `MODULE_12_IMPLEMENTATION_SUMMARY.md`

## Next Module

After completing load tests and documenting results, proceed to:
- Module 13 (if defined)
- Or production deployment preparation
- Or horizontal scaling with Redis adapter

---

**Module 12 Status**: ✅ Implementation Complete, Ready for Testing
