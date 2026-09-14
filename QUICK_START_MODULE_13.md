# Module 13: Quick Start Guide

## Overview

Module 13 makes the system robust for real seminars by handling 13 critical failure scenarios gracefully.

---

## Quick Integration

### 1. Wrap Provider Calls

```typescript
// Import
import { providerResilience } from './services/resilience/provider-resilience.service';

// STT call
const result = await providerResilience.executeWithResilience(
  { name: 'stt', timeout: 5000, maxRetries: 3 },
  async () => await sttProvider.transcribe(audio)
);

if (result.success) {
  // Use result.data
} else {
  // Handle gracefully, don't block pipeline
  logger.warn('STT failed', { attempts: result.attempts, timedOut: result.timedOut });
}
```

### 2. Add Session Recovery

```typescript
// Import
import { sessionRecovery } from './services/resilience/session-recovery.service';

// On join
const recoveryInfo = await sessionRecovery.canRecover(sessionId, studentId);
if (recoveryInfo.canRecover) {
  const state = await sessionRecovery.recoverSession(sessionId, studentId, socket.id);
  // Restore language, name, etc.
}

// Save state
await sessionRecovery.saveState({
  socketId: socket.id,
  sessionId,
  studentId,
  language,
  name,
  joinedAt: new Date(),
  lastSeen: new Date(),
});
```

### 3. Track Connection Health

```typescript
// Import
import { connectionManager } from './services/scalability/connection-manager.service';

// On error
try {
  await processMessage(socket, data);
} catch (error) {
  connectionManager.recordConnectionError(socket.id, error);
}

// On heartbeat
socket.on('heartbeat:pong', () => {
  connectionManager.updateHeartbeat(socket.id);
});
```

### 4. Frontend: Microphone Handling

```typescript
import { useMicrophoneWithErrorHandling } from '@/hooks/useMicrophoneWithErrorHandling';

function OrganizerView() {
  const { stream, status, error, startMicrophone, retryMicrophone } = 
    useMicrophoneWithErrorHandling();

  return (
    <>
      {status === 'PERMISSION_DENIED' && (
        <div className="error-banner">
          {error.message}
          <button onClick={retryMicrophone}>Retry</button>
        </div>
      )}
      {/* Rest of component */}
    </>
  );
}
```

### 5. Frontend: Reconnection

```typescript
import { useReconnection } from '@/hooks/useReconnection';

function StudentView() {
  const { status, attempts, nextRetryIn, manualReconnect } = 
    useReconnection(socket, sessionInfo, onReconnected);

  return (
    <>
      {status === 'RECONNECTING' && (
        <div className="reconnecting-banner">
          Reconnecting... Attempt {attempts}/10
          {nextRetryIn > 0 && ` (${nextRetryIn}s)`}
          <button onClick={manualReconnect}>Retry Now</button>
        </div>
      )}
    </>
  );
}
```

### 6. Frontend: Text-Only Mode

```typescript
import { TextOnlyMode, useTextOnlyMode } from '@/components/TextOnlyMode';

function StudentView() {
  const { isTextOnly, reason, enableTextOnlyMode } = useTextOnlyMode();

  // Enable when audio fails
  useEffect(() => {
    socket.on('TEXT_ONLY_MODE', ({ reason }) => {
      enableTextOnlyMode(reason);
    });
  }, [socket]);

  return (
    <>
      {isTextOnly && (
        <TextOnlyMode 
          reason={reason}
          canRetryAudio={true}
          onRetryAudio={() => { /* retry */ }}
        />
      )}
      {/* Translation text continues showing */}
    </>
  );
}
```

---

## Testing Commands

### Run All Error Scenarios

```bash
# See MODULE_13_ERROR_SCENARIOS_TESTING.md for details

# Quick tests:

# 1. Test reconnection
# - Disconnect network
# - Observe: 1s, 2s, 4s, 8s, 16s, 30s retry delays
# - Reconnect network
# - Verify: automatic reconnection

# 2. Test text-only mode (CRITICAL)
# - Simulate TTS provider failure
# - Speak as organizer
# - VERIFY: Text appears immediately (<2s)
# - VERIFY: No audio plays
# - VERIFY: Text-only banner shown

# 3. Test isolation
# - Have 3 students join
# - Disconnect 1 student
# - VERIFY: Other 2 students unaffected
```

### Monitor Resilience

```bash
# Backend logs
tail -f apps/backend/logs/app.log | grep -E "(Circuit|Reconnection|degradation)"

# Watch circuit breaker status
curl http://localhost:5000/api/monitoring/circuit-breakers | jq

# Watch connection health
curl http://localhost:5000/api/monitoring/connections | jq '.unhealthy'
```

---

## Configuration

### Timeouts

```typescript
// apps/backend/src/services/resilience/provider-resilience.service.ts

const defaultConfig = {
  timeout: 5000,      // 5s (STT)
  maxRetries: 3,
  retryDelay: 1000,
  retryMultiplier: 2,
};

// Override per provider:
executeWithResilience(
  { name: 'translation', timeout: 10000 }, // 10s for translation
  async () => await translate(...)
);
```

### Reconnection

