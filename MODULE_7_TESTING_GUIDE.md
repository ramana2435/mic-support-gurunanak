# MODULE 7: Real-Time Text Channel - Testing Guide

## 🎯 Testing Overview

This guide provides step-by-step instructions for testing MODULE 7 (Real-Time Text Channel) to verify all critical features work correctly.

---

## ⚙️ Prerequisites

### Backend Setup
```bash
cd apps/backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd apps/frontend
npm install
npm run dev
```

### Database
Ensure PostgreSQL is running with the application schema.

---

## 🧪 Test Scenarios

### Test 1: Single Student - Normal Flow ⭐ START HERE

**Goal**: Verify basic text delivery works

**Steps**:
1. **Organizer**:
   - Create a new session (English source, Telugu target)
   - Start the session
   - Start STT (microphone capture)
   - Speak into microphone: "Hello, how are you?"

2. **Student**:
   - Join session with Telugu language
   - Observe translation display

**Expected Results**:
- ✅ Student sees Telugu translation appear in real-time
- ✅ Text appears within 200ms of speaking
- ✅ Sequence number visible in console
- ✅ Connection status shows "Connected"
- ✅ Text latency displayed (e.g., "Text: 85ms")

**Verification**:
```javascript
// Open browser console on student device
// Should see logs like:
// "Received translation: seq 1"
// "Text delivery latency: 75ms"
```

---

### Test 2: Five Students - Multiple Languages

**Goal**: Verify language-specific routing

**Steps**:
1. **Organizer**:
   - Create session (English source, Telugu + Hindi + Tamil targets)
   - Start session and STT

2. **Students** (open 5 browser tabs/devices):
   - Student A: Telugu
   - Student B: Telugu
   - Student C: Hindi
   - Student D: Hindi
   - Student E: Tamil

3. **Organizer**: Speak "Welcome to the session"

**Expected Results**:
- ✅ Students A & B: Both see same Telugu translation
- ✅ Students C & D: Both see same Hindi translation
- ✅ Student E: Sees Tamil translation
- ✅ No cross-language contamination
- ✅ All 5 students receive text simultaneously

**Verification**:
- Check that Telugu students see identical text
- Check that Hindi students see identical text
- Verify translations are different across languages

---

### Test 3: Reconnection Recovery ⭐ CRITICAL TEST

**Goal**: Verify missed message recovery works

**Steps**:
1. **Setup**:
   - Organizer creates session and starts STT
   - Student joins (Telugu)

2. **Establish Baseline**:
   - Organizer speaks 5 sentences
   - Student receives all 5 (seq 1-5)
   - Note lastReceivedSequence in console

3. **Simulate Disconnection**:
   - Student: Open browser DevTools → Network tab
   - Student: Set Network throttling to "Offline"
   - Wait 5 seconds (student shows "Disconnected" / "Reconnecting")

4. **Speak While Disconnected**:
   - Organizer speaks 5 more sentences (seq 6-10 generated)
   - Student: Still offline, doesn't receive these

5. **Reconnect**:
   - Student: Set Network back to "Online"
   - Socket.IO automatically reconnects

**Expected Results**:
- ✅ Student shows "Reconnected!" toast
- ✅ Student shows "Recovered 5 missed messages" toast
- ✅ Student display now shows all 10 sentences (seq 1-10)
- ✅ No gaps in sequence
- ✅ Correct order maintained

**Verification**:
```javascript
// In student browser console, check:
console.log('Received sequences:', receivedSequences)
// Should see: Set {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

console.log('Last received:', lastReceivedSequence)
// Should see: 10
```

**Backend Verification**:
```
// Check backend logs:
"Text recovery requested { studentId, lastReceivedSequence: 5 }"
"Retrieved missed messages { missedCount: 5 }"
"Text recovery sent { recoveredCount: 5 }"
```

---

### Test 4: Network Interruption (Real-World Scenario)

**Goal**: Verify recovery works with actual network issues

**Steps**:
1. **Mobile Device Test** (Recommended):
   - Student joins session on mobile phone
   - Organizer speaks 3 sentences → student receives (seq 1-3)
   - Student: Disable WiFi on phone (30 seconds)
   - Organizer continues speaking (seq 4-8)
   - Student: Re-enable WiFi

**Expected Results**:
- ✅ Automatic reconnection
- ✅ Seq 4-8 recovered automatically
- ✅ Student sees all 8 sentences in order
- ✅ Recovery happens within 1-2 seconds of reconnect

**Alternative (Desktop)**:
- Use browser DevTools Network tab
- Throttle to "Offline" for 30 seconds
- Then back to "Online"

---

### Test 5: Duplicate Event Prevention

**Goal**: Verify duplicates are detected and skipped

**Steps**:
1. **Setup**:
   - Organizer and student connected
   - Open browser console on student device

