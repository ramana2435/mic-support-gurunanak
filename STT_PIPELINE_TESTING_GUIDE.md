# STT Pipeline Testing Guide

## Overview

This guide explains how to test the complete live translation pipeline with the mock providers (STT, Translation, TTS).

## Important Notes

⚠️ **MOCK PROVIDERS**: The system is currently using mock providers for STT, Translation, and TTS. These generate fake data for demonstration purposes.

- **Mock STT**: Generates random English phrases when audio is received
- **Mock Translation**: Generates fake translations to target languages
- **Mock TTS**: Generates simulated audio chunks

🎯 **Expected Behavior**: Even though providers are mocked, the complete pipeline flow should work:
- Audio capture → STT processing → Translation → Text delivery → TTS → Student audio

## Prerequisites

1. **Backend running** on `http://localhost:3001` (or Railway production)
2. **Frontend running** on `http://localhost:3000` (or Vercel production)
3. **PostgreSQL database** running and accessible
4. **Microphone access** granted in browser

## Test Flow

### Step 1: Create Session (Organizer)

1. Navigate to organizer login
2. Create/login to organizer account
3. Click "Create New Session"
4. Fill in session details:
   - Title: "Test Live Translation"
   - Description: "Testing STT pipeline"
   - Speaker Language: **English**
   - Target Languages: **Telugu, Hindi, Tamil** (select multiple)
   - Max Students: 100
5. Click "Create Session"
6. **Save the session code** (e.g., "2H2KI3")

### Step 2: Join Session (Student)

1. Open a **new browser tab/window** (or use phone)
2. Navigate to join page: `/join`
3. Enter the session code
4. Enter student name (e.g., "Test Student")
5. Select preferred language: **Telugu**
6. Click "Join Session"
7. You should see: "Connected", "LIVE" badge, "Listening for translations..."

### Step 3: Start Microphone (Organizer)

1. Go back to organizer tab
2. In the session page, find "Microphone Setup" section
3. Click "Start Microphone"
4. **Grant microphone permission** when browser asks
5. Select your **laptop built-in microphone** from dropdown
6. Click "Use This Device"
7. Verify: "Microphone: Capturing" shows in System Health

**Console Check**: Open browser console (F12) and look for:
```
[Organizer] Microphone stream ready: <stream-id>
```

### Step 4: Start Session (Organizer)

1. Click **"Start Session"** button
2. Watch for status changes:
   - Session status → ACTIVE
   - Speech-to-Text → should change from "Idle" to "Active"
   - Connection → should show "Connected"

**Console Check**: Look for:
```
[Organizer] Auto-starting STT (session became ACTIVE)
[Organizer] Starting STT: {sessionId, language: 'en', sessionStatus: 'ACTIVE'}
```

### Step 5: Verify Audio Streaming (Organizer)

**Console Check**: Within 1-2 seconds you should see:
```
[AudioStreaming] Starting audio streaming {sessionId}
[AudioStreaming] Audio streaming started successfully {sampleRate: 16000, bufferSize: 4096}
[AudioStreaming] Sending audio chunk {chunkNumber: 1, size: 8192}
[AudioStreaming] Sending audio chunk {chunkNumber: 2, size: 8192}
[AudioStreaming] Sending audio chunk {chunkNumber: 3, size: 8192}
```

**Expected**: Audio chunks sent every ~260ms (4096 samples ÷ 16000 Hz)

### Step 6: Verify Backend Receives Audio

**Backend Logs** (`apps/backend/logs/combined.log`):
```json
{"level":"info","message":"[AUDIO] Audio chunk received","sessionId":"...","audioSize":8192}
{"level":"debug","message":"[AUDIO] STT active, processing audio","sessionId":"..."}
{"level":"debug","message":"[STT] Processing audio chunk","sessionId":"...","audioSize":8192}
{"level":"debug","message":"Audio received","sessionId":"...","chunkSize":8192,"totalBuffered":8192}
```

### Step 7: Verify Mock STT Generates Transcripts

After **first audio chunk** (4096 bytes), mock STT should trigger:

**Backend Logs**:
```json
{"level":"info","message":"Mock STT processing triggered","sessionId":"...","bufferSize":4096}
{"level":"debug","message":"Emitting interim STT result","sessionId":"...","text":"Hello everyone, welcome..."}
{"level":"info","message":"Emitting final STT result","sessionId":"...","text":"Hello everyone, welcome to today's lecture."}
```

**Organizer Console**:
```
[TranscriptDisplay] STT interim result received: {sessionId, text: "Hello everyone, welcome..."}
[TranscriptDisplay] STT final result received: {sessionId, text: "Hello everyone, welcome to today's lecture."}
```

**Organizer UI**:
- "Live Transcript" section should show the mock transcript
- Speech-to-Text indicator should be "Active" (green)
- Translation indicator should briefly flash "Active"

### Step 8: Verify Student Receives Translation

**Student Console**:
```
[Student] Translation received: {translatedText: "<Telugu translation>", sourceLanguage: "en", targetLanguage: "te"}
```

**Student UI**:
- Translated text should appear in Telugu script
- Timestamp should be shown
- Confidence indicator (if shown)

### Step 9: Verify TTS (if working)

