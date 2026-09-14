# MODULE 6: Translation Service - Architecture Diagram

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ORGANIZER SIDE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    🎤 Speaker Microphone (Wireless)
         │
         ├─→ Wireless Transmitter
         │
         ├─→ Wireless Receiver (USB)
         │
         ├─→ Organizer Laptop
         │
         └─→ Web Browser
                  │
                  │ getUserMedia({ audio: { deviceId: { exact: selectedId }}})
                  ├─→ MediaStream
                  │
                  └─→ AudioWorklet / AudioContext
                           │
                           │ PCM 16-bit @ 16kHz
                           ├─→ Socket.IO: AUDIO_STREAM
                           │
                           └─→ Backend

┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND SERVER                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    📥 Socket: AUDIO_STREAM event
         │
         ├─→ STT Service (MODULE 5)
         │        │
         │        ├─→ Mock STT Provider (or Google/Azure/AWS)
         │        │        │
         │        │        ├─→ Processes audio buffer
         │        │        │
         │        │        └─→ Returns: { text, isFinal, confidence }
         │        │
         │        └─→ Emits events:
         │                 ├─→ 'interim' - partial transcript
         │                 └─→ 'final' - complete transcript
         │
         ├─→ Socket Listeners (socket/index.ts)
         │        │
         │        ├─→ On 'interim' event:
         │        │    └─→ translateAndBroadcast(sttResult, isFinal=false)
         │        │
         │        └─→ On 'final' event:
         │             └─→ translateAndBroadcast(sttResult, isFinal=true)
         │
         └─→ translateAndBroadcast()
                  │
                  ├─→ Get session languages from translationService
                  │
                  ├─→ Translation Service (MODULE 6)
                  │        │
                  │        ├─→ Check registered languages for session
                  │        │    Example: ['te', 'hi', 'ta']
                  │        │
                  │        ├─→ For each target language:
                  │        │    │
                  │        │    ├─→ Build cache key: "en:te:Hello, how are you?"
                  │        │    │
                  │        │    ├─→ Check cache
                  │        │    │    ├─→ Cache HIT: return immediately (<5ms)
                  │        │    │    └─→ Cache MISS: continue...
                  │        │    │
                  │        │    ├─→ Check in-flight translations
                  │        │    │    ├─→ In-flight: wait for existing promise
                  │        │    │    └─→ Not in-flight: continue...
                  │        │    │
                  │        │    ├─→ Call Translation Provider
                  │        │    │    │
                  │        │    │    ├─→ Mock Provider (50-150ms)
                  │        │    │    │   └─→ Returns: { translatedText, confidence }
                  │        │    │    │
                  │        │    │    └─→ Real Provider (Future)
                  │        │    │        ├─→ Google Cloud Translation API
                  │        │    │        ├─→ Azure Translator
                  │        │    │        └─→ AWS Translate
                  │        │    │
                  │        │    ├─→ Cache result (TTL: 1 hour)
                  │        │    │
                  │        │    └─→ Return: TranslationWithMetrics
                  │        │
                  │        └─→ Returns: Map<Language, TranslationWithMetrics>
                  │
                  └─→ For each language translation:
                       │
                       ├─→ Build TranslationResultPayload:
                       │    {
                       │      sessionId, text, translatedText,
                       │      sourceLanguage, targetLanguage,
                       │      sequenceNumber, timestamp, isFinal,
                       │      confidence,
                       │      latency: {
                       │        sttTimestamp,
                       │        translationStartTimestamp,
                       │        translationResultTimestamp,
                       │        translationLatency,
                       │        totalLatency
                       │      }
                       │    }
                       │
                       └─→ Socket.IO Emit:
                            ├─→ Room: `session:{sessionId}:lang:{targetLanguage}`
                            ├─→ Event: TRANSLATION_INTERIM or TRANSLATION_FINAL
                            └─→ Payload: TranslationResultPayload

┌─────────────────────────────────────────────────────────────────────────────┐
│                              STUDENT SIDE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    📱 Student Phone (Browser)
         │
         ├─→ Join Session
         │    ├─→ Select language (e.g., Telugu)
         │    └─→ Socket: JOIN_SESSION
         │             │
         │             └─→ Backend:
         │                  ├─→ Joins room: `session:{id}:lang:te`
         │                  └─→ Updates translationService.registerSessionLanguages()
         │
         ├─→ Socket Listeners (student session page)
         │    │
         │    ├─→ TRANSLATION_INTERIM:
         │    │    └─→ setInterimSegment({ id, text, translatedText, isFinal: false })
         │    │
         │    └─→ TRANSLATION_FINAL:
         │         └─→ setTranslationSegments([...prev, { id, text, translatedText, isFinal: true }])
         │
         └─→ TranslationDisplay Component
              │
              ├─→ Render segments:
              │    ├─→ Interim (blue, opacity 80%)
              │    └─→ Final (white/green, full opacity)
              │
              ├─→ Auto-scroll to latest
              │
              ├─→ Show latency metrics
              │
              └─→ Manual scroll detection
                   └─→ "Scroll to latest" button