2. **Manual Duplicate Injection**:
   ```javascript
   // In student browser console
   const socket = getSocket()
   
   // Simulate receiving same message twice
   const testPayload = {
     sessionId: 'YOUR_SESSION_ID',
     text: 'Test message',
     translatedText: 'పరీక్ష సందేశం',
     sourceLanguage: 'en',
     targetLanguage: 'te',
     sequenceNumber: 999,
     timestamp: new Date(),
     isFinal: true,
     confidence: 0.9
   }
   
   // Send twice
   socket.emit('translation:final', testPayload)
   setTimeout(() => socket.emit('translation:final', testPayload), 100)
   ```

**Expected Results**:
- ✅ First message: Processed and displayed
- ✅ Second message: Console log shows "Duplicate message detected: 999"
- ✅ UI shows seq 999 only ONCE
- ✅ receivedSequences contains 999

**Verification**:
```javascript
// Check in console
console.log(receivedSequences.has(999))
// Should be: true

// Count occurrences in UI
const segments = translationSegments.filter(s => s.id.includes('999'))
console.log('Segments with seq 999:', segments.length)
// Should be: 1
```

---

### Test 6: Out-of-Order Event Handling

**Goal**: Verify messages display in correct order even if received out-of-order

**Steps**:
1. **Setup**:
   - Organizer and student connected
   - Open student browser console

2. **Manual Out-of-Order Injection**:
   ```javascript
   // In student console
   const socket = getSocket()
   
   const createPayload = (seq, text) => ({
     sessionId: 'YOUR_SESSION_ID',
     text: `Message ${seq}`,
     translatedText: text,
     sourceLanguage: 'en',
     targetLanguage: 'te',
     sequenceNumber: seq,
     timestamp: new Date(),
     isFinal: true,
     confidence: 0.9
   })
   
   // Send in wrong order: 102, 100, 101
   socket.emit('translation:final', createPayload(102, 'మూడవది'))
   setTimeout(() => socket.emit('translation:final', createPayload(100, 'మొదటిది')), 100)
   setTimeout(() => socket.emit('translation:final', createPayload(101, 'రెండవది')), 200)
   ```

**Expected Results**:
- ✅ After all 3 received, UI displays in order: 100, 101, 102
- ✅ No visual jumping or reordering
- ✅ Sort function maintains correct sequence

**Verification**:
```javascript
// Check display order in UI
const displayedSeqs = translationSegments.map(s => parseInt(s.id.split('-')[1]))
console.log('Display order:', displayedSeqs)
// Should include: [..., 100, 101, 102, ...]
```

---

### Test 7: Long Disconnection (>5 minutes)

**Goal**: Verify grace period and recovery limits

**Steps**:
1. **Setup**:
   - Organizer and student connected
   - Student receives seq 1-3

2. **Long Disconnection**:
   - Student: Go offline (Network DevTools → Offline)
   - Wait 10 minutes ⏱️
   - Organizer continues speaking (seq 4-10 generated)

3. **Reconnect**:
   - Student: Go back online
   - Observe recovery attempt

**Expected Results**:
- ✅ Student reconnects automatically
- ✅ Recovery request sent (lastReceivedSequence: 3)
- ✅ Backend: Student tracking may be cleared (>5 min grace)
- ✅ If messages still in buffer (<1 hour): Seq 4-10 recovered
- ✅ If >1 hour: Some messages may be lost (acceptable)

**Note**: This tests the limits of the recovery system. Some message loss after extreme disconnections is acceptable per requirements.

---

### Test 8: Text Latency Measurement

**Goal**: Measure and verify text delivery latency

**Steps**:
1. **Setup**:
   - Organizer and student on same network
   - Open student browser console

2. **Measure Latency**:
   - Organizer speaks clearly
   - Student: Note latency display in UI
   - Student console: Check detailed logs

**Expected Results**:
- ✅ Same network: 10-50ms typical
- ✅ Mobile network: 50-200ms typical
- ✅ Always under 500ms (acceptable maximum)

**Verification**:
```javascript
// In student console
// Should see logs like:
"Text delivery latency: 45ms"
"Translation latency: 75ms"
"Total latency: 165ms"
```

**UI Verification**:
- Look for latency indicator in student UI
- Should show: "📊 Text: XXms"

---

### Test 9: Concurrent Students (Load Test)

**Goal**: Verify system handles multiple students

**Setup**:
- Open 20 browser tabs (10 Telugu, 10 Hindi)
- All join same session

**Test**:
- Organizer speaks continuously for 2 minutes
- Monitor all student tabs

**Expected Results**:
- ✅ All 20 students receive all messages
- ✅ No missing messages
- ✅ No significant latency increase
- ✅ Telugu students see identical text
- ✅ Hindi students see identical text

**Monitoring**:
```bash
# Backend console should show
"Translation broadcast { sessionId, targetLanguage: 'te', sequenceNumber: 1 }"
"Translation broadcast { sessionId, targetLanguage: 'hi', sequenceNumber: 1 }"
# Only 2 broadcasts per message (not 20!)
```

