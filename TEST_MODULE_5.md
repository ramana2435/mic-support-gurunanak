# MODULE 5 - TESTING GUIDE

## Streaming Speech-to-Text Testing

### Prerequisites
- Backend running on http://localhost:3001
- Frontend running on http://localhost:3000
- Microphone available and working (from Module 4)
- Active session with ACTIVE status

---

## Test 1: Basic STT Flow (5 minutes)

### Step 1: Setup Session
1. Login as organizer
2. Create new session or open existing
3. Start session (status = ACTIVE)
4. ✓ Verify session is ACTIVE

### Step 2: Start Microphone
1. Grant microphone permission (if needed)
2. Select microphone device
3. Click "Test Microphone"
4. ✓ Verify microphone is capturing (level meter moving)
5. ✓ Verify "Speech-to-Text" section appears below

### Step 3: Start STT
1. ✓ Verify "Start Transcription" button is visible
2. Click "Start Transcription"
3. ✓ Verify button changes to "Stop Transcription"
4. ✓ Verify green pulsing indicator appears
5. ✓ Verify "Audio streaming active" message shows
6. ✓ Verify "Live Transcript" card appears

### Step 4: Test Speech Recognition
1. Speak clearly into microphone: "Hello everyone, welcome to today's lecture"
2. ✓ Verify interim text appears (gray, italic, with cursor)
3. Wait 1-2 seconds
4. ✓ Verify final text appears (black, no cursor)
5. ✓ Verify timestamp shows
6. ✓ Verify latency number shows (should be <1000ms)

### Step 5: Continuous Speech
1. Continue speaking: "Let's discuss the main topic"
2. ✓ Verify new interim text appears
3. ✓ Verify previous text becomes final
4. ✓ Verify transcript scrolls automatically
5. ✓ Verify latency stats update (Current/Avg/Min/Max)

**Test 1 Result**: ✅ Basic STT working

---

## Test 2: Latency Measurement (3 minutes)

### Step 1: Check Latency Display
1. With STT running, speak into microphone
2. ✓ Verify latency shown in top-right of transcript card
3. ✓ Verify format: "125ms (avg: 98ms)"
4. ✓ Verify color coding:
   - Green if <500ms
   - Yellow if 500-1000ms
   - Red if >1000ms

### Step 2: Check Latency Statistics
1. Scroll to bottom of transcript card
2. ✓ Verify stats row shows:
   - Current: XXms
   - Avg: XXms
   - Min: XXms
   - Max: XXms
3. ✓ Verify stats update in real-time

### Step 3: Measure End-to-End Latency
1. Say a word (e.g., "Hello")
2. Start timer when you finish speaking
3. Note when final transcript appears
4. ✓ Verify total time is approximately equal to displayed latency
5. ✓ Verify typical latency is <500ms (mock provider)

**Test 2 Result**: ✅ Latency instrumentation working

---

## Test 3: Interim vs Final Results (3 minutes)

### Step 1: Observe Interim Results
1. Start speaking slowly: "This is a test..."
2. ✓ Verify interim text appears immediately (gray, italic)
3. ✓ Verify cursor animates at end of text
4. ✓ Verify text updates as you speak

### Step 2: Observe Final Results
1. Finish sentence: "...of the system"
2. Wait 1 second
3. ✓ Verify interim text becomes final (black, no cursor)
4. ✓ Verify text no longer changes
5. ✓ Verify timestamp is fixed

### Step 3: Multiple Interim Updates
1. Speak a long sentence slowly
2. ✓ Verify interim text updates multiple times
3. ✓ Verify each update is visible
4. ✓ Verify final result is most accurate

**Test 3 Result**: ✅ Interim/Final transcripts working

---

## Test 4: STT Start/Stop Control (2 minutes)

### Step 1: Manual Stop
1. With STT running, click "Stop Transcription"
2. ✓ Verify button changes to "Start Transcription"
3. ✓ Verify green indicator disappears
4. ✓ Verify "Audio streaming active" message disappears
5. Speak into microphone
6. ✓ Verify NO new transcripts appear

### Step 2: Manual Restart
1. Click "Start Transcription" again
2. ✓ Verify button changes to "Stop Transcription"
3. ✓ Verify indicators return
4. Speak into microphone
5. ✓ Verify transcripts appear again
6. ✓ Verify previous transcripts are still visible

### Step 3: Microphone Stop
1. With STT running, click "Stop" on microphone
2. ✓ Verify STT stops automatically
3. ✓ Verify appropriate messages
4. Restart microphone
5. ✓ Verify can manually start STT again

