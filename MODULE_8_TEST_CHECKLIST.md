# MODULE 8: TTS Audio Streaming - Test Execution Checklist

## 📋 Use This Checklist During Testing

Print this page or keep it open while testing MODULE 8. Check boxes as you complete each test.

---

## 🚀 PHASE 1: Environment Setup (5 min)

### Backend Setup
- [ ] Navigate to `apps/backend`
- [ ] Run `npm run dev`
- [ ] Verify output: "TTS Service initialized"
- [ ] Verify output: "TTS service listeners initialized"
- [ ] Backend running on port 5000
- [ ] No startup errors

### Frontend Setup
- [ ] Navigate to `apps/frontend`
- [ ] Run `npm run dev`
- [ ] Verify frontend running on port 3000
- [ ] No startup errors

### Browser Setup
- [ ] Primary browser tab open (organizer)
- [ ] Secondary browser tab/window open (student)
- [ ] Audio output device connected
- [ ] Audio output device unmuted
- [ ] Volume at comfortable level

**Phase 1 Complete**: [ ] All items checked

---

## ⚡ PHASE 2: Smoke Test (5 min)

### Session Creation
- [ ] Navigate to organizer dashboard
- [ ] Click "Create Session"
- [ ] Title: "MODULE 8 Test"
- [ ] Source: English
- [ ] Target: ☑ Telugu
- [ ] Max Students: 10
- [ ] Session created successfully
- [ ] Session code visible (write it here: ________)

### Student Join
- [ ] Open student tab
- [ ] Navigate to /join
- [ ] Enter session code
- [ ] Name: "Test Student"
- [ ] Language: Telugu
- [ ] Join successful
- [ ] Student page loaded

### Session Start
- [ ] Organizer: Click "Start Session"
- [ ] Student: Status shows "Audio Ready"
- [ ] Student: Connection indicator green
- [ ] No errors in consoles

### First Audio Test
- [ ] Organizer speaks or types: "Welcome to this session"
- [ ] Student: Text appears (<2 seconds)
- [ ] Student: Audio plays (<2 seconds after text)
- [ ] Student: Audio status shows "🔊 Audio Playing"
- [ ] Student: Latency display shows value (~400ms)
- [ ] Audio is clear and audible
- [ ] Text matches audio content

**Phase 2 Complete**: [ ] All items checked ✅ SMOKE TEST PASSED

---

## 🔥 PHASE 3: CRITICAL TEST - Text Independence (10 min)

**⚠️ THIS IS THE MOST IMPORTANT TEST**

### Setup Error Injection
- [ ] Open `apps/backend/src/services/tts/mock-tts-provider.ts`
- [ ] Find `async *synthesize()` method (around line 60)
- [ ] Add at start: `throw new Error('TEST ERROR');`
- [ ] Save file
- [ ] Backend auto-reloaded
- [ ] Keep session running (or restart if needed)

### Execute Test
- [ ] Organizer speaks: "This is a critical test"
- [ ] **Watch student screen carefully**

### Verify Text Channel ✅ CRITICAL
- [ ] Text appeared on student screen
- [ ] Text is readable and correct
- [ ] Translation completed normally
- [ ] Text latency still displayed
- [ ] No disconnection occurred
- [ ] No page crash or reload

### Verify TTS Status ⚠️ Expected
- [ ] Audio status shows "⚠️ Audio Interrupted"
- [ ] Toast message: "Audio interrupted - text continues"
- [ ] No audio playing (expected with error)
- [ ] Connection remains stable

### Verify System Stability ✅ CRITICAL
- [ ] Backend still running (no crash)
- [ ] Frontend still connected
- [ ] Student can continue receiving text
- [ ] Organizer can continue session
- [ ] No critical errors in logs

### Verify Logs
**Backend logs should show**:
- [ ] "TTS processing error (non-fatal)"
- [ ] Error logged but not thrown
- [ ] Translation continues after error
- [ ] System remains stable

### Recovery Test
- [ ] Remove injected error from code
- [ ] Save file (backend reloads)
- [ ] Organizer speaks again
- [ ] Verify text appears ✅
- [ ] Verify audio resumes ✅

**Phase 3 Result**:
- [ ] ✅ Text continued working during TTS failure ⭐ CRITICAL REQUIREMENT MET
- [ ] ✅ System remained stable throughout
- [ ] ✅ Recovery successful after fix

**Phase 3 Complete**: [ ] All critical items checked ✅ TEXT INDEPENDENCE VERIFIED