---

### Test 10: Text Channel Independence (Critical)

**Goal**: Verify text works even if audio/TTS fails

**Setup**:
- Block audio in browser settings
- Disable speakers/headphones

**Test**:
- Organizer speaks
- Student should still receive TEXT

**Expected Results**:
- ✅ Text appears in UI regardless of audio state
- ✅ No errors related to audio failure
- ✅ Translation display works normally
- ✅ **TEXT CHANNEL IS INDEPENDENT** ✅

**Verification**:
- Text appears: ✅ Pass
- No audio: Expected (TTS not yet implemented)
- Text continues working: ✅ Critical requirement met

---

## 🔍 Debugging

### Student Console Debugging
```javascript
// Check connection status
console.log('Connected:', connected)
console.log('Reconnecting:', reconnecting)

// Check sequence tracking
console.log('Last received:', lastReceivedSequence)
console.log('Received sequences:', Array.from(receivedSequences))

// Check segments
console.log('Translation segments:', translationSegments.length)
console.log('Segments:', translationSegments.map(s => ({
  id: s.id,
  text: s.translatedText.substring(0, 30)
})))

// Force recovery request
const socket = getSocket()
socket.emit('text:recovery:request', {
  sessionId: 'YOUR_SESSION_ID',
  studentId: 'YOUR_STUDENT_ID',
  targetLanguage: 'te',
  lastReceivedSequence: 0
})
```

### Backend Console Debugging
```bash
# Check buffer stats
# Add to your code or create admin endpoint:
console.log(textChannelService.getBufferStats())
# { totalBuffers: 3, totalMessages: 45, trackedStudents: 5 }

# Check specific buffer
# Look for logs:
"Message stored in buffer { sessionId, targetLanguage, sequenceNumber, bufferSize }"
"Retrieved missed messages { missedCount: 5 }"
```

### Network Tab Debugging
1. Open DevTools → Network tab
2. Filter by "ws" (WebSocket)
3. Click on Socket.IO connection
4. View "Messages" tab
5. Watch for:
   - `translation:final` events
   - `text:recovery:request` events
   - `text:recovery:response` events
   - `text:sync:ack` events

---

## ✅ Test Results Checklist

After running all tests, verify:

- [ ] **Test 1**: Normal flow works (single student)
- [ ] **Test 2**: Multiple languages routed correctly
- [ ] **Test 3**: Reconnection recovery works
- [ ] **Test 4**: Real network interruption handled
- [ ] **Test 5**: Duplicates prevented
- [ ] **Test 6**: Out-of-order handled
- [ ] **Test 7**: Long disconnection graceful
- [ ] **Test 8**: Latency under 200ms typical
- [ ] **Test 9**: 20+ students supported
- [ ] **Test 10**: Text independent of audio ✅ CRITICAL

---

## 🐛 Common Issues & Solutions

### Issue: Recovery not triggered
**Symptom**: Student reconnects but doesn't request recovery  
**Solution**: Check `reconnectAttemptRef` - must be > 0 after first connect  
**Debug**: `console.log('Reconnect attempt:', reconnectAttemptRef.current)`

### Issue: Duplicates not prevented
**Symptom**: Same message appears twice in UI  
**Solution**: Check `receivedSequences` set is working  
**Debug**: `console.log('Sequences:', receivedSequences)`

### Issue: Out-of-order not fixed
**Symptom**: Messages display in wrong order  
**Solution**: Check sort function in `handleTranslationMessage`  
**Debug**: Check sequence number parsing

### Issue: Recovery returns empty
**Symptom**: Missed messages not recovered  
**Solution**: Check backend buffer hasn't expired (1 hour limit)  
**Debug**: Check backend logs for "Retrieved missed messages"

### Issue: High latency
**Symptom**: Text delivery >500ms  
**Solution**: Check network, server load, or buffer size  
**Debug**: Check both STT and translation latency separately

---

## 📊 Performance Targets

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| Text delivery latency | <100ms | <200ms | >500ms |
| Recovery response time | <500ms | <1s | >2s |
| Duplicate detection | <1ms | <5ms | >10ms |
| Out-of-order sort | <1ms | <5ms | >10ms |
| Buffer memory | <100KB | <1MB | >10MB |
| Recovery success rate | >99% | >95% | <90% |

---

## 🎉 Success Criteria

MODULE 7 passes if:
- ✅ All 10 tests pass
- ✅ No permanent message loss (within 1 hour window)
- ✅ No duplicate messages in UI
- ✅ Messages always in correct order
- ✅ Text works independently of audio
- ✅ Latency under 200ms typical
- ✅ Recovery works after network interruption
- ✅ Graceful behavior at system limits

**When all criteria met: MODULE 7 is COMPLETE and production-ready! 🚀**