**Student Console**:
```
[Student] TTS audio chunk received: {chunkIndex: 0, format: "pcm", sampleRate: 24000}
[AudioPlayer] Playing audio chunk
```

**Note**: TTS may fail due to browser autoplay policies. The critical part is that **translated text must appear** regardless of TTS status.

## Expected Results

### ✅ Success Criteria

1. **Audio Capture**: Microphone captures and sends audio chunks
2. **STT Processing**: Mock STT generates transcripts every ~1 second
3. **Transcript Display**: Organizer sees English transcripts in real-time
4. **Translation**: Mock translation service translates to Telugu
5. **Text Delivery**: Student sees Telugu text appear in real-time
6. **TTS Generation**: Mock TTS generates audio (may not play due to autoplay)

### ❌ Known Limitations

1. **Mock Transcripts**: Text is randomly generated, not actual speech recognition
2. **Mock Translations**: Not real translations, just demo text
3. **Mock Audio**: Generated audio, not actual TTS voice
4. **Autoplay**: Student audio may be blocked by browser
5. **Local Memory**: Resource monitor may report high memory usage on development machine

## Troubleshooting

### Problem: "Speech-to-Text: Idle"

**Check**:
1. Microphone is started
2. Session is ACTIVE (not CREATED)
3. Console shows audio streaming started
4. Console shows audio chunks being sent

**Fix**:
- Restart microphone
- Click "Start Session" again
- Check browser console for errors

### Problem: No transcripts appearing

**Check Backend Logs**:
```bash
# Look for these patterns
grep "Mock STT processing triggered" apps/backend/logs/combined.log
grep "Emitting final STT result" apps/backend/logs/combined.log
```

**Common Causes**:
- STT session not started (check `[STT] Starting STT session` in logs)
- Audio not reaching backend (check `[AUDIO] Audio chunk received`)
- Buffer threshold not met (should trigger at 4096 bytes now)

### Problem: Student doesn't receive translations

**Check**:
1. Student is connected ("Connected" status)
2. Student is in session room (`session:${id}:lang:te`)
3. Translation service registered languages
4. Pipeline orchestrator is broadcasting

**Backend Logs**:
```bash
grep "Translation final broadcast" apps/backend/logs/combined.log
```

### Problem: "Server is at capacity"

**Fix**:
- Restart backend (clears resource monitor)
- Check actual memory usage (may be false positive on dev machine)
- Reduce resource limits in `resource-monitor.service.ts` for local testing

## Debug Commands

### View Backend Logs (Real-time)
```bash
# Windows
Get-Content "apps\backend\logs\combined.log" -Tail 20 -Wait

# Or open in editor
code apps/backend/logs/combined.log
```

### Check Audio Flow
```javascript
// In organizer browser console
// Enable verbose logging
localStorage.setItem('debug', 'audio:*');
```

### Check STT Status
```javascript
// In organizer browser console
// Check audio streaming state
console.log('STT Active:', /* check component state */);
```

## Production Testing

### Deployed URLs
- **Frontend**: https://mic-support-gurunanak-frontend-wsq5.vercel.app
- **Backend**: https://mic-support-gurunanak-production.up.railway.app

### Production Differences
1. CORS must be properly configured
2. Environment variables must be set
3. Database must be accessible
4. No localhost references

### Environment Variables Required

**Backend** (Railway):
```
DATABASE_URL=<postgresql-url>
JWT_SECRET=<secret>
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://mic-support-gurunanak-frontend-wsq5.vercel.app
```

**Frontend** (Vercel):
```
NEXT_PUBLIC_API_URL=https://mic-support-gurunanak-production.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://mic-support-gurunanak-production.up.railway.app
```

## Next Steps for Production

To enable **real** STT/Translation/TTS:

1. **Replace BrowserSTTProvider** with:
   - Google Speech-to-Text API
   - Azure Speech Services
   - AWS Transcribe
   - Deepgram

2. **Replace MockTranslationProvider** with:
   - Google Cloud Translation API
   - Azure Translator
   - AWS Translate

3. **Replace MockTTSProvider** with:
   - Google Cloud Text-to-Speech
   - Azure Speech Services TTS
   - Amazon Polly
   - ElevenLabs

4. **Add API Keys**:
   ```
   GOOGLE_CLOUD_API_KEY=<key>
   AZURE_SPEECH_KEY=<key>
   AWS_ACCESS_KEY=<key>
   ```

5. **Update Service Initialization**:
   ```typescript
   // In stt.service.ts
   const provider = new GoogleSTTProvider(config.googleApiKey);
   
   // In translation.service.ts
   const provider = new GoogleTranslationProvider(config.googleApiKey);
   
   // In tts.service.ts
   const provider = new GoogleTTSProvider(config.googleApiKey);
   ```

## Summary

The pipeline is architecturally complete. All components are in place and communicating correctly:

- ✅ Audio capture and streaming
- ✅ STT service integration
- ✅ Translation pipeline
- ✅ Text channel delivery
- ✅ TTS generation
- ✅ WebSocket communication
- ✅ Error handling and recovery
- ✅ Session management
- ✅ Resource monitoring

The system is **demo-ready** with mock providers and **production-ready** architecture. Simply swap mock providers with real cloud services to enable actual speech recognition, translation, and text-to-speech.
