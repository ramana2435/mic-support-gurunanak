# MODULE 8: TTS Audio Streaming - Comprehensive Testing Guide

## Overview
This guide provides detailed test scenarios for MODULE 8 (Text-to-Speech Audio Streaming). All tests verify that the system meets latency targets, handles errors gracefully, and maintains text channel independence.

---

## ⚠️ CRITICAL TEST - Text Independence

### **TEST 0: Text Continues When TTS Fails**
**Priority**: 🔴 CRITICAL - Must pass before any other tests  
**Requirement**: TTS failure must NEVER stop text translation  
**Duration**: 5 minutes

#### Setup
1. Start backend server
2. Open organizer dashboard, create session (English → Telugu)
3. Open student page in another browser, join as Telugu student
4. Start session

#### Inject TTS Error
**Method A: Code Modification (Temporary)**
```typescript
// In apps/backend/src/services/tts/mock-tts-provider.ts
// Line ~60, in synthesize() method

async *synthesize(...) {
  // ADD THIS AT THE START:
  throw new Error('SIMULATED TTS FAILURE FOR TESTING');
  
  // Rest of code...
}
```

**Method B: Network Simulation**
- Simulate provider unavailable
- Comment out TTS integration temporarily

#### Test Execution
1. With TTS error injected, organizer speaks into mic
2. Observe student screen

#### Expected Results ✅
| Component | Expected Behavior | Status |
|-----------|------------------|--------|
| **Text Channel** | ✅ Text appears normally | CRITICAL |
| **Translation Display** | ✅ Shows translated text | CRITICAL |
| **Audio Status** | ⚠️ Shows "Audio Interrupted" | Expected |
| **UI Toast** | ⚠️ "Audio interrupted - text continues" | Expected |
| **Connection** | ✅ Stays connected | CRITICAL |
| **Latency Display** | ✅ Shows text latency | Expected |

#### Verification Points
- [ ] Text translation appears within 250ms
- [ ] Student can read all translated content
- [ ] No error crashes or disconnects
- [ ] Text latency still tracked
- [ ] Organizer can continue speaking
- [ ] System remains stable

#### Failure Indicators ❌
If ANY of these occur, TEST FAILS:
- Text stops appearing
- Student disconnects
- System crashes
- Error propagates to text channel
- Translation service stops

#### Recovery Test
1. Remove TTS error injection
2. Restart backend
3. Organizer continues speaking
4. Verify audio resumes
5. Verify text still works

**Expected**: Both text and audio work after recovery

---

## 🧪 Core Functionality Tests

### **TEST 1: Basic TTS Playback**
**Priority**: 🟡 High  
**Duration**: 3 minutes  
**Languages**: English, Telugu

#### Setup
1. Start backend and frontend
2. Organizer creates session: English → Telugu
3. Student joins as Telugu
4. Start session

#### Test Cases

##### 1.1 First Audio Delivery
1. Organizer speaks clearly: "Welcome to this session"
2. Observe student screen

**Expected Results**:
- Text appears: < 250ms after speaking
- Audio starts: < 500ms after text
- TTS latency displayed: 300-500ms
- Audio plays smoothly (no gaps)
- Audio matches text content

**Metrics to Capture**:
```
Translation Result → Audio Start: _____ms (target <500ms)
Audio Start → First Playback: _____ms (target <100ms)
Total Latency: _____ms (target <1000ms)
```

##### 1.2 Continuous Speech
1. Organizer speaks 5 sentences continuously
2. Observe audio playback

**Expected**:
- Seamless chunk transitions
- No audio gaps
- Correct sequence
- Synchronized with text

##### 1.3 Audio Status Indicators
**Verify UI Elements**:
- [ ] Audio status shows "🔊 Audio Playing" during playback
- [ ] Audio status shows "Audio Ready" when idle
- [ ] TTS latency updates per sequence: "🎵 Audio: XXXms"
- [ ] Status matches actual audio state

---

### **TEST 2: All Supported Languages**
**Priority**: 🟡 High  
**Duration**: 15 minutes  
**Languages**: All 6 supported

#### Language Matrix