---

## 🎯 PHASE 4: Language Testing (15 min)

### Test 1: Telugu
- [ ] Session: English → Telugu
- [ ] Student joins as Telugu
- [ ] Organizer speaks test phrase
- [ ] Text appears (Telugu script)
- [ ] Audio plays (Telugu voice)
- [ ] Backend log: `voiceId: 'te-IN-mock'`

### Test 2: Hindi
- [ ] Session: English → Hindi
- [ ] Student joins as Hindi
- [ ] Organizer speaks test phrase
- [ ] Text appears (Hindi script)
- [ ] Audio plays (Hindi voice)
- [ ] Backend log: `voiceId: 'hi-IN-mock'`

### Test 3: Tamil
- [ ] Session: English → Tamil
- [ ] Student joins as Tamil
- [ ] Organizer speaks test phrase
- [ ] Text appears (Tamil script)
- [ ] Audio plays (Tamil voice)
- [ ] Backend log: `voiceId: 'ta-IN-mock'`

### Test 4: Kannada
- [ ] Session: English → Kannada
- [ ] Student joins as Kannada
- [ ] Organizer speaks test phrase
- [ ] Text appears (Kannada script)
- [ ] Audio plays (Kannada voice)
- [ ] Backend log: `voiceId: 'kn-IN-mock'`

### Test 5: Malayalam
- [ ] Session: English → Malayalam
- [ ] Student joins as Malayalam
- [ ] Organizer speaks test phrase
- [ ] Text appears (Malayalam script)
- [ ] Audio plays (Malayalam voice)
- [ ] Backend log: `voiceId: 'ml-IN-mock'`

### Test 6: English
- [ ] Session: English → English
- [ ] Student joins as English
- [ ] Organizer speaks test phrase
- [ ] Text appears (English)
- [ ] Audio plays (English voice)
- [ ] Backend log: `voiceId: 'en-US-mock'`

**Languages Tested**: ___/6 passed

**Phase 4 Complete**: [ ] All 6 languages working

---

## 📊 PHASE 5: Performance Testing (10 min)

### Latency Measurement
Record TTS latency for 10 sentences:

| # | Latency (ms) | Target Met (<1000ms) |
|---|--------------|---------------------|
| 1 | _______ | [ ] |
| 2 | _______ | [ ] |
| 3 | _______ | [ ] |
| 4 | _______ | [ ] |
| 5 | _______ | [ ] |
| 6 | _______ | [ ] |
| 7 | _______ | [ ] |
| 8 | _______ | [ ] |
| 9 | _______ | [ ] |
| 10 | _______ | [ ] |

**Average**: _______ms

- [ ] Average latency < 1000ms (target)
- [ ] Average latency < 500ms (ideal)
- [ ] No outliers > 2000ms
- [ ] Latency consistent across samples

### Audio Sequencing
- [ ] Organizer speaks 5 numbered sentences
- [ ] Audio plays in correct order (1, 2, 3, 4, 5)
- [ ] No gaps between sentences
- [ ] No overlapping audio
- [ ] Smooth playback throughout

### Backlog Test (Optional)
- [ ] Inject 1-second delay in mock provider
- [ ] Organizer speaks rapidly (15+ sentences)
- [ ] Backend log shows queue management
- [ ] Old requests skipped
- [ ] Queue size stays ≤10
- [ ] Audio stays relatively current

**Phase 5 Complete**: [ ] Performance acceptable

---

## 🎭 PHASE 6: Multi-Student Testing (10 min)

### Setup
- [ ] Create session: English → Telugu, Hindi, Tamil
- [ ] Student A joins: Telugu
- [ ] Student B joins: Hindi
- [ ] Student C joins: Tamil
- [ ] All 3 connected
- [ ] Session started

### Simultaneous Delivery
- [ ] Organizer speaks: "Welcome everyone"
- [ ] Student A sees Telugu text
- [ ] Student A hears Telugu audio
- [ ] Student B sees Hindi text
- [ ] Student B hears Hindi audio
- [ ] Student C sees Tamil text
- [ ] Student C hears Tamil audio

### Verify Isolation
- [ ] Student A hears ONLY Telugu audio
- [ ] Student B hears ONLY Hindi audio
- [ ] Student C hears ONLY Tamil audio
- [ ] No audio cross-contamination

### Backend Verification
- [ ] Log: TTS session created for Telugu
- [ ] Log: TTS session created for Hindi
- [ ] Log: TTS session created for Tamil
- [ ] 3 independent TTS queues running