**Test 4 Result**: ✅ STT control working

---

## Test 5: Confidence Scores (2 minutes)

### Step 1: View Confidence
1. With STT running, speak clearly into microphone
2. Wait for final transcript
3. Hover over transcript line
4. ✓ Verify confidence percentage appears (e.g., "94% confident")
5. ✓ Verify percentage is reasonable (typically 80-98%)

### Step 2: Test Different Speech Quality
1. Speak very clearly: "This is a clear sentence"
2. ✓ Verify high confidence (>90%)
3. Speak unclearly or mumble
4. ✓ Verify lower confidence (<85%)

**Test 5 Result**: ✅ Confidence scores showing

---

## Test 6: Multiple Sessions (3 minutes)

### Step 1: Start Two Sessions
1. Create Session A with STT running
2. Note Session A's transcripts
3. Open new browser window
4. Create Session B with STT running

### Step 2: Verify Isolation
1. Speak into Session A's microphone
2. ✓ Verify transcripts appear ONLY in Session A
3. ✓ Verify Session B shows no transcripts
4. Speak into Session B's microphone
5. ✓ Verify transcripts appear ONLY in Session B
6. ✓ Verify no cross-talk between sessions

**Test 6 Result**: ✅ Session isolation working

---

## Test 7: Session State Changes (2 minutes)

### Step 1: STT with CREATED Session
1. Create new session (status = CREATED)
2. ✓ Verify "Speech-to-Text" section NOT visible
3. Start microphone
4. ✓ Verify still NO STT section
5. Start session (status = ACTIVE)
6. ✓ Verify STT section NOW appears

