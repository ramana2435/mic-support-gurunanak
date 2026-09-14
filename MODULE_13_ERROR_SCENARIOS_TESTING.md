# Module 13: Error Scenario Testing Guide

## Overview

This document provides testing procedures for all 13 critical failure scenarios that the system must handle gracefully.

## Testing Setup

### Prerequisites
- Backend server running
- Frontend application running
- PostgreSQL database active
- Test session created
- Multiple devices/browsers for student simulation

### Tools
- Browser DevTools (Network tab, Console)
- Postman/curl for API testing
- Network throttling tools
- Audio device management

---

## Scenario 1: Microphone Disconnected

### Description
Student's microphone is physically disconnected during session.

### Expected Behavior
- ✅ Detects microphone track ended
- ✅ Shows error message: "Microphone was disconnected"
- ✅ Provides retry button
- ✅ Text translations continue working
- ✅ Switches to text-only mode
- ✅ Audio playback still works

### Test Steps
1. Join session as student with microphone enabled
2. Physically disconnect USB microphone OR disable in browser settings
3. Verify error message appears
4. Verify text translations still display
5. Reconnect microphone
6. Click retry button
7. Verify audio resumes

### Pass Criteria
- [ ] Error detected within 2 seconds
- [ ] Clear error message shown
- [ ] Text continues without interruption
- [ ] Retry button works
- [ ] No console errors

---

## Scenario 2: Microphone Permission Denied

### Description
Student denies microphone permission in browser.

### Expected Behavior
- ✅ Permission denied error caught
- ✅ Shows error: "Microphone permission denied"
- ✅ Provides instructions to enable in browser settings
- ✅ Allows manual retry
- ✅ Text-only mode enabled
- ✅ Session continues normally

### Test Steps
1. Open fresh browser/incognito tab
2. Join session
3. Click "Block" when prompted for microphone access
4. Verify error message with instructions
5. Grant permission in browser settings
6. Click retry
7. Verify microphone works

### Pass Criteria
- [ ] Permission error caught gracefully
- [ ] Helpful instructions provided
- [ ] Session not disrupted
- [ ] Retry works after permission granted
- [ ] No app crash

---

## Scenario 3: Internet Temporarily Disconnected

### Description
Student's internet connection drops temporarily.

### Expected Behavior
- ✅ WebSocket disconnect detected
- ✅ Shows "Reconnecting..." message
- ✅ Automatic reconnection with exponential backoff
- ✅ Session state recovered
- ✅ Missed messages synced (if possible)
- ✅ Max 10 retry attempts

### Test Steps
1. Join session as student
2. Disconnect network (airplane mode, disable WiFi, or DevTools offline)
3. Wait 5 seconds
4. Reconnect network
5. Verify automatic reconnection
6. Verify session resumes

### Test Steps (Extended Disconnect)
1. Disconnect for 2 minutes
2. Observe retry attempts (should see 1s, 2s, 4s, 8s, 16s, 30s delays)
3. Verify max 10 retries
4. Verify "Failed to reconnect" after max retries

### Pass Criteria
- [ ] Disconnect detected immediately
- [ ] Reconnection UI shown
- [ ] Exponential backoff working (1s → 2s → 4s → 8s → 16s → 30s)
- [ ] Automatic reconnection on network restore
- [ ] Session state restored
- [ ] No infinite retry loop

---

## Scenario 4: STT Provider Failure

### Description
Speech-to-Text provider API fails or times out.

### Expected Behavior
- ✅ Timeout after 5 seconds
- ✅ Automatic retry (3 attempts max)
- ✅ Circuit breaker opens after 5 failures
- ✅ Text translation shows "Waiting for speech..."
- ✅ No blocking of other sessions
- ✅ Auto-recovery when provider restores

### Test Steps
1. Simulate STT failure (stop STT service or block network to provider)
2. Start speaking as organizer
3. Observe timeout and retry behavior
4. Verify circuit breaker opens after failures
5. Restore STT provider
6. Verify circuit breaker closes and STT resumes

### Pass Criteria
- [ ] Timeout at 5 seconds
- [ ] 3 retry attempts with exponential backoff
- [ ] Circuit breaker opens after 5 consecutive failures
- [ ] No blocking of pipeline
- [ ] Other sessions unaffected
- [ ] Recovery works when provider restored

---

## Scenario 5: Translation Provider Failure

### Description
Translation API fails or times out.

### Expected Behavior
- ✅ Timeout after 10 seconds
- ✅ Automatic retry (3 attempts)
- ✅ Circuit breaker protection
- ✅ Shows original text if translation unavailable
- ✅ Other languages continue working
- ✅ Text-only mode with original language