**Phase 6 Complete**: [ ] Multi-student working correctly

---

## 🔄 PHASE 7: Session Lifecycle (5 min)

### Session Start
- [ ] Create and start session
- [ ] Student receives audio
- [ ] TTS processing starts
- [ ] Backend log: "TTS session created"

### Active Session
- [ ] Organizer speaks multiple times
- [ ] Audio continues playing
- [ ] No memory leaks (check task manager)
- [ ] Stable performance

### Session Stop
- [ ] Organizer clicks "Stop Session"
- [ ] Audio stops playing
- [ ] Backend log: "TTS stopped for all languages"
- [ ] Student shows "Session Stopped"
- [ ] Clean shutdown (no errors)

### Session Restart
- [ ] Create new session
- [ ] Same settings as before
- [ ] Start session
- [ ] Audio works normally
- [ ] No interference from previous session

**Phase 7 Complete**: [ ] Lifecycle works correctly

---

## 🐛 PHASE 8: Error Handling (5 min)

### TTS Error During Session
- [ ] Session running normally
- [ ] Inject TTS error (from Phase 3)
- [ ] Verify text continues ✅
- [ ] Verify audio shows "Interrupted"
- [ ] Verify no crash

### Recovery After Error
- [ ] Remove error injection
- [ ] Organizer continues speaking
- [ ] Text works immediately ✅
- [ ] Audio resumes automatically ✅

### Network Interruption Simulation
- [ ] Pause backend briefly (Ctrl+C, restart)
- [ ] Student shows reconnecting
- [ ] Student reconnects
- [ ] Audio resumes
- [ ] Text recovery works (MODULE 7)

**Phase 8 Complete**: [ ] Error handling robust

---

## ✅ FINAL VERIFICATION

### Critical Requirements
- [ ] ⭐ Text independence verified (Phase 3)
- [ ] All 6 languages working (Phase 4)
- [ ] Latency < 1 second (Phase 5)
- [ ] Multi-student support (Phase 6)
- [ ] Session lifecycle clean (Phase 7)
- [ ] Error handling robust (Phase 8)

### System Stability
- [ ] No backend crashes
- [ ] No frontend crashes
- [ ] No disconnections
- [ ] No memory leaks
- [ ] Logs clean (no critical errors)

### User Experience
- [ ] Text appears quickly
- [ ] Audio plays smoothly
- [ ] Status indicators accurate
- [ ] Latency acceptable
- [ ] Recovery seamless

### Documentation
- [ ] Test results recorded
- [ ] Issues documented (if any)
- [ ] Latency measurements saved
- [ ] Screenshots taken (optional)

---

## 📊 TEST RESULTS SUMMARY

**Test Date**: _______________  
**Tester Name**: _______________  
**Environment**: Development / Staging / Production

### Results
| Phase | Status | Notes |
|-------|--------|-------|
| 1. Setup | [ ] PASS [ ] FAIL | |
| 2. Smoke Test | [ ] PASS [ ] FAIL | |
| 3. Text Independence ⭐ | [ ] PASS [ ] FAIL | |
| 4. Languages (___/6) | [ ] PASS [ ] FAIL | |
| 5. Performance | [ ] PASS [ ] FAIL | |
| 6. Multi-Student | [ ] PASS [ ] FAIL | |
| 7. Lifecycle | [ ] PASS [ ] FAIL | |
| 8. Error Handling | [ ] PASS [ ] FAIL | |

**Overall**: [ ] ✅ ALL TESTS PASSED [ ] ❌ SOME TESTS FAILED

### Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Recommendations
- [ ] Ready for production
- [ ] Needs fixes (see issues)
- [ ] Needs additional testing
- [ ] Needs performance optimization

---

## 🎉 COMPLETION

**If all tests passed**:
- ✅ MODULE 8 is working correctly
- ✅ Text-TTS independence verified
- ✅ Ready for next phase (staging/production)
- 📝 Document results in MODULE_8_TESTING_GUIDE.md

**If tests failed**:
- 📝 Document failures in detail
- 🐛 Create bug reports for each issue
- 🔧 Fix issues and re-test
- 📞 Contact development team if needed

---

**Testing Time**: Start: _______ End: _______ Duration: _______

**Signature**: _______________  
**Date**: _______________

---

**END OF CHECKLIST**

Save this completed checklist for documentation and future reference.
