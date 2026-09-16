# PIPELINE DIAGNOSTIC REPORT

## Date: 2026-09-14

## ISSUE STATUS: DIAGNOSTIC LOGGING ADDED

### Problem Statement
The real-time translation pipeline appears broken:
- Organizer shows: "STT: Processing, Translation: Idle"
- Students receive NO translated text or audio
- Pipeline appears to stop after STT processing

### Root Cause Investigation

After comprehensive code trace, I found that:

1. ✅ **Audio Capture Works**: Frontend captures audio via Web Audio API
2. ✅ **WebSocket Works**: Audio chunks sent via `AUDIO_STREAM` event
3. ✅ **Backend Receives Audio**: Socket handler at line 165 in `socket/index.ts` receives audio
4. ✅ **STT Service Processes**: `sttService.processAudio()` called correctly
5. ✅ **Groq Provider Configured**: `GroqSTTProvider` using `whisper-large-v3`
6. ✅ **Event Listeners Connected**: Pipeline orchestrator listens to STT `'final'` events
7. ✅ **Translation Service Exists**: `translateForSession()` method properly implemented
8. ⚠️ **POSSIBLE ISSUE**: Translation service requires `registerSessionLanguages()` to be called

### Critical Discovery: Session Languages Not Registered

Looking at the translation service (line 82-89):
```typescript
async translateForSession(...) {
  const targetLanguages = this.sessionLanguages.get(sessionId);
  
  if (!targetLanguages || targetLanguages.size === 0) {
    logger.warn('No target languages for session', { sessionId });
    return new Map(); // ← EMPTY RESULT
  }
```

If `sessionLanguages` is not registered, translation returns empty and nothing is sent to students!

### Where Session Languages SHOULD Be Registered

Checking socket/index.ts line 425-445 (JOIN_SESSION handler):
```typescript
socket.on(SocketEvent.JOIN_SESSION, async (payload: JoinSessionPayload) => {
  // Student joins
  // ...
  
  // Line 432-436: Register translation languages
  translationService.registerSessionLanguages(
    session.id,
    session.targetLanguages.map((lang: any) => lang.code)
  );
```

**This is only called when a STUDENT joins!**

### Hypothesis: Race Condition

If the organizer starts speaking BEFORE any student has joined:
1. STT receives audio ✓
2. STT produces transcript ✓
3. Pipeline orchestrator calls `translateForSession()` ✓
4. Translation service checks `sessionLanguages.get(sessionId)` → `undefined`
5. Returns empty Map → NO translations sent
6. Students see nothing

### Diagnostic Logging Added

I've added comprehensive console logging to trace the exact flow:

#### 1. Groq STT Provider (`groq-stt-provider.ts`)
```
═══════════════════════════════════════════
✓ GROQ STT RESULT EMITTED
Session: xxx
Text: "..."
Event: STTEvent.FINAL_RESULT
═══════════════════════════════════════════
```

#### 2. STT Service (`stt.service.ts`)
```
═══════════════════════════════════════════
✓ STT SERVICE RECEIVED FINAL_RESULT
Session: xxx
Text: "..."
Re-emitting as: 'final'
═══════════════════════════════════════════
```

#### 3. Pipeline Orchestrator (`pipeline-orchestrator.service.ts`)
```
═══════════════════════════════════════════
✓ PIPELINE ORCHESTRATOR PROCESSING STT
Session: xxx
Text: "..."
isFinal: true
═══════════════════════════════════════════
✓ Calling translationService.translateForSession for "..."
✓ Translation completed, received N translations
  → Broadcasting to language: te
✓ All translations broadcast complete
```

#### 4. Translation Service (`translation.service.ts`)
```
═══════════════════════════════════════════
✓ TRANSLATION SERVICE CALLED
Session: xxx
Text: "..."
Source: en
═══════════════════════════════════════════
Target languages: te, hi, ta
  → Translating to te...
  ✓ te: "..." (250ms)
✓ Returning 3 translation(s)
```

### Testing Procedure

#### BEFORE Testing:
1. Restart backend to load new diagnostic logging:
   ```bash
   cd apps/backend
   npm run dev
   ```

2. Keep backend terminal visible to see console output

#### Test Scenario A: Student Joins BEFORE Speaking
1. Organizer creates session
2. Student joins and selects Telugu
3. Organizer starts session
4. Organizer speaks: "Hello students, welcome to class"
5. **Expected**: All 4 log blocks appear in backend console
6. **Expected**: Student receives Telugu translation