```

## Language-Specific Room Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Socket.IO Rooms                                 │
└────────────────────────────────────────────────────────────────────────┘

Session: ABC123 (English speaker)
├─ Source: English (en)
└─ Target Languages: Telugu (te), Hindi (hi), Tamil (ta)

Rooms Created:
├─→ `session:ABC123` (all participants - organizer + students)
├─→ `session:ABC123:lang:te` (Telugu students only)
├─→ `session:ABC123:lang:hi` (Hindi students only)
└─→ `session:ABC123:lang:ta` (Tamil students only)

Broadcasting Example:
┌─────────────────────────────────────────────────────────────┐
│ Organizer says: "Hello, how are you?"                       │
│ STT Result: "Hello, how are you?" (confidence: 0.95)        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ├─→ Translation Service
                          │    ├─→ Translate to Telugu: "మీరు ఎలా ఉన్నారు?"
                          │    ├─→ Translate to Hindi: "आप कैसे हैं?"
                          │    └─→ Translate to Tamil: "எப்படி இருக்கீங்க?"
                          │
                          └─→ Broadcast:
                               ├─→ io.to('session:ABC123:lang:te').emit('translation:final', { translatedText: 'మీరు ఎలా ఉన్నారు?' })
                               ├─→ io.to('session:ABC123:lang:hi').emit('translation:final', { translatedText: 'आप कैसे हैं?' })
                               └─→ io.to('session:ABC123:lang:ta').emit('translation:final', { translatedText: 'எப்படி இருக்கீங்க?' })

Students Receive:
├─→ 50 Telugu students → all receive Telugu translation
├─→ 30 Hindi students → all receive Hindi translation
└─→ 20 Tamil students → all receive Tamil translation

Total: 100 students, 3 translations (not 100 translations!)
```

## Caching Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Translation Cache                               │
└────────────────────────────────────────────────────────────────────────┘

Cache Structure: Map<string, CachedTranslation>

Cache Key Format: "{sourceLanguage}:{targetLanguage}:{text}"
Example: "en:te:Hello, how are you?"

Cache Entry:
{
  result: {
    translatedText: "మీరు ఎలా ఉన్నారు?",
    sourceLanguage: "en",
    targetLanguage: "te",
    confidence: 0.92
  },
  timestamp: 1726194234567
}

TTL: 1 hour (3,600,000 ms)

Timeline Example:
┌────────────────────────────────────────────────────────────────────┐
│ T=0ms:   First request "Hello" → en:te                             │
│          - Check cache: MISS                                        │
│          - Call provider: 100ms                                     │
│          - Store in cache                                           │
│          - Return result                                            │
│                                                                      │
│ T=5000ms: Second request "Hello" → en:te                           │
│          - Check cache: HIT                                         │
│          - Return cached result: <1ms                               │
│                                                                      │
│ T=10000ms: Third request "Hello" → en:hi (different target)        │
│          - Check cache: MISS (different key)                        │
│          - Call provider: 100ms                                     │
│          - Store in cache                                           │
│          - Return result                                            │
└────────────────────────────────────────────────────────────────────┘

Cache Statistics API:
translationService.getCacheStats()
→ { size: 245, activeTranslations: 3, sessions: 5 }

Cleanup:
- Periodic cleanup every 10 minutes
- Removes entries older than TTL
- Runs automatically via setInterval
```

## In-Flight De-duplication

```
┌────────────────────────────────────────────────────────────────────────┐
│                    In-Flight Translation Tracking                       │
└────────────────────────────────────────────────────────────────────────┘

activeTranslations: Map<string, Promise<TranslationResult>>

Scenario: 10 students join simultaneously, all select Telugu

Timeline:
T=0ms:     Student 1 triggers translation "Hello" → en:te
           ├─→ Check cache: MISS
           ├─→ Check in-flight: NONE
           ├─→ Start provider call
           └─→ Store promise in activeTranslations

T=10ms:    Student 2 triggers translation "Hello" → en:te
           ├─→ Check cache: MISS (not done yet)
           ├─→ Check in-flight: FOUND!
           └─→ Wait for existing promise

T=20ms:    Student 3-10 trigger translation "Hello" → en:te
           ├─→ Check cache: MISS
           ├─→ Check in-flight: FOUND!
           └─→ All wait for same promise

T=100ms:   Provider returns result
           ├─→ Cache result
           ├─→ Delete from activeTranslations
           └─→ All 10 promises resolve with same result

