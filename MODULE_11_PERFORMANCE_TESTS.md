# MODULE 11: Performance Testing and Latency Measurements

## Overview

This document provides real performance test procedures and actual measurement guidelines for the optimized real-time translation pipeline.

## Latency Target

**Target: ~1 second end-to-end under good conditions**

⚠️ **Important**: The exact 1-second latency cannot be guaranteed in all scenarios. Actual latency depends on:
- Network quality and bandwidth
- Hardware capabilities (client and server)
- STT/Translation/TTS provider performance
- System load and concurrent users
- Geographic distance between components

## Latency Measurement Points

### Complete Pipeline Timestamps

```
T0 = Speaker audio captured (client timestamp)
T1 = STT partial/final result (server timestamp)
T2 = Translation result (server timestamp)
T3 = TTS first audio chunk generated (server timestamp)
T4 = Audio delivered to student device (client timestamp)
T5 = Student playback begins (client timestamp)
```

### Calculated Latencies

```
STT Latency          = T1 - T0  (Target: <300ms)
Translation Latency  = T2 - T1  (Target: <100ms)
TTS Latency          = T3 - T2  (Target: <200ms)
Audio Delivery       = T4 - T3  (Target: <100ms)
Playback Delay       = T5 - T4  (Target: <50ms)
---
Total Latency        = T5 - T0  (Target: ~1000ms)

TEXT Delivery        = T2 - T0  (Critical: <500ms)
```

## Optimization Summary

### Audio Optimizations
- Sample rate: 24kHz (reduced from 48kHz)
- Chunk size: 100ms
- TTS queue size: 5 (reduced from 10)
- Backlog age: 2 seconds (reduced from 5s)
- Removed 100ms artificial delay between TTS requests
- Buffer size: 3 sequences (reduced from 5)

### Processing Optimizations
- **Parallel processing**: Text sent immediately, TTS runs asynchronously
- **In-memory hot path**: No DB operations during real-time translation
- **Translation caching**: 30-minute TTL, optimized key generation
- **Text channel**: In-memory only, 30-minute retention
- **TTS backlog management**: Aggressive skipping of old requests

### Network Optimizations
- WebSocket for real-time communication
- Base64 encoding for audio (acceptable overhead)
- Minimal payload sizes
- Connection reuse

## Performance Test Procedures

### Test 1: Single Student, Single Language

**Setup**:
- 1 organizer with microphone
- 1 student
- 1 target language (e.g., Spanish)
- Good network (WiFi/Ethernet, <50ms ping)

**Procedure**:
1. Start session
2. Begin speaking continuously for 2 minutes
3. Monitor latency dashboard
4. Record measurements

**Expected Results** (Good Conditions):
- Text delivery: 200-400ms
- Total E2E: 800-1200ms
- P95 text: <500ms
- P95 total: <1500ms

**How to Measure**:
```bash
# Access latency dashboard
GET http://localhost:5000/api/monitoring/session/{sessionId}/latency

# Check real-time stats
{
  "textDelivery": {
    "average": 350,
    "p50": 320,
    "p95": 450,
    "max": 580
  },
  "totalEndToEnd": {
    "average": 950,
    "p50": 900,
    "p95": 1200,
    "max": 1450
  }
}
```

### Test 2: Multiple Students, Same Language

**Setup**:
- 1 organizer
- 10 students (same language)
- Good network

**Procedure**:
1. Start session with 10 students
2. Speak continuously for 3 minutes
3. Monitor all student latencies
4. Check for consistency

**Expected Results**:
- All students receive same translation (efficient)
- Single translation performed
- Single TTS stream shared
- Latency similar to single student
- Text delivery: <500ms for all
- Total E2E: <1500ms for all

### Test 3: Multiple Students, Multiple Languages

**Setup**:
- 1 organizer
- 15 students: 5 Spanish, 5 French, 5 German
- Good network

