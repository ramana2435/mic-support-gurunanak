# MODULE 8: TTS Audio Streaming - Quick Start Testing Guide

## 🚀 Ready to Test MODULE 8!

This guide gets you testing MODULE 8 in under 10 minutes.

---

## ✅ Pre-Testing Checklist

### Prerequisites
- [ ] Backend server can start
- [ ] Frontend can start
- [ ] Database is running
- [ ] You have 2 browser windows/tabs available
- [ ] Audio output device connected (speakers/headphones)

### Files Verified
All MODULE 8 files are implemented and compiled:
- ✅ Backend TTS provider interface
- ✅ Backend mock TTS provider (6 languages)
- ✅ Backend TTS service (queue management)
- ✅ Backend socket integration
- ✅ Frontend audio player hook
- ✅ Frontend student UI integration
- ✅ Shared types (events & payloads)

---

## ⚡ 5-Minute Smoke Test

### Step 1: Start Backend (1 min)
```bash
cd apps/backend
npm run dev
```

**Expected output**:
```
TTS Service initialized { provider: 'Mock TTS Provider' }
Socket.IO server initialized
TTS service listeners initialized
Server listening on port 5000
```

### Step 2: Start Frontend (1 min)
```bash
cd apps/frontend
npm run dev
```

**Expected**: Frontend running on http://localhost:3000

### Step 3: Create Session (1 min)
1. Open browser → http://localhost:3000/organizer/dashboard
2. Click "Create Session"
3. Fill in:
   - Title: "TTS Test Session"
   - Source Language: English
   - Target Languages: ✅ Telugu
   - Max Students: 10
4. Click "Create"
5. Copy session code (e.g., "ABC123")

### Step 4: Join as Student (1 min)
1. Open NEW browser tab/window (incognito recommended)
2. Go to: http://localhost:3000/join
3. Enter session code: ABC123
4. Name: "Test Student"
5. Language: Telugu
6. Click "Join Session"

**Expected**: Student page loads, shows "Waiting for session to start"

### Step 5: Test TTS (1 min)
1. **Organizer tab**: Click "Start Session"
2. **Student tab**: Should show "Audio Ready" status
3. **Organizer tab**: Click microphone button OR type in test input
4. **Organizer speaks**: "Welcome to this test session"

**Expected Results** ✅:
```
Student Screen:
├─ Text appears: "తెస్ట్ సెషన్‌కి స్వాగతం" (~250ms)
├─ Audio plays: Telugu voice (~500ms)
├─ Audio Status: "🔊 Audio Playing"
└─ Latency Display: "🎵 Audio: ~400ms"
```

### Step 6: Verify (30 sec)
- [ ] Text appeared quickly
- [ ] Audio played after text
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Status indicators updated correctly

**✅ If all checked: SMOKE TEST PASSED!**

---

## 🔥 CRITICAL TEST: Text Independence (5 min)

This is THE most important test. **Must pass before anything else.**

### Setup (2 min)
1. Keep backend and frontend running
2. Create new session or use existing
3. Student joined and session started

### Inject TTS Error (1 min)

**Option A: Code Injection (Quick)**
```typescript
// File: apps/backend/src/services/tts/mock-tts-provider.ts
// Line ~60, inside synthesize() method

async *synthesize(text, language, voiceConfig) {
  // ADD THIS LINE AT THE START:
  throw new Error('🧪 SIMULATED TTS FAILURE FOR TEST 0');
  
  // ... rest of original code
}
```

**Save file** → Backend will auto-reload

**Option B: Environment Simulation**
- Stop backend
- Temporarily rename TTS service file
- Start backend (TTS will fail to initialize)

### Execute Test (1 min)
1. **Organizer speaks**: "This is a critical test"
2. **Watch student screen carefully**