| Language | Native Name | Test Phrase | Voice ID | Expected |
|----------|-------------|-------------|----------|----------|
| English | English | "This is a test" | en-US-mock | ✅ Audio plays |
| Telugu | తెలుగు | "ఇది ఒక పరీక్ష" | te-IN-mock | ✅ Audio plays |
| Hindi | हिन्दी | "यह एक परीक्षण है" | hi-IN-mock | ✅ Audio plays |
| Tamil | தமிழ் | "இது ஒரு சோதனை" | ta-IN-mock | ✅ Audio plays |
| Kannada | ಕನ್ನಡ | "ಇದು ಒಂದು ಪರೀಕ್ಷೆ" | kn-IN-mock | ✅ Audio plays |
| Malayalam | മലയാളം | "ഇതൊരു പരീക്ഷണമാണ്" | ml-IN-mock | ✅ Audio plays |

#### Test Procedure (Per Language)
1. Create session: English → [Target Language]
2. Student joins with [Target Language]
3. Start session
4. Organizer speaks test phrase
5. Verify:
   - [ ] Correct voice selected (check logs)
   - [ ] Audio plays for student
   - [ ] Audio format correct (PCM 48kHz)
   - [ ] No errors in console
   - [ ] Text also appears

#### Voice Verification
Check backend logs for:
```
Mock TTS synthesis started { 
  language: 'te', 
  voiceId: 'te-IN-mock' 
}
```

---

### **TEST 3: Multiple Students, Multiple Languages**
**Priority**: 🟢 Medium  
**Duration**: 10 minutes

#### Setup
1. Organizer creates session: English → [Telugu, Hindi, Tamil]
2. Student A joins: Telugu
3. Student B joins: Hindi
4. Student C joins: Tamil
5. Start session

#### Test Execution
1. Organizer speaks: "Welcome everyone to this multilingual session"
2. Observe all 3 student screens

#### Expected Results
**Student A (Telugu)**:
- ✅ Text: Telugu translation
- ✅ Audio: Telugu voice (te-IN-mock)
- ✅ Latency: 300-500ms

**Student B (Hindi)**:
- ✅ Text: Hindi translation
- ✅ Audio: Hindi voice (hi-IN-mock)
- ✅ Latency: 300-500ms

**Student C (Tamil)**:
- ✅ Text: Tamil translation
- ✅ Audio: Tamil voice (ta-IN-mock)
- ✅ Latency: 300-500ms

#### Verification
- [ ] No audio cross-contamination (A hears only Telugu audio)
- [ ] All students receive correct language
- [ ] Separate TTS processing per language
- [ ] Session isolation maintained

#### Backend Log Verification
```
TTS session created { sessionId: 'xxx', targetLanguage: 'te' }
TTS session created { sessionId: 'xxx', targetLanguage: 'hi' }
TTS session created { sessionId: 'xxx', targetLanguage: 'ta' }
```

---

## ⚡ Performance & Stress Tests

### **TEST 4: Latency Measurement**
**Priority**: 🟡 High  
**Duration**: 5 minutes

#### Metrics to Capture

Create table with 10 samples:

| Sample | Translation→TTS | TTS→Chunk | Chunk→Delivery | Total | Target Met? |
|--------|----------------|-----------|----------------|-------|-------------|
| 1 | ___ms | ___ms | ___ms | ___ms | ☐ |
| 2 | ___ms | ___ms | ___ms | ___ms | ☐ |
| 3 | ___ms | ___ms | ___ms | ___ms | ☐ |
| 4 | ___ms | ___ms | ___ms | ___ms | ☐ |
| 5 | ___ms | ___ms | ___ms | ___ms | ☐ |
| 6 | ___ms | ___ms | ___ms | ___ms | ☐ |
| 7 | ___ms | ___ms | ___ms | ___ms | ☐ |
| 8 | ___ms | ___ms | ___ms | ___ms | ☐ |
| 9 | ___ms | ___ms | ___ms | ___ms | ☐ |
| 10 | ___ms | ___ms | ___ms | ___ms | ☐ |
| **Avg** | ___ms | ___ms | ___ms | ___ms | ☐ |

**Targets**:
- Translation → TTS: < 50ms
- TTS → First Chunk: < 500ms
- Chunk → Delivery: < 100ms
- **Total: < 1000ms** ⭐

#### Data Collection
1. Enable verbose logging
2. Organizer speaks 10 clear sentences
3. Extract metrics from browser console:
```javascript
// Student console shows:
TTS audio playback started {
  sequenceNumber: 1,
  latency: {
    ttsLatency: 240,
    totalLatency: 320
  }
}
```

#### Analysis
- Calculate averages
- Identify outliers
- Check if 90th percentile < 1000ms

---