**Procedure**:
1. Start session with 3 target languages
2. Speak continuously for 3 minutes
3. Monitor per-language latencies
4. Check resource usage

**Expected Results**:
- 3 parallel translations performed
- 3 parallel TTS streams
- Text delivery: <600ms for all languages
- Total E2E: <1800ms for all languages
- CPU usage: moderate increase

### Test 4: Network Degradation

**Setup**:
- 1 organizer, 3 students
- Simulate network conditions:
  - Good: <50ms ping, no loss
  - Medium: 100-150ms ping, 1% loss
  - Poor: 200-300ms ping, 3-5% loss

**Procedure**:
1. Test under good conditions (baseline)
2. Add 100ms latency using network throttling
3. Add 200ms latency + 2% packet loss
4. Measure impact on E2E latency

**Expected Results**:
- Good: ~1000ms E2E
- Medium: ~1200-1500ms E2E (degraded but acceptable)
- Poor: ~1800-2500ms E2E (degraded)
- **Critical**: Text should ALWAYS work regardless of audio

### Test 5: TTS Failure Independence

**Setup**:
- 1 organizer, 3 students
- Simulate TTS failure (stop TTS service)

**Procedure**:
1. Start session normally
2. Stop TTS service mid-session
3. Continue speaking
4. Verify text translation continues

**Expected Results**:
- Text delivery continues normally (<500ms)
- Audio stops for all students
- No errors in text channel
- Students see "Audio Interrupted" status
- Text latency unaffected

### Test 6: High Load (50 Students)

**Setup**:
- 1 organizer
- 50 concurrent students
- Mix of 5 target languages (10 per language)
- Good network

**Procedure**:
1. All 50 students join session
2. Speak continuously for 5 minutes
3. Monitor server CPU, memory, network
4. Check latency distribution

**Expected Results**:
- Text delivery P95: <800ms (acceptable degradation)
- Total E2E P95: <2000ms
- No message loss
- All students receive translations
- Server CPU: <80%
- Memory: stable (no leaks)

**Warning Signs**:
- Text delivery >1000ms consistently
- Total E2E >3000ms consistently
- Message loss or duplicates
- Memory continuously growing
- CPU at 100%

## Measuring Latency in Practice

### From Frontend (Organizer Dashboard)

```typescript
// Add LatencyDashboard component
import { LatencyDashboard } from '@/components/LatencyDashboard'

<LatencyDashboard sessionId={sessionId} refreshInterval={5000} />
```

### From API

```bash
# Get session latency report
curl http://localhost:5000/api/monitoring/session/{sessionId}/latency

# Get global latency stats
curl http://localhost:5000/api/monitoring/latency/global

# Get full pipeline stats
curl http://localhost:5000/api/monitoring/stats
```

### From Browser Console

```javascript
// Student client - check received latency
socket.on('translation:final', (payload) => {
  console.log('Latency:', payload.latency);
  // {
  //   translationLatency: 85,
  //   totalLatency: 420
  // }
});

// Check audio chunk latency
socket.on('tts:audio:chunk', (chunk) => {
  if (chunk.chunkIndex === 0) {
    console.log('TTS Latency:', chunk.latency);
    // {
    //   ttsLatency: 180,
    //   totalLatency: 850
    // }
  }
});
```

## Real-World Performance Factors

### Network Conditions
| Condition | Ping | Loss | Expected E2E | Text Delivery |
|-----------|------|------|--------------|---------------|
| Excellent | <30ms | 0% | 800-1000ms | 200-300ms |
| Good | 30-80ms | <1% | 1000-1500ms | 300-500ms |
| Fair | 80-150ms | 1-2% | 1500-2000ms | 500-800ms |
| Poor | >150ms | >2% | >2000ms | >800ms |

### Hardware Impact
- **Client (Student)**:
  - Modern phone (2020+): Minimal impact
  - Older devices: +50-100ms for audio decode
  - Low RAM (<2GB): Possible audio stuttering
  