### Expected Results ✅
| Component | Expected | Critical? |
|-----------|----------|-----------|
| **Text Display** | ✅ "ఇది ఒక క్లిష్టమైన పరీక్ష" | 🔴 YES |
| **Audio Status** | ⚠️ "Audio Interrupted" | Expected |
| **Toast Message** | ⚠️ "Audio interrupted - text continues" | Expected |
| **Connection** | ✅ "Connected" | 🔴 YES |
| **Text Latency** | ✅ Shows value (~200ms) | 🔴 YES |
| **No Errors** | ✅ No crashes | 🔴 YES |

### Verification Questions
- **Q1**: Did text appear normally? → Must be ✅ YES
- **Q2**: Could student read the translation? → Must be ✅ YES
- **Q3**: Did system crash? → Must be ❌ NO
- **Q4**: Did student disconnect? → Must be ❌ NO
- **Q5**: Did organizer see errors? → Must be ❌ NO

**If all answers correct: TEST 0 PASSED** ⭐

### Cleanup
Remove the injected error code, restart backend.

---

## 🎯 Quick Validation Tests (10 min total)

### Test 1: Multiple Languages (3 min)
**Goal**: Verify all 6 supported languages work

1. Create session: English → Telugu, Hindi, Tamil
2. Open 3 student tabs:
   - Student A: Telugu
   - Student B: Hindi  
   - Student C: Tamil
3. Start session
4. Organizer speaks: "Welcome everyone"
5. **Verify each student**:
   - [ ] Telugu student: Telugu text + Telugu audio
   - [ ] Hindi student: Hindi text + Hindi audio
   - [ ] Tamil student: Tamil text + Tamil audio

**Check backend logs for**:
```
TTS session created { targetLanguage: 'te' }
TTS session created { targetLanguage: 'hi' }
TTS session created { targetLanguage: 'ta' }
Mock TTS synthesis started { language: 'te', voiceId: 'te-IN-mock' }
Mock TTS synthesis started { language: 'hi', voiceId: 'hi-IN-mock' }
Mock TTS synthesis started { language: 'ta', voiceId: 'ta-IN-mock' }
```

### Test 2: Latency Check (2 min)
**Goal**: Verify latency < 1 second

1. Session running with 1 student
2. Organizer speaks 5 clear sentences
3. Note TTS latency display on student screen for each

**Record**:
```
Sentence 1: ___ms
Sentence 2: ___ms
Sentence 3: ___ms
Sentence 4: ___ms
Sentence 5: ___ms
Average: ___ms
```

**Target**: Average < 1000ms (ideally < 500ms)

### Test 3: Audio Sequencing (2 min)
**Goal**: Verify correct order, no gaps

1. Organizer speaks numbered sentences:
   - "Sentence number one"
   - "Sentence number two"
   - "Sentence number three"
   - "Sentence number four"
   - "Sentence number five"
2. Listen to student audio

**Verify**:
- [ ] Audio plays in order: 1, 2, 3, 4, 5
- [ ] No gaps between sentences
- [ ] Smooth playback
- [ ] No overlapping audio

### Test 4: Session Lifecycle (3 min)
**Goal**: Clean start and stop

1. **Start session** → Student receives audio ✅
2. **Organizer speaks** → Audio plays ✅
3. **Stop session** → Audio stops ✅
4. **Check backend logs**:
   ```
   TTS stopped for all languages { sessionId: 'xxx', count: 1 }
   ```
5. **Restart session** → Audio works again ✅

**Verify**:
- [ ] No memory leaks (check task manager)
- [ ] Clean stop (no errors)
- [ ] Clean restart (audio works)

---

## 📊 Quick Results Summary

### Smoke Test
- [ ] ✅ Backend started
- [ ] ✅ Frontend started
- [ ] ✅ Session created
- [ ] ✅ Student joined
- [ ] ✅ Text appeared
- [ ] ✅ Audio played

### Critical Test
- [ ] ✅ Text continues when TTS fails ⭐ **MOST IMPORTANT**

### Validation Tests
- [ ] ✅ Multiple languages (3/3 passed)
- [ ] ✅ Latency acceptable (<1s)
- [ ] ✅ Audio sequencing correct
- [ ] ✅ Lifecycle clean

**Overall**: ☐ PASS ☐ FAIL