### **TEST 5: Backlog Management**
**Priority**: 🟡 High  
**Duration**: 5 minutes

#### Scenario
Simulate TTS falling behind due to rapid speech or slow processing.

#### Setup
1. Modify mock provider to add delay:
```typescript
// In mock-tts-provider.ts, synthesize()
await this.sleep(1000); // Add 1 second delay
```
2. Start session with 1 student

#### Test Execution
1. Organizer speaks RAPIDLY: 15+ sentences without pause
2. Observe backend logs
3. Observe student audio

#### Expected Behavior
**Backend Logs**:
```
TTS request queued { queueSize: 10 }
TTS queue full, dropping oldest requests { queueSize: 10 }
Skipping old TTS request { age: 6000, remainingQueue: 3 }
```

**Student Experience**:
- ✅ Text: All sentences appear
- ⚠️ Audio: Older sentences skipped
- ✅ Audio: Current/recent sentences play
- ✅ No huge backlog buildup

#### Verification
- [ ] Queue never exceeds 10 requests
- [ ] Requests older than 5s skipped
- [ ] Audio stays relatively current
- [ ] Text unaffected by backlog

#### Metrics
```
Total Sentences Spoken: 15
Text Messages Received: _____ (expect 15)
Audio Sequences Played: _____ (expect <15, some skipped)
Max Queue Size Observed: _____ (expect ≤10)
```

---

### **TEST 6: Audio Sequencing**
**Priority**: 🟢 Medium  
**Duration**: 5 minutes

#### Test Cases

##### 6.1 Correct Order
1. Organizer speaks numbered sentences:
   - "Sentence number one"
   - "Sentence number two"
   - "Sentence number three"
   - "Sentence number four"
   - "Sentence number five"
2. Observe audio playback order

**Expected**: Audio plays in exact order: 1, 2, 3, 4, 5

##### 6.2 No Audio Gaps
1. Organizer speaks continuously for 30 seconds
2. Listen to student audio carefully

**Expected**: 
- Seamless chunk transitions
- No perceivable gaps between chunks
- Smooth playback

##### 6.3 Chunk Boundaries
Open browser developer tools → Network tab:
1. Observe TTS chunk events
2. Verify chunks arrive in sequence

**Expected**:
```
tts:audio:chunk { sequenceNumber: 1, chunkIndex: 0 }
tts:audio:chunk { sequenceNumber: 1, chunkIndex: 1 }
tts:audio:chunk { sequenceNumber: 1, chunkIndex: 2 }
tts:audio:end { sequenceNumber: 1, isLast: true }
tts:audio:chunk { sequenceNumber: 2, chunkIndex: 0 }
...
```

---

## 🛡️ Error Handling & Recovery

### **TEST 7: TTS Provider Error Simulation**
**Priority**: 🔴 Critical  
**Duration**: 10 minutes

#### Scenario A: Synthesis Failure
Inject error in mock provider:
```typescript
// In mock-tts-provider.ts
async *synthesize() {
  await this.sleep(200);
  throw new Error('Provider connection timeout');
}
```

**Test**:
1. Organizer speaks
2. Verify text appears ✅
3. Verify audio shows "Interrupted" ⚠️
4. Verify no system crash ✅

#### Scenario B: Partial Chunk Failure
```typescript
// After yielding 2 chunks:
if (i === 2) {
  throw new Error('Network interruption');
}
```

**Expected**:
- First 2 chunks play
- Error event emitted
- Text continues ✅
- Audio status updates to "Interrupted"

#### Scenario C: Recovery After Error
1. Inject error for 3 sequences
2. Remove error
3. Organizer continues speaking

**Expected**:
- Text works throughout ✅
- Audio shows "Interrupted" during error
- Audio resumes after fix
- No manual intervention needed

---

### **TEST 8: Session Lifecycle**
**Priority**: 🟢 Medium  
**Duration**: 5 minutes

#### Test Cases

##### 8.1 Session Stop
1. Session running, audio playing
2. Organizer clicks "Stop Session"
3. Verify:
   - [ ] TTS processing stops immediately
   - [ ] Audio playback stops
   - [ ] Queue cleared
   - [ ] Backend logs: "TTS stopped for all languages"
   - [ ] No memory leaks

##### 8.2 Student Disconnect
1. Student receiving audio
2. Student closes browser tab
3. Verify:
   - [ ] TTS for that student stops
   - [ ] Other students unaffected
   - [ ] Resources cleaned up
   - [ ] Session continues