- **Server**:
  - CPU: Each concurrent session uses ~5-10% CPU
  - Memory: ~50MB per active session
  - Network: ~100-200 Kbps per student (audio + text)

### Provider Latency
- **STT Provider**: Typically 200-500ms
- **Translation API**: Typically 50-150ms
- **TTS Provider**: Typically 150-300ms for first chunk

**Note**: These are estimates. Actual provider performance varies.

## Debugging High Latency

### Check Component Breakdown
```bash
# If total latency is high, check which component is slow
curl http://localhost:5000/api/monitoring/session/{sessionId}/latency | jq

{
  "stt": { "average": 350, "p95": 450 },          # High? Check STT provider
  "translation": { "average": 120, "p95": 180 },  # High? Check translation API
  "tts": { "average": 280, "p95": 380 },          # High? Check TTS provider
  "audioDelivery": { "average": 150, "p95": 220 } # High? Check network
}
```

### Common Issues

1. **Text Delivery >500ms**
   - Check: STT latency + Translation latency
   - Fix: Verify provider APIs responding quickly
   - Fix: Check server CPU load

2. **Total E2E >2000ms**
   - Check: Audio delivery latency
   - Fix: Student network quality
   - Fix: Reduce concurrent students per session

3. **Inconsistent Latency (high variance)**
   - Check: P95 vs average difference
   - Fix: Network quality issues
   - Fix: Server resource contention

4. **Audio Stuttering**
   - Check: Buffer underrun count
   - Fix: Increase buffer size (trade latency for smoothness)
   - Fix: Check student device performance

## Acceptance Criteria

✅ **Must Have**:
- Text delivery P95 < 600ms
- Text channel works even when audio fails
- No message loss under normal load
- No memory leaks (stable over 1+ hour)

✅ **Should Have**:
- Total E2E P50 < 1200ms (good conditions)
- Total E2E P95 < 1800ms (good conditions)
- Support 50+ concurrent students
- Graceful degradation under poor network

✅ **Nice to Have**:
- Total E2E P50 < 1000ms (excellent conditions)
- Total E2E P95 < 1500ms (excellent conditions)
- Support 100+ concurrent students

## Running Tests

### Automated Performance Test (To Be Implemented)
```bash
# Install dependencies
npm install --save-dev autocannon artillery

# Run load test
npm run test:performance

# Generate report
npm run test:performance:report
```

### Manual Testing Checklist

- [ ] Single student test: Record average E2E latency
- [ ] 10 students same language: Verify efficiency
- [ ] 15 students 3 languages: Check parallel processing
- [ ] Network degradation: Test with throttling
- [ ] TTS failure: Verify text independence
- [ ] 50 students load test: Monitor resource usage
- [ ] Reconnection test: Verify message recovery
- [ ] Long-running test: Check for memory leaks (2+ hours)

## Reporting Results

When reporting performance measurements, always include:
1. **Test conditions**: Network, hardware, concurrent users
2. **Actual measurements**: Average, P50, P95, max
3. **Sample size**: Number of messages measured
4. **Duration**: How long the test ran
5. **Issues encountered**: Any problems or warnings

**Example Report**:
```
Test: 10 students, 2 languages, 5 minutes
Conditions: WiFi, <50ms ping, modern devices
Results:
- Text delivery: avg 380ms, P95 485ms (✅ <500ms target)
- Total E2E: avg 1050ms, P95 1280ms (✅ <1500ms target)
- Samples: 247 translations
- Issues: None
Status: ✅ PASS
```

## Disclaimer

Performance results will vary based on real-world conditions. The ~1 second target is achievable under:
- Good network (<100ms ping, <1% loss)
- Modern hardware (client and server)
- Responsive API providers (STT, Translation, TTS)
- Moderate load (<30 concurrent students per session)

Results may be slower under:
- Poor network conditions
- Older/lower-end devices
- Slow provider APIs
- High server load
- Many concurrent sessions

**The system is designed to degrade gracefully while keeping text translation functional.**