---

## 🐛 Quick Troubleshooting

### Problem: No audio playing
**Check 1**: Browser console → Any errors?  
**Check 2**: Backend logs → TTS synthesis started?  
**Check 3**: Audio device → Connected and unmuted?  
**Check 4**: Browser autoplay → Click page to enable  

**Quick fix**: 
```javascript
// Browser console:
audioContext.resume();
```

### Problem: Text not appearing
**Check 1**: Backend logs → Translation successful?  
**Check 2**: Network tab → translation:final event received?  
**Check 3**: Socket connection → Connected?  

**This is CRITICAL** - must be fixed immediately.

### Problem: Latency too high (>2s)
**Check 1**: Network conditions  
**Check 2**: Backend CPU usage  
**Check 3**: Mock provider delay (should be 200-400ms)  

**Acceptable**: 500-1000ms  
**Investigate**: >1000ms

### Problem: Backend errors
**Common errors**:
1. `TTS provider not found` → Check imports
2. `Voice not available` → Check language mapping
3. `Socket emit failed` → Check socket connection

**Check logs** for specific error messages.

---

## ✅ Success Criteria

### Minimum (Must Have)
- ✅ Smoke test passed
- ✅ Text independence verified ⭐ CRITICAL
- ✅ At least 1 language works
- ✅ No system crashes

### Target (Production Ready)
- ✅ All 6 languages working
- ✅ Latency < 1 second
- ✅ Multiple students supported
- ✅ Session lifecycle clean

### Stretch (Excellent)
- ⭐ Latency < 500ms
- ⭐ All validation tests passed
- ⭐ No errors in any logs
- ⭐ Ready for real TTS provider

---

## 📝 Next Steps

### If Tests Pass ✅
1. Document results in testing guide
2. Run comprehensive tests (MODULE_8_TESTING_GUIDE.md)
3. Consider real TTS provider integration
4. Plan production deployment

### If Tests Fail ❌
1. Note which test failed
2. Check error messages
3. Review implementation files
4. Consult MODULE_8_IMPLEMENTATION.md
5. Re-test after fixes

### Need More Testing?
See **MODULE_8_TESTING_GUIDE.md** for:
- 10 comprehensive test scenarios
- Detailed verification procedures
- Performance benchmarks
- Stress tests
- Integration tests

---

## 🎉 Quick Win Checklist

Done with quick testing? Mark your achievements:

- [ ] ✅ Backend starts without errors
- [ ] ✅ Frontend connects successfully
- [ ] ✅ Session created and joined
- [ ] ✅ Text translation works
- [ ] ✅ Audio plays (at least 1 language)
- [ ] ✅ **TEXT CONTINUES WHEN TTS FAILS** ⭐ CRITICAL
- [ ] ✅ Latency < 1 second
- [ ] ✅ No crashes or disconnects
- [ ] ✅ Multiple languages tested
- [ ] ✅ Session lifecycle works

**10/10 checked?** → MODULE 8 is working! 🎉

---

## 📞 Help & Resources

### Documentation
- **Full Testing Guide**: MODULE_8_TESTING_GUIDE.md
- **Implementation Details**: MODULE_8_IMPLEMENTATION.md
- **Independence Verification**: MODULE_8_TEXT_INDEPENDENCE_VERIFICATION.md

### Logs to Check
- **Backend**: Terminal running `npm run dev` (backend)
- **Frontend**: Browser DevTools → Console
- **Network**: Browser DevTools → Network tab → Filter: WS

### Commands
```bash
# Backend logs (verbose)
cd apps/backend
npm run dev

# Frontend logs
cd apps/frontend  
npm run dev

# Check TTS service
curl http://localhost:5000/health
```

---

**Ready to begin?**

1. Start with **5-Minute Smoke Test** ⬆️
2. Then run **CRITICAL TEST** ⬆️
3. Finally run **Quick Validation Tests** ⬆️

**Total Time**: ~20 minutes  
**Confidence**: High if all pass ✅

Good luck! 🚀