### Test Steps
1. Simulate translation failure
2. Speak as organizer
3. Verify original language text shown
4. Verify other language translations continue (if multi-language)
5. Restore translation provider
6. Verify translations resume

### Pass Criteria
- [ ] Timeout at 10 seconds
- [ ] Retries with backoff
- [ ] Fallback to original text
- [ ] Other languages unaffected
- [ ] Circuit breaker working
- [ ] Recovery automatic

---

## Scenario 6: TTS Provider Failure

### Description
Text-to-Speech provider fails or times out.

### Expected Behavior
- ✅ Timeout after 30 seconds
- ✅ CRITICAL: Text continues showing
- ✅ Audio skipped for this segment
- ✅ Next segment attempts TTS again
- ✅ Text-only mode banner shown
- ✅ User can still read translations

### Test Steps
1. Simulate TTS failure
2. Speak as organizer
3. **VERIFY: Text translations appear immediately**
4. Verify no audio plays
5. Verify text-only mode banner
6. Continue speaking
7. Verify text continues updating

### Pass Criteria
- [ ] **CRITICAL: Text never blocked by TTS failure**
- [ ] Text shows within 1-2 seconds
- [ ] Audio gracefully skipped
- [ ] Text-only mode banner shown
- [ ] Subsequent segments attempt TTS again
- [ ] No pipeline blocking

---

## Scenario 7: Student Phone Loses Connection

### Description
Mobile student loses cellular/WiFi connection.

### Expected Behavior
- ✅ Same as Scenario 3 (internet disconnect)
- ✅ Mobile-optimized reconnection UI
- ✅ Low bandwidth mode if connection poor
- ✅ Session recovery on reconnect

### Test Steps
1. Join session from mobile device
2. Switch to airplane mode
3. Wait 10 seconds
4. Disable airplane mode
5. Verify automatic reconnection
6. Verify session continues

### Pass Criteria
- [ ] Mobile UI shows reconnection state
- [ ] Automatic reconnection works
- [ ] Session state recovered
- [ ] Performance acceptable on cellular

---

## Scenario 8: Student Reconnects

### Description
Student refreshes page or reconnects after disconnect.

### Expected Behavior
- ✅ Session recovery within 5-minute window
- ✅ Language selection remembered
- ✅ Student name remembered
- ✅ Rejoins same session automatically
- ✅ Sync to current content

### Test Steps
1. Join session as student
2. Note session details
3. Close browser tab
4. Within 5 minutes, rejoin with same student ID
5. Verify automatic session recovery
6. Verify context restored

### Test Steps (Expired Recovery)
1. Join session
2. Disconnect for > 5 minutes
3. Try to rejoin
4. Verify needs to rejoin manually

### Pass Criteria
- [ ] Recovery works within 5-minute window
- [ ] Student context restored
- [ ] Language selection preserved
- [ ] Expired recovery handled gracefully
- [ ] No duplicate student entries

---

## Scenario 9: Organizer Laptop Loses Network

### Description
Organizer's network connection drops temporarily.

### Expected Behavior
- ✅ STT pauses
- ✅ Students see "Waiting for speaker..." message
- ✅ Organizer sees reconnection UI
- ✅ Automatic reconnection
- ✅ STT resumes after reconnect
- ✅ No lost students

### Test Steps
1. Start session as organizer
2. Begin speaking
3. Disconnect organizer's network
4. Verify students see waiting state
5. Reconnect organizer network
6. Verify STT resumes
7. Verify all students still connected

### Pass Criteria
- [ ] Students notified of pause
- [ ] Organizer reconnects automatically
- [ ] STT resumes correctly
- [ ] No students dropped
- [ ] Session integrity maintained

---

## Scenario 10: WebRTC Failure

### Description
WebRTC connection fails (if used for audio streaming).

### Expected Behavior
- ✅ Fallback to WebSocket audio streaming
- ✅ User notified of degraded quality (if applicable)
- ✅ Session continues without interruption

### Test Steps
1. Join session
2. Block WebRTC in browser (via extension or settings)
3. Verify fallback mechanism activates
4. Verify audio/text still works

### Pass Criteria
- [ ] WebRTC failure detected
- [ ] Fallback transport used
- [ ] Session continues normally
- [ ] Performance acceptable

---

## Scenario 11: WebSocket Failure

### Description
WebSocket connection fails or server forces disconnect.