#### Test Scenario B: Speaking BEFORE Student Joins
1. Organizer creates session
2. Organizer starts session (NO student yet)
3. Organizer speaks: "Testing without students"
4. **Expected**: Logs show "No target languages registered"
5. Student now joins and selects Telugu
6. Organizer speaks again: "Now you should hear this"
7. **Expected**: This second sentence reaches student

### Expected Log Flow (When Working)

```
[AUDIO] Audio chunk received (sessionId: xxx, size: 8192)
[STT] Processing audio chunk
[GroqSTT] Processing audio buffer with Groq Whisper
═══════════════════════════════════════════
✓ GROQ STT RESULT EMITTED
Session: abc123
Text: "Hello students, welcome to class"
═══════════════════════════════════════════
═══════════════════════════════════════════
✓ STT SERVICE RECEIVED FINAL_RESULT
Session: abc123
Text: "Hello students, welcome to class"
Re-emitting as: 'final'
═══════════════════════════════════════════
═══════════════════════════════════════════
✓ PIPELINE ORCHESTRATOR PROCESSING STT
Session: abc123
Text: "Hello students, welcome to class"
isFinal: true
═══════════════════════════════════════════
✓ Calling translationService.translateForSession for "Hello students, welcome to class"
═══════════════════════════════════════════
✓ TRANSLATION SERVICE CALLED
Session: abc123
Text: "Hello students, welcome to class"
Source: en
═══════════════════════════════════════════
Target languages: te
  → Translating to te...
  ✓ te: "హలో విద్యార్థులు, తరగతికి స్వాగతం" (340ms)
✓ Returning 1 translation(s)
✓ Translation completed, received 1 translations
  → Broadcasting to language: te
✓ All translations broadcast complete
```

### If Translation Fails

Look for these error patterns:

**No target languages:**
```
✗ No target languages registered for session abc123
```
→ **Fix**: Ensure student has joined BEFORE speaking

**Groq API Error:**
```
[GroqSTT] Transcription failed
[Translation] Groq API error: 401 Unauthorized
```
→ **Fix**: Check GROQ_API_KEY is correct in .env

**STT not active:**
```
[AUDIO] STT not active for session, ignoring audio
```
→ **Fix**: Ensure session started and pipeline running

**Pipeline not running:**
```
⚠ Pipeline not running for session abc123, skipping STT result
```
→ **Fix**: Check session status is ACTIVE

### Files Modified

1. `apps/backend/src/services/stt/groq-stt-provider.ts`
   - Added diagnostic console logs after STT result emitted

2. `apps/backend/src/services/stt/stt.service.ts`
   - Added diagnostic console logs when provider events received

3. `apps/backend/src/services/pipeline/pipeline-orchestrator.service.ts`
   - Added diagnostic console logs in `processSTTResult` method
   - Shows pipeline state, translation calls, and broadcast status

4. `apps/backend/src/services/translation/translation.service.ts`
   - Added diagnostic console logs in `translateForSession` method
   - Shows target languages, translation progress, and results

### Next Steps

1. **Run the test procedure above**
2. **Capture backend console logs**
3. **Identify where the log chain breaks**
4. **Report findings**:
   - Does STT emit results?
   - Does pipeline orchestrator receive them?
   - Are target languages registered?
   - Does translation complete?
   - Are translations broadcast?

### Verification Commands

```bash
# Check if GROQ_API_KEY is set (without showing value)
grep -q "^GROQ_API_KEY=gsk_" apps/backend/.env && echo "✓ GROQ_API_KEY is set" || echo "✗ GROQ_API_KEY missing"

# Start backend with logging
cd apps/backend
npm run dev

# In separate terminal, tail logs
cd apps/backend
tail -f logs/combined.log | grep -E "GROQ|STT|TRANSLATION|Pipeline"
```

### Architecture Verified Correct

The architecture is sound:
- Microphone → WebSocket → STT → Pipeline → Translation → WebSocket → Student
- All event listeners are connected
- All services are instantiated correctly
- Groq providers are configured

The issue is likely **timing** (speaking before students join) or **runtime state** (languages not registered, session not active, etc.).

### Build Status

- ✅ Backend type-check: PASS
- ✅ Frontend type-check: PASS  
- ✅ Backend build: PASS
- ✅ Frontend build: PASS

---

**ACTION REQUIRED**: Run backend with `npm run dev` and observe console logs during live speech testing.
