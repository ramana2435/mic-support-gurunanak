# Module 10: End-to-End Integration Testing Guide

## Complete Pipeline Integration Test

This document outlines the complete testing procedure for the integrated real-time translation pipeline.

## Pipeline Flow

```
Speaker
  ↓
Wireless Microphone
  ↓
Receiver
  ↓
Organizer Laptop
  ↓
Streaming Audio Capture (Browser)
  ↓
STT Service (Backend)
  ↓
Translation Service (Backend)
  ↓
  ┌──────────────────────────┐
  │                          │
  ↓                          ↓
Text Channel Service    TTS Service
  ↓                          ↓
Student Phone           Audio Transport
(WebSocket)             (WebSocket)
  ↓                          ↓
Text Display            Audio Player
                            ↓
                    Bluetooth Earbuds
```

## Test Scenarios

### 1. Basic Session Lifecycle

#### 1.1 Create Session
```bash
# Organizer creates session
POST /api/sessions
{
  "title": "Test Session",
  "organizerName": "Test Organizer",
  "sourceLanguage": "en",
  "targetLanguages": ["es", "fr", "de"],
  "maxStudents": 50
}

Expected:
- Session created with unique code
- QR code generated
- Status: CREATED
- Pipeline state: IDLE
```

#### 1.2 Students Join
```bash
# Student joins session
Socket Event: JOIN_SESSION
{
  "sessionCode": "ABC123",
  "name": "Student 1",
  "selectedLanguage": "es"
}

Expected:
- Student added to session
- Joined language-specific room
- Translation service registers language
- Student count updated
```

#### 1.3 Start Session
```bash
# Organizer starts session
Socket Event: START_SESSION
sessionId: "uuid"

Expected:
- Session status → ACTIVE
- Pipeline state → STARTING → RUNNING
- STT service started
- Translation service ready
- TTS service ready
- Text channel initialized
- All students notified
```

### 2. Audio Flow Test

#### 2.1 Audio Capture to STT
```bash
# Organizer streams audio
Socket Event: AUDIO_STREAM
{
  "sessionId": "uuid",
  "audio": ArrayBuffer,
  "timestamp": 1234567890
}

Expected:
- Audio received by STT service
- STT processing started
- Interim results emitted
- Final results emitted with sequence number
```

#### 2.2 STT to Translation
```bash
# STT emits result
Event: stt:final
{
  "sessionId": "uuid",
  "text": "Hello everyone",
  "sequenceNumber": 1,
  "confidence": 0.95
}

Expected:
- Pipeline orchestrator receives result
- Translation service called for all target languages
- Translations cached
- Sequence number incremented
```

#### 2.3 Translation to Students
```bash
# Translation completed
Event: translation:final (per language)
{
  "sessionId": "uuid",
  "text": "Hello everyone",
  "translatedText": "Hola a todos",
  "targetLanguage": "es",
  "sequenceNumber": 1,
  "isFinal": true
}

Expected:
- Emitted to language-specific room
- Stored in text channel buffer
- Students receive translation
- TTS processing triggered
```

#### 2.4 TTS to Audio Delivery
```bash
# TTS generates audio chunks
Event: tts:chunk
{
  "sessionId": "uuid",
  "targetLanguage": "es",
  "sequenceNumber": 1,
  "chunkIndex": 0,
  "audioData": "base64...",
  "isLast": false
}

Expected:
- Audio chunk broadcasted to students
- Students receive and buffer audio
- Audio played through Web Audio API
- Sent to Bluetooth earbuds
```

### 3. Error Handling Tests

#### 3.1 STT Failure
```bash
# Simulate STT error
Expected:
- Error logged with ErrorCategory.STT
- Recovery strategy: CONTINUE_WITHOUT_STT
- Translation pipeline continues
- Text channel unaffected
- Organizer notified
```

#### 3.2 Translation Failure
```bash
# Simulate translation API error
Expected:
- Error logged with ErrorCategory.TRANSLATION
- Recovery strategy: USE_CACHED_TRANSLATION or RETRY
- Retry attempted (max 3 times)
- If all fail, specific language isolated
- Other languages continue
```

#### 3.3 TTS Failure
```bash
# Simulate TTS error
Expected:
- Error logged with ErrorCategory.TTS
- Recovery strategy: CONTINUE_TEXT_ONLY
- Text channel continues normally
- Audio stops for affected language
- Students see "Audio Interrupted" status
- Text translation still works
```

#### 3.4 Network Interruption
```bash
# Simulate student disconnect
Expected:
- Student socket disconnected
- Reconnection attempted automatically
- Text recovery request sent
- Missed messages retrieved
- Audio resynchronized
- No duplicate messages
```

### 4. Multiple Students Test

#### 4.1 Same Language
```bash
# 5 students join with "es"
Expected:
- All in same language room
- Single translation performed
- Broadcast to all 5 students
- Single TTS stream shared
- Efficient resource usage
```

#### 4.2 Different Languages
```bash
# Students join with "es", "fr", "de"
Expected:
- Separate rooms per language
- 3 translations performed
- 3 TTS streams generated
- Independent audio delivery
- Text channel isolated per language
```

### 5. Session Stop Test

```bash
# Organizer stops session
Socket Event: STOP_SESSION
sessionId: "uuid"

Expected:
- Pipeline state → STOPPING → STOPPED
- STT service stopped
- Translation service unregistered
- TTS service stopped (all languages)
- Text channel preserved (5 min grace)
- Active streams closed
- No orphaned resources
- Students notified
- Session status → STOPPED
```