Result: 1 API call, 10 students served
```

## Latency Tracking

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Latency Measurement Points                      │
└────────────────────────────────────────────────────────────────────────┘

Full Pipeline:

1. AUDIO CAPTURE (MODULE 4)
   └─→ timestamp: audioCaptureTimestamp

2. AUDIO STREAMING
   └─→ Socket.IO: AUDIO_STREAM event
       └─→ latency: network + processing

3. STT PROCESSING (MODULE 5)
   ├─→ timestamp: sttReceiveTimestamp
   ├─→ timestamp: processingTimestamp
   └─→ latency: totalLatency = processingTimestamp - audioCaptureTimestamp

4. TRANSLATION START (MODULE 6)
   └─→ timestamp: translationStartTimestamp

5. TRANSLATION COMPLETE
   ├─→ timestamp: translationResultTimestamp
   └─→ latency: translationLatency = translationResultTimestamp - translationStartTimestamp

6. TOTAL LATENCY
   └─→ totalLatency = translationResultTimestamp - sttTimestamp

Latency Metrics in TranslationResultPayload:
{
  latency: {
    sttTimestamp: 1726194234000,          // When STT completed
    translationStartTimestamp: 1726194234050,  // Translation started
    translationResultTimestamp: 1726194234150, // Translation completed
    translationLatency: 100,               // Translation took 100ms
    totalLatency: 150                      // STT → translation: 150ms
  }
}

Expected Latencies:
├─→ STT (Mock): ~100ms (achieved in MODULE 5)
├─→ Translation (Mock): 50-150ms
└─→ Total: ~150-250ms end-to-end

Production Targets:
├─→ STT (Google): 500-1000ms
├─→ Translation (Google): 100-300ms
└─→ Total: <1500ms (1.5 seconds)
```

## Session Lifecycle

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Session Lifecycle                               │
└────────────────────────────────────────────────────────────────────────┘

1. SESSION CREATION
   ├─→ Organizer creates session
   ├─→ Specifies source language (e.g., English)
   ├─→ Specifies target languages (e.g., Telugu, Hindi, Tamil)
   └─→ Status: CREATED

2. STUDENTS JOIN
   ├─→ Student A joins, selects Telugu
   │    ├─→ Joins room: `session:{id}:lang:te`
   │    └─→ translationService.registerSessionLanguages(sessionId, ['te'])
   │
   ├─→ Student B joins, selects Hindi
   │    ├─→ Joins room: `session:{id}:lang:hi`
   │    └─→ translationService.registerSessionLanguages(sessionId, ['te', 'hi'])
   │
   └─→ Student C joins, selects Telugu
        ├─→ Joins room: `session:{id}:lang:te`
        └─→ translationService.registerSessionLanguages(sessionId, ['te', 'hi'])
        (Telugu already registered, no duplicate)

3. SESSION START
   ├─→ Organizer starts session
   ├─→ Status: ACTIVE
   ├─→ Organizer starts STT
   └─→ Translations begin flowing

4. ACTIVE SESSION
   ├─→ Organizer speaks
   ├─→ STT processes audio
   ├─→ Translation service translates
   ├─→ Students receive translations
   └─→ Loop continues...

5. STUDENT DISCONNECT
   ├─→ Student B disconnects
   ├─→ Query remaining students' languages
   ├─→ translationService.registerSessionLanguages(sessionId, ['te'])
   └─→ Only Telugu translations sent (Hindi no longer needed)

6. SESSION STOP
   ├─→ Organizer stops session
   ├─→ Status: STOPPED
   ├─→ STT stops
   └─→ Translations stop

7. SESSION CLEANUP
   ├─→ All students disconnect
   ├─→ translationService.unregisterSession(sessionId)
   └─→ Session languages cleared from memory
```

## Error Handling

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Error Isolation                                 │
└────────────────────────────────────────────────────────────────────────┘

Translation Provider Error:
├─→ Provider throws error (network, API limit, etc.)
├─→ Caught by translation service
├─→ Logged: logger.error('Translation failed')
├─→ Emitted to affected students: TRANSLATION_ERROR
└─→ STT continues working (error isolated)

Student receives:
{
  event: 'translation:error',
  payload: {
    sessionId: 'ABC123',
    targetLanguage: 'te',
    error: 'Translation service temporarily unavailable'
  }
}

Future Enhancement:
├─→ Show original text as fallback
├─→ Retry with exponential backoff
├─→ Switch to backup provider
└─→ Queue for retry when service recovers
```

## Summary

**MODULE 6 provides:**
- ✅ Real-time incremental translation
- ✅ Efficient caching (no duplicate work)
- ✅ Language-specific broadcasting
- ✅ Comprehensive latency tracking
- ✅ Error isolation and handling
- ✅ Scalable architecture (100+ students per session)
- ✅ Provider abstraction (easy to swap APIs)

**Ready for production with:**
- Real translation API (Google/Azure/AWS)
- Redis caching for multi-server deployment
- Database storage for translation history
- Advanced retry and fallback logic