##### 8.3 Session Restart
1. Stop session
2. Wait 5 seconds
3. Start new session with same settings
4. Verify:
   - [ ] New TTS sessions created
   - [ ] Previous sessions cleaned up
   - [ ] No interference
   - [ ] Audio works normally

---

## 🔍 Integration Tests

### **TEST 9: End-to-End Pipeline**
**Priority**: 🟡 High  
**Duration**: 10 minutes

#### Full Pipeline Verification
```
Organizer Mic → STT → Translation → Text Broadcast → TTS → Audio → Student Earbuds
                                         ↓
                                  Text always delivered ✅
```

#### Test Execution
1. Setup: Complete system (STT enabled)
2. Organizer speaks naturally for 2 minutes
3. Monitor all components

#### Checkpoints

| Stage | Input | Output | Latency | Status |
|-------|-------|--------|---------|--------|
| STT | Audio | Text | <500ms | ☐ |
| Translation | English text | Telugu text | <250ms | ☐ |
| **Text Channel** | Translation | Student sees text | <100ms | ☐ |
| TTS | Telugu text | Audio chunks | <500ms | ☐ |
| Audio Delivery | Chunks | Student hears | <100ms | ☐ |
| **Total** | Mic | Earbuds | <1500ms | ☐ |

#### Critical Verification
**If TTS fails at any point**:
- [ ] Text still reaches student
- [ ] Translation continues
- [ ] Student can read everything
- [ ] Only audio affected

---

### **TEST 10: Real-World Scenario**
**Priority**: 🟡 High  
**Duration**: 15 minutes

#### Setup
Simulate actual lecture environment:
- 1 Organizer (English speaker)
- 5 Students (2 Telugu, 2 Hindi, 1 Tamil)
- 10-minute lecture simulation

#### Lecture Script
Organizer reads prepared lecture on any topic, including:
- Normal pace speaking
- Fast sections
- Slow sections
- Pauses
- Questions
- Technical terms

#### Student Experience Checklist

**Each Student Verifies**:
- [ ] Text appears for every sentence
- [ ] Audio plays for every sentence (or shows error if TTS fails)
- [ ] Can understand content (text readable)
- [ ] Latency acceptable (<2 seconds perceived)
- [ ] No disconnections
- [ ] No duplicate messages
- [ ] Audio quality acceptable (clear)

#### Organizer Monitoring
- [ ] STT working throughout
- [ ] Translation processing
- [ ] All students connected
- [ ] No errors in dashboard
- [ ] System responsive

#### Metrics Collection
```
Total Duration: 10 minutes
Text Messages Delivered: _____
Audio Sequences Generated: _____
TTS Errors: _____ (should be 0 with mock)
Student Disconnections: _____ (should be 0)
Average Text Latency: _____ms
Average Audio Latency: _____ms
Text Delivery Success Rate: ____% (target 100%)
Audio Delivery Success Rate: ____% (target >95%)
```

---

## 📊 Test Results Template

### Summary Report

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: Development / Staging / Production  
**Backend Version**: ___________  
**Frontend Version**: ___________

### Critical Tests

| Test | Result | Notes |
|------|--------|-------|
| TEST 0: Text Independence | ☐ PASS ☐ FAIL | |
| TEST 3: Multiple Languages | ☐ PASS ☐ FAIL | |
| TEST 7: Error Handling | ☐ PASS ☐ FAIL | |
| TEST 9: End-to-End | ☐ PASS ☐ FAIL | |

**If any CRITICAL test fails, MODULE 8 is NOT ready for production.**

### All Tests Summary

| # | Test Name | Priority | Result | Latency | Issues |
|---|-----------|----------|--------|---------|--------|
| 0 | Text Independence | 🔴 | ☐ ✅ ☐ ❌ | - | |
| 1 | Basic TTS Playback | 🟡 | ☐ ✅ ☐ ❌ | ___ms | |
| 2 | All Languages | 🟡 | ☐ ✅ ☐ ❌ | ___ms | |
| 3 | Multiple Students | 🟢 | ☐ ✅ ☐ ❌ | ___ms | |
| 4 | Latency Measurement | 🟡 | ☐ ✅ ☐ ❌ | ___ms | |
| 5 | Backlog Management | 🟡 | ☐ ✅ ☐ ❌ | - | |
| 6 | Audio Sequencing | 🟢 | ☐ ✅ ☐ ❌ | - | |
| 7 | Error Handling | 🔴 | ☐ ✅ ☐ ❌ | - | |
| 8 | Session Lifecycle | 🟢 | ☐ ✅ ☐ ❌ | - | |
| 9 | End-to-End | 🟡 | ☐ ✅ ☐ ❌ | ___ms | |
| 10 | Real-World | 🟡 | ☐ ✅ ☐ ❌ | ___ms | |