```typescript
// apps/backend/src/services/resilience/reconnection-manager.service.ts

const defaultConfig = {
  initialDelayMs: 1000,  // Start at 1s
  maxDelayMs: 30000,     // Cap at 30s
  maxRetries: 10,        // Max 10 attempts
  backoffMultiplier: 2,  // Double each time
  jitterMs: 500,         // Random 0-500ms
};
```

### Circuit Breaker

```typescript
// apps/backend/src/services/resilience/circuit-breaker.service.ts

const defaultConfig = {
  failureThreshold: 5,     // 5 failures → OPEN
  successThreshold: 2,     // 2 successes → CLOSED
  timeout: 60000,          // 60s before retry
  monitoringPeriod: 60000, // 60s window
};
```

### Session Recovery

```typescript
// apps/backend/src/services/resilience/session-recovery.service.ts

const RECOVERY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
```

---

## Common Issues

### Issue: Infinite Reconnection Loop

**Cause**: Not checking max retries  
**Fix**: Reconnection manager automatically stops at 10 attempts

```typescript
// Verify in logs:
// [Reconnection] Giving up (max retries: 10)
```

### Issue: Text Blocked by Audio Failure

**Cause**: Waiting for TTS before emitting text  
**Fix**: Always emit text immediately, TTS in parallel

```typescript
// ❌ WRONG
const audio = await ttsService.synthesize(text);
io.emit('TRANSLATED_TEXT', { text, audio });

// ✅ RIGHT
io.emit('TRANSLATED_TEXT', { text });
setImmediate(async () => {
  try {
    const audio = await ttsService.synthesize(text);
    io.emit('TRANSLATED_AUDIO', { audio });
  } catch (error) {
    // Text already sent ✅
    io.emit('TEXT_ONLY_MODE', { reason: 'Audio unavailable' });
  }
});
```

### Issue: One Student Error Affects All

**Cause**: Global error handling  
**Fix**: Per-connection error tracking

```typescript
// ❌ WRONG
try {
  broadcastToAll();
} catch (error) {
  // Blocks all students
}

// ✅ RIGHT
io.to(`session:${sessionId}:lang:${lang}`).emit('data', data);
// Socket.IO handles per-connection errors internally
// Use connectionManager.recordConnectionError(socketId, error) for tracking
```

### Issue: Circuit Breaker Stuck Open

**Cause**: Not recovering after provider restored  
**Fix**: Circuit breaker auto-transitions to HALF_OPEN after timeout

```typescript
// Manually reset if needed:
circuitBreaker.reset('provider-name');

// Or wait 60 seconds for automatic HALF_OPEN → CLOSED
```

---

## Monitoring Endpoints

Add these to backend:

```typescript
// apps/backend/src/routes/monitoring.routes.ts

/**
 * Get circuit breaker stats
 */
router.get('/circuit-breakers', (req, res) => {
  const stats = circuitBreaker.getAllStats();
  res.json(stats);
});

/**
 * Get reconnection states
 */
router.get('/reconnections', (req, res) => {
  const states = reconnectionManager.getAllStates();
  res.json(states);
});

/**
 * Get unhealthy connections
 */
router.get('/connections/unhealthy', (req, res) => {
  const unhealthy = connectionManager.getUnhealthyConnections();
  res.json(unhealthy);
});

/**
 * Get session recovery stats
 */
router.get('/session-recovery/stats', (req, res) => {
  const stats = sessionRecovery.getStats();
  res.json(stats);
});
```

---

## Critical Checklist

Before going live:

- [ ] All provider calls wrapped with resilience service
- [ ] Text emitted immediately (not waiting for TTS)
- [ ] Session recovery integrated on join
- [ ] Connection health tracking active
- [ ] Frontend reconnection hook integrated
- [ ] Microphone error handling in organizer UI
- [ ] Text-only mode component added
- [ ] All 13 failure scenarios tested
- [ ] No infinite retry loops confirmed
- [ ] Isolation verified (1 student failure doesn't affect others)

---

## Performance Targets

✅ **Must Meet**:
- Text delivery: < 2 seconds (even with audio failure)
- Reconnection max attempts: 10
- Circuit breaker recovery: < 60 seconds
- Session recovery window: 5 minutes
- No memory leaks from retries

---

## Key Files Reference

### Backend Services
- `services/resilience/reconnection-manager.service.ts` - Reconnection with backoff
- `services/resilience/circuit-breaker.service.ts` - Circuit breaker
- `services/resilience/provider-resilience.service.ts` - Provider wrapper
- `services/resilience/session-recovery.service.ts` - Session state recovery
- `services/scalability/connection-manager.service.ts` - Health monitoring

### Frontend Hooks
- `hooks/useMicrophoneWithErrorHandling.ts` - Microphone errors
- `hooks/useReconnection.ts` - Reconnection logic
- `components/TextOnlyMode.tsx` - Text-only fallback

### Documentation
- `MODULE_13_ERROR_SCENARIOS_TESTING.md` - Testing guide
- `MODULE_13_IMPLEMENTATION_SUMMARY.md` - Complete summary
- `QUICK_START_MODULE_13.md` - This file

---

**Module 13 Status**: ✅ Complete and ready for integration