### Step 2: Stop Session with Active STT
1. With STT running, stop session
2. ✓ Verify STT continues (doesn't auto-stop on session stop)
3. ✓ Verify transcripts still work
4. Navigate away
5. ✓ Verify cleanup happens

**Test 7 Result**: ✅ Session state integration working

---

## Test 8: Browser Console Check (2 minutes)

### Step 1: Check Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. Start STT
4. ✓ Verify log messages appear:
   - "Audio streaming started"
   - "STT start requested"
5. ✓ Verify no error messages

### Step 2: Check Network
1. Go to Network tab → WS (WebSocket)
2. ✓ Verify WebSocket connection active
3. ✓ Verify messages being sent:
   - `audio:stream` (frequent)
   - `stt:start` (once)
4. ✓ Verify messages being received:
   - `stt:interim` (frequent)
   - `stt:final` (less frequent)

### Step 3: Check Memory
1. Speak for 1 minute continuously
2. Check browser Task Manager (Shift+Esc)
3. ✓ Verify reasonable memory usage (<200MB)
4. ✓ Verify no memory leaks (memory stabilizes)

**Test 8 Result**: ✅ No console errors, proper cleanup

---

## Test 9: Audio Streaming Verification (3 minutes)

### Step 1: Verify Audio Data Transmission
1. Open browser console
2. Start STT
3. Speak into microphone
4. Check console for "Audio streaming started" message
5. ✓ Verify message appears

### Step 2: Check Backend Logs
1. Check backend terminal
2. ✓ Verify "STT start requested" log
3. ✓ Verify "STT session started" log
4. ✓ Verify "Interim STT result" logs (frequent)
5. ✓ Verify "Final STT result" logs
6. ✓ Verify latency values in logs

### Step 3: Verify Audio Processing
1. Speak: "Testing audio processing"
2. ✓ Verify backend logs show audio received
3. ✓ Verify STT provider processes audio
4. ✓ Verify results broadcast to client

**Test 9 Result**: ✅ Audio streaming pipeline working

---

## Test 10: Error Handling (3 minutes)

### Step 1: No Microphone
1. Stop microphone capture
2. Try to start STT
3. ✓ Verify error toast: "Please start microphone capture first"
4. ✓ Verify STT doesn't start

### Step 2: Session Not Active
1. Create session but DON'T start it (CREATED status)
2. Try to start STT
3. ✓ Verify STT section doesn't appear
4. ✓ Verify appropriate state handling

### Step 3: Simulated Disconnect (Advanced)
1. Start STT
2. In backend, simulate provider error (code modification needed)
3. ✓ Verify error detected
4. ✓ Verify reconnection attempt
5. ✓ Verify user notification

**Test 10 Result**: ✅ Error handling working

---

## Test 11: Transcript Display Features (2 minutes)

### Step 1: Auto-Scroll
1. Speak continuously to generate many transcripts
2. ✓ Verify transcript auto-scrolls to bottom
3. ✓ Verify newest transcript always visible

### Step 2: Timestamp Display
1. Check transcript timestamps
2. ✓ Verify format: "HH:MM:SS" (e.g., "14:32:15")
3. ✓ Verify timestamps are accurate

### Step 3: Empty State
1. Start STT but don't speak
2. ✓ Verify empty state shows:
   - Microphone icon
   - "Waiting for speech..."
   - Helpful message

**Test 11 Result**: ✅ Display features working

---

## Test 12: Performance Under Load (3 minutes)

### Step 1: Continuous Speech
1. Start STT
2. Speak continuously for 2 minutes
3. ✓ Verify transcripts continue appearing
4. ✓ Verify no slowdown
5. ✓ Verify latency remains low

### Step 2: Check Resource Usage
1. During continuous speech, check:
   - CPU usage (<20%)
   - Memory usage (stable)
   - Network usage (reasonable)
2. ✓ Verify no excessive resource consumption

### Step 3: Long Session
1. Keep STT running for 5 minutes
2. ✓ Verify continues working
3. ✓ Verify no errors appear
4. ✓ Verify can stop cleanly

**Test 12 Result**: ✅ Performance acceptable

---

## Test 13: Cleanup and Lifecycle (2 minutes)

### Step 1: Stop STT Properly
1. Start STT
2. Click "Stop Transcription"
3. ✓ Verify audio streaming stops
4. ✓ Verify no errors in console
5. ✓ Verify backend logs show cleanup

### Step 2: Browser Refresh
1. Start STT
2. Refresh browser (F5)
3. ✓ Verify cleanup happens
4. ✓ Verify no errors
5. ✓ Verify can start STT again after refresh

### Step 3: Navigation Away
1. Start STT
2. Click "Back to Dashboard"
3. ✓ Verify cleanup happens
4. ✓ Verify no errors in console
5. ✓ Verify no lingering connections

**Test 13 Result**: ✅ Cleanup working properly

---

## Expected Results Summary

### ✅ All Tests Passing:
- Basic STT flow working
- Latency <1 second (typically 100-200ms mock)
- Interim and final transcripts appearing
- Manual controls working
- Session isolation working
- Error handling comprehensive
- Transcript display functional
- Auto-scroll and timestamps working
- Performance acceptable
- Proper cleanup

### 🎯 Success Criteria:
- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ All 13 test scenarios pass
- ✅ Latency displayed and reasonable
- ✅ Transcripts appear in real-time
- ✅ Provider abstraction working
- ✅ Clean console output

---

## Latency Benchmarks

### Mock Provider (Current)
- **Average**: ~100ms
- **Min**: ~67ms
- **Max**: ~203ms
- **Status**: ✅ Excellent (well below 1s target)

### Expected Real Cloud Provider
- **Google STT**: 200-500ms
- **Azure Speech**: 150-400ms
- **AWS Transcribe**: 200-600ms
- **Status**: Should still be <1s

---

## Common Issues & Solutions

### Issue: No transcripts appearing
**Check**: 
- Microphone capturing? (level meter moving)
- STT started? (green indicator)
- Speaking loud enough?
**Solution**: Verify mic working, restart STT

### Issue: High latency (>1000ms)
**Check**: Network speed, backend logs
**Solution**: Check backend performance, network connection

### Issue: Transcripts not updating
**Check**: WebSocket connection
**Solution**: Check console for WebSocket errors, refresh page

### Issue: Audio streaming not working
**Check**: Browser console for errors
**Solution**: Verify AudioContext permissions, restart microphone

---

## Backend Verification

### Check Backend Logs

Expected log messages:
```
STT start requested
STT session started
Interim STT result { latency: 95 }
Final STT result { latency: 120, text: "..." }
Audio streaming started
```

### Check WebSocket Events

In browser DevTools → Network → WS:
- `stt:start` sent
- `audio:stream` sent continuously
- `stt:interim` received frequently
- `stt:final` received periodically

---

## Phase 6 Readiness Check

Module 5 provides for Phase 6:
- ✅ Real-time text transcripts
- ✅ Session-specific streams
- ✅ Latency tracking
- ✅ Error handling
- ✅ Provider abstraction

**Ready for Phase 6**: Translation & TTS

---

## Module 5 Complete! ✅

If all 13 tests pass:
- ✅ Streaming STT working
- ✅ Latency below 1 second
- ✅ Provider abstraction functional
- ✅ Real-time transcripts displaying
- ✅ Error handling comprehensive
- ✅ Ready for Phase 6

**Report any failing tests for debugging!**

---

**Next Step**: Proceed to Phase 6 (Translation & Text-to-Speech)