### Expected Behavior
- ✅ Reconnection manager activates
- ✅ Exponential backoff retries
- ✅ Fallback to HTTP polling (if configured)
- ✅ Session state preserved

### Test Steps
1. Join session
2. Kill WebSocket connection (server restart or network block)
3. Verify reconnection attempts
4. Verify session recovers
5. Test with prolonged failure

### Pass Criteria
- [ ] WebSocket disconnect detected
- [ ] Reconnection with backoff
- [ ] Max retries enforced
- [ ] State preserved across reconnect
- [ ] No infinite loops

---

## Scenario 12: Server Restart

### Description
Backend server restarts during active session.

### Expected Behavior
- ✅ All students disconnected
- ✅ Automatic reconnection attempts
- ✅ Session data restored from database
- ✅ Students rejoin automatically (within recovery window)
- ✅ Organizer can resume session

### Test Steps
1. Start active session with multiple students
2. Restart backend server (`pm2 restart` or equivalent)
3. Observe client reconnection behavior
4. Verify session can be resumed
5. Verify students can rejoin

### Pass Criteria
- [ ] Server restarts cleanly
- [ ] Students attempt reconnection
- [ ] Session data persists in database
- [ ] Students can rejoin within 5 minutes
- [ ] Organizer can resume

---

## Scenario 13: Session Expiration

### Description
Session expires (time limit or manual end).

### Expected Behavior
- ✅ Students notified of expiration
- ✅ Clear message: "Session ended"
- ✅ No reconnection attempts
- ✅ Graceful disconnect
- ✅ Data archived

### Test Steps
1. Create session with short expiration (or manually end)
2. Wait for expiration
3. Verify students notified
4. Verify no reconnection loops
5. Verify session marked as expired in database

### Pass Criteria
- [ ] Expiration detected
- [ ] Clear notification to students
- [ ] No reconnection attempts
- [ ] Graceful cleanup
- [ ] Database updated correctly

---

## Critical Test: Text Continues When Audio Fails

### Description
**CRITICAL REQUIREMENT**: Text translations must continue even when audio pipeline fails.

### Test Steps
1. Join session as student
2. Simulate TTS provider failure (or circuit breaker open)
3. Organizer speaks
4. **VERIFY: Text appears immediately (<2s)**
5. **VERIFY: No audio plays (expected)**
6. **VERIFY: Text-only mode banner shown**
7. Continue speaking for 30 seconds
8. **VERIFY: Text continues updating in real-time**

### Pass Criteria
- [x] **Text appears within 2 seconds of STT result**
- [x] **Text never waits for audio**
- [x] **Text-only mode clearly indicated**
- [x] **User can read translations in real-time**
- [x] **Pipeline does not block**

---

## Isolation Test: One Student Failure Doesn't Affect Others

### Test Steps
1. Have 3 students join session (A, B, C)
2. Cause failure for Student A (disconnect, error, etc.)
3. **VERIFY: Students B and C unaffected**
4. **VERIFY: Translations continue for B and C**
5. **VERIFY: No errors in B or C consoles**
6. Student A reconnects
7. **VERIFY: A rejoins without affecting B and C**

### Pass Criteria
- [ ] Errors isolated per connection
- [ ] Healthy connections unaffected
- [ ] Broadcasts continue to healthy clients
- [ ] No cascade failures
- [ ] Connection manager tracks errors per student

---

## Summary Checklist

Before marking Module 13 complete, verify:

- [ ] All 13 scenarios tested
- [ ] **Text-only fallback working (CRITICAL)**
- [ ] Exponential backoff implemented
- [ ] Circuit breakers functional
- [ ] No infinite retry loops
- [ ] Session recovery working
- [ ] Error isolation confirmed
- [ ] Max retries enforced
- [ ] Graceful degradation in all cases
- [ ] Clear error messages to users
- [ ] No console errors in happy path
- [ ] Mobile testing completed
- [ ] Multi-student isolation verified

---

## Logging During Testing

Monitor logs for:

```bash
# Backend logs
tail -f apps/backend/logs/app.log | grep -E "(ERROR|WARN|Reconnection|Circuit|degradation)"

# Look for:
# - Circuit breaker state changes
# - Reconnection attempts
# - Error isolation
# - Health status changes
```

## Performance Requirements

- Text delivery: < 2 seconds (even with audio failure)
- Reconnection attempts: Max 10
- Circuit breaker recovery: Automatic within 60 seconds
- Session recovery window: 5 minutes
- No memory leaks from failed connections

---

**Module 13 Status**: Testing framework ready, awaiting full scenario validation