**Pass Rate**: ___/10 (___%)  
**Production Ready**: ☐ YES ☐ NO

---

## 🚀 Quick Test Checklist

For rapid validation during development:

### 5-Minute Smoke Test
- [ ] Backend starts without errors
- [ ] Frontend connects
- [ ] Create session: English → Telugu
- [ ] Join as student
- [ ] Start session
- [ ] Organizer speaks → Text appears (2s)
- [ ] Audio plays (5s)
- [ ] No console errors
- [ ] Stop session cleanly

### 10-Minute Validation
- [ ] Smoke test PASS
- [ ] Test 2 languages (Telugu + Hindi)
- [ ] Inject TTS error → Text continues ✅
- [ ] Check latency < 1s
- [ ] Verify audio sequencing
- [ ] Session lifecycle (start/stop)

---

## 🐛 Debugging Tips

### No Audio Playing

**Check 1: TTS Service**
```bash
# Backend logs should show:
TTS Service initialized { provider: 'Mock TTS Provider' }
TTS session created { sessionId: 'xxx', targetLanguage: 'te' }
TTS synthesis started { sequenceNumber: 1 }
Mock TTS chunk generated { chunkIndex: 0 }
```

**Check 2: Socket Events**
```javascript
// Browser console should show:
tts:audio:chunk { sequenceNumber: 1, chunkIndex: 0 }
```

**Check 3: Web Audio API**
```javascript
// Check AudioContext state
console.log(audioContext.state); // Should be 'running'
```

**Check 4: Browser Autoplay Policy**
- Some browsers block autoplay
- Click anywhere on page to resume AudioContext

### TTS Errors

**Common Issues**:
1. Provider initialization failed → Check imports
2. Voice not found → Check language mapping
3. Audio format error → Verify PCM encoding
4. Sequence mismatch → Check sequence tracking

**Log Levels**:
```typescript
// Increase logging in tts.service.ts
logger.setLevel('debug');
```

### Latency Too High

**Investigation**:
1. Check mock provider delay (should be 200-400ms)
2. Verify network conditions
3. Check queue processing (should be immediate)
4. Monitor CPU usage
5. Check chunk size (should be ~100ms audio)

---

## 📈 Success Criteria

### Minimum Requirements (Must Pass)
- ✅ TEST 0: Text independence ⭐ CRITICAL
- ✅ Audio plays for at least 1 language
- ✅ Latency < 1 second (average)
- ✅ No system crashes
- ✅ Error handling works

### Target Requirements (Production Ready)
- ✅ All 6 languages working
- ✅ Multiple students supported
- ✅ Latency < 500ms (average)
- ✅ Backlog management verified
- ✅ Session lifecycle clean
- ✅ End-to-end pipeline stable
- ✅ 95%+ test pass rate

### Stretch Goals
- ⭐ Real TTS provider integrated
- ⭐ Latency < 300ms
- ⭐ Audio quality enhancements
- ⭐ Advanced error recovery

---

## 🎯 Next Steps After Testing

### If All Tests Pass
1. **Document results** in this file
2. **Create production deployment plan**
3. **Consider real TTS provider integration**:
   - Google Cloud Text-to-Speech
   - Azure Speech Services
   - AWS Polly
4. **Performance optimization** if needed
5. **Load testing** with more students

### If Tests Fail
1. **Document failures** with details
2. **Prioritize critical issues** (text independence first)
3. **Debug using tips above**
4. **Re-test after fixes**
5. **Update documentation**

---

## 📞 Testing Support

### Need Help?
- Review implementation: `MODULE_8_IMPLEMENTATION.md`
- Check logs: Backend console + Browser console
- Verify setup: All services running
- Ask for clarification on expected behavior

### Report Issues
Include in issue report:
- Test number and name
- Expected vs actual behavior
- Backend logs (relevant section)
- Browser console errors
- Network tab (if applicable)
- Screenshots/recordings

---

**END OF TESTING GUIDE**

Ready to begin testing? Start with **TEST 0** (Text Independence) - this is the most critical test that must pass first.
