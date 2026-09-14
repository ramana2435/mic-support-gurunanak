# Load Testing Framework - Module 12

## Overview

This load testing framework validates the system's ability to support large seminar sessions with efficient fan-out architecture.

## Architecture Validation

The system implements **efficient fan-out** where:
- ONE STT stream processes the organizer's audio
- ONE translation stream per target language
- Broadcast to all students in each language group via Socket.IO rooms

Example with 100 students (70 Telugu, 20 Hindi, 10 Tamil):
```
Organizer Audio → STT (1x)
                    ↓
        ┌──────────┼──────────┐
        ↓          ↓          ↓
   Telugu (1x)  Hindi (1x)  Tamil (1x)
        ↓          ↓          ↓
   70 students 20 students 10 students
```

## Test Scenarios

| Users | Duration | Ramp-Up | Language Distribution |
|-------|----------|---------|----------------------|
| 5     | 30s      | 5s      | 60% Te, 40% Hi |
| 20    | 60s      | 10s     | 70% Te, 20% Hi, 10% Ta |
| 50    | 60s      | 15s     | 70% Te, 20% Hi, 10% Ta |
| 100   | 90s      | 20s     | 70% Te, 20% Hi, 10% Ta |
| 250   | 90s      | 30s     | 70% Te, 20% Hi, 10% Ta |
| 500   | 120s     | 60s     | 70% Te, 20% Hi, 10% Ta |

## Metrics Collected

- **Connections**: Attempts, successes, failures, success rate
- **CPU**: Average, peak (client-side)
- **Memory**: Average, peak (client-side)
- **Latency**: P50, P95, P99 (audio delivery)
- **Messages**: Sent, received
- **Errors**: Count and details

## Running Tests

### Prerequisites

1. Backend server running:
```bash
cd apps/backend
npm run dev
```

2. Session created with code `TEST123` (or set `SESSION_CODE` env var)

### Execute Tests

```bash
cd apps/backend
chmod +x test/load/run-load-test.sh
./test/load/run-load-test.sh
```

Or manually:
```bash
cd apps/backend
SERVER_URL=http://localhost:5000 SESSION_CODE=TEST123 npx ts-node test/load/load-test.ts
```

### Results

Results are saved to `test/load/results.json` with metrics for each scenario.

## Resource Limits

Current configuration (adjustable in `resource-monitor.service.ts`):

- **Max connections per session**: 500
- **Max total connections**: 1000
- **Max concurrent sessions**: 10
- **Max memory usage**: 80%
- **Max CPU usage**: 85%
- **Rate limit**: 10 joins/minute/IP

## Monitoring During Tests

Monitor server resources in real-time:
```bash
# Resource usage
curl http://localhost:5000/api/monitoring/resources

# Connection stats
curl http://localhost:5000/api/monitoring/connections

# Session-specific connections
curl http://localhost:5000/api/monitoring/session/TEST123/connections
```

## Expected Behavior

### Graceful Degradation

When resources reach limits:
- **80% memory/85% CPU**: New connections rejected with error
- **Stale connections** (>5min inactive): Auto-disconnected
- **Rate limit exceeded**: Temporary connection denial
- **Session full** (>500 users): New joins rejected

### Efficient Fan-Out

For N students across M languages:
- STT operations: **1** (not N)
- Translation operations: **M** (not N)
- TTS operations: **M** (not N)
- Audio broadcasts: **M** (not N)

This is the key scalability optimization validated by these tests.

## Interpreting Results

### Success Criteria

- **Connection success rate**: >95%
- **Message delivery**: No significant loss
- **Latency P95**: <3 seconds
- **CPU**: Stable, no runaway growth
- **Memory**: Stable, no leaks

### Warning Signs

- Connection failures >5%
- Message loss
- Latency spikes
- Memory growing continuously
- CPU >90% sustained

## Notes

- Tests use **WebSocket-only** transport (most efficient)
- Simulated clients do NOT send audio (server load only)
- Real-world testing with actual audio/translation needed for production validation
- Results depend heavily on hardware (CPU, RAM, network)

**DO NOT claim production readiness for 500 users without real-world validation**