### 6. Reconnection and Recovery Test

#### 6.1 Student Reconnection
```bash
# Student reconnects after 30 seconds
Expected:
- Rejoin session
- Request missed messages (lastReceivedSequence)
- Text channel recovery
- Receive missed translations
- No duplicates
- Audio resumes
```

#### 6.2 STT Reconnection
```bash
# STT provider disconnects
Expected:
- STT service detects disconnect
- Auto-reconnection attempted (max 5 times)
- Backoff delay: 2 seconds
- Pipeline continues during reconnection
- Success logged
```

### 7. Performance Test

#### 7.1 Latency Measurement
```bash
Expected Latencies:
- STT: < 500ms
- Translation: < 200ms
- TTS first chunk: < 300ms
- Total (speech → audio): < 1000ms
- Text delivery: < 100ms
```

#### 7.2 Load Test
```bash
# 50 concurrent students
# 3 target languages
Expected:
- All students receive text
- All students receive audio
- No message loss
- Acceptable latency maintained
- No memory leaks
- CPU usage reasonable
```

### 8. Cleanup Test

#### 8.1 Graceful Shutdown
```bash
# Send SIGTERM to server
Expected:
- All pipelines stopped
- All services cleaned up
- STT sessions closed
- TTS queues cleared
- Translation cache cleared
- Text channel preserved
- Database connections closed
- Server exits cleanly (10s timeout)
```

#### 8.2 Resource Leak Detection
```bash
Expected:
- No orphaned timers
- No orphaned event listeners
- Memory released
- Database connections closed
- Socket connections cleaned
```

## Monitoring Endpoints

### Health Check
```bash
GET /api/monitoring/health
Response: { status: "ok", uptime: 12345, memory: {...} }
```

### Pipeline Stats
```bash
GET /api/monitoring/stats
Response: {
  pipeline: { running: 2, stopped: 0, error: 0 },
  tts: { activeSessions: 6, totalQueued: 3 },
  translation: { size: 45, activeTranslations: 2 },
  textChannel: { totalBuffers: 3, totalMessages: 120 },
  errors: { total: 5, bySeverity: {...}, byCategory: {...} }
}
```

### Session Health
```bash
GET /api/monitoring/session/:sessionId/health
Response: {
  sessionId: "uuid",
  state: "RUNNING",
  uptime: 123456,
  metrics: {
    sttActive: true,
    translationsProcessed: 45,
    ttsActive: true,
    textMessagesBuffered: 120,
    connectedStudents: 15
  },
  errors: []
}
```

### Error History
```bash
GET /api/monitoring/session/:sessionId/errors
Response: {
  sessionId: "uuid",
  count: 3,
  errors: [
    {
      category: "TTS",
      severity: "MEDIUM",
      message: "TTS synthesis timeout",
      timestamp: "2024-01-01T12:00:00Z"
    }
  ]
}
```

## Success Criteria

### ✅ All modules integrated
- STT → Translation → TTS → Text Channel flow complete
- Pipeline orchestrator coordinates all services
- Proper lifecycle management implemented

### ✅ Error handling comprehensive
- TTS failure does NOT stop text delivery
- Translation failure isolated per language
- STT failure allows manual text input fallback
- Recovery strategies implemented

### ✅ Resource management
- Graceful shutdown works
- No memory leaks
- No orphaned streams
- Proper cleanup on session stop

### ✅ Performance acceptable
- End-to-end latency < 1 second
- Text delivery < 100ms
- Supports 50+ concurrent students
- Multiple languages efficient

### ✅ Reliability
- Reconnection works
- Message recovery functional
- No duplicate translations
- No lost messages

## Running Tests

```bash
# Start backend
cd apps/backend
npm run dev

# Start frontend
cd apps/frontend
npm run dev

# Run integration tests
# (Manual testing following this guide)
# Automated tests: npm test

# Check monitoring
curl http://localhost:5000/api/monitoring/stats

# Check specific session
curl http://localhost:5000/api/monitoring/session/{sessionId}/health
```

## Debugging

```bash
# Check logs
tail -f apps/backend/logs/app.log

# Check pipeline state
GET /api/monitoring/pipelines/active

# Check error history
GET /api/monitoring/session/:sessionId/errors

# Check service stats
GET /api/monitoring/stats
```

## Common Issues

1. **Audio not playing**: Check TTS service logs, ensure Web Audio API initialized
2. **Text not appearing**: Check translation service, text channel buffer
3. **High latency**: Check network quality, service performance metrics
4. **Memory leak**: Check cleanup handlers, event listener removal
5. **Duplicate messages**: Check sequence number tracking, deduplication logic

## Module 10 Completion Checklist

- [x] Pipeline orchestrator created
- [x] Lifecycle management (START/RUNNING/STOPPING/STOPPED/ERROR)
- [x] Error recovery service implemented
- [x] Graceful shutdown with cleanup
- [x] Monitoring endpoints added
- [x] Health checks implemented
- [x] STT → Translation → TTS → Text flow integrated
- [x] Independent text channel (continues when audio fails)
- [x] Session state tracking
- [x] Resource cleanup (no leaks)
- [ ] End-to-end manual testing performed
- [ ] Load testing completed
- [ ] All success criteria verified
