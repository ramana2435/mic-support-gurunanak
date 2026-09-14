# MODULE 3 - TESTING GUIDE

## Quick 10-Minute Test

### Prerequisites
- Backend running on http://localhost:3001
- Frontend running on http://localhost:3000
- PostgreSQL database running
- At least one organizer account created

---

## Test 1: Enhanced Join Page (3 minutes)

### Step 1: Create a Test Session
1. Navigate to http://localhost:3000/organizer/login
2. Login as organizer
3. Click "Create Session"
4. Fill in:
   - **Title**: "Test Physics Lecture"
   - **Speaker Language**: English
   - **Target Languages**: Select Telugu, Hindi, Tamil (hold Ctrl/Cmd)
5. Click "Create Session"
6. **Copy the 6-digit session code** (e.g., 123456)

### Step 2: Test Join Page with Session Info
1. Open new browser tab/incognito window
2. Navigate to: `http://localhost:3000/join?code=123456` (use your actual code)
3. **✓ Verify**: Session code auto-populated in input
4. **✓ Verify**: "Session verified!" message appears with green checkmark
5. **✓ Verify**: Session information card appears showing:
   - Session title: "Test Physics Lecture"
   - Organizer name
   - Status badge (blue "CREATED")
   - Speaker Language: English
   - Available Languages: Telugu, Hindi, Tamil chips

### Step 3: Test Language Selector
1. **✓ Verify**: Name field now visible
2. **✓ Verify**: Language dropdown shows ONLY Telugu, Hindi, Tamil (not all 6)
3. **✓ Verify**: Each language shows native script (తెలుగు, हिन्दी, தமிழ்)
4. Enter name: "Test Student" (optional)
5. Select language: Telugu
6. **✓ Verify**: "Before you join" instructions visible
7. **✓ Verify**: "Join Session" button is enabled

### Step 4: Test Invalid Session
1. Open new tab: http://localhost:3000/join
2. Enter code: "000000"
3. **✓ Verify**: Red error message "Invalid session code"
4. **✓ Verify**: No session info card appears
5. **✓ Verify**: Join button remains disabled

**Test 1 Result**: ✅ Join page enhancements working

---

## Test 2: Enhanced Student Session Page (4 minutes)

### Step 1: Join Session Successfully
1. Use the join page from Test 1 (valid session)
2. Select Telugu language
3. Click "Join Session"
4. **✓ Verify**: Redirected to `/student/session/123456`
5. **✓ Verify**: Page loads successfully

### Step 2: Verify Header
1. **✓ Verify**: Header shows session title "Test Physics Lecture"
2. **✓ Verify**: Blue pulsing dot indicator visible
3. **✓ Verify**: Connection status shows "Connected"
4. **✓ Verify**: Session code visible: "Code: 123456"
5. **✓ Verify**: "Leave" button visible

### Step 3: Verify Session Info Card
1. **✓ Verify**: Card shows "Organizer Name's Session"
2. **✓ Verify**: Speaker language: "English (English)"
3. **✓ Verify**: Your language: "Telugu (తెలుగు)" in blue/primary color
4. **✓ Verify**: Connection status indicator shows "● Connected" in green
5. **✓ Verify**: Audio status shows "🔊 Audio Ready" or "🔄 Audio Connecting..."

### Step 4: Verify Live Translation Area
1. **✓ Verify**: Large card with "Live Translation" header
2. **✓ Verify**: Since session is CREATED, should show:
   - Blue circular icon with clock
   - "Waiting for Session to Start" heading
   - Subtitle: "The organizer will start the session soon..."
3. **✓ Verify**: Area has light gray background with good padding

### Step 5: Verify Instructions Card
1. Scroll down
2. **✓ Verify**: Blue gradient instructions card visible
3. **✓ Verify**: Contains 4 bullet points with checkmark icons
4. **✓ Verify**: Mentions Bluetooth earbuds

**Test 2 Result**: ✅ Student session page working

---

## Test 3: Session State Changes (2 minutes)

### Step 1: Start Session
1. Go back to organizer dashboard (keep student page open)
2. Navigate to session management page
3. Click "Start Session"
4. **✓ Verify**: Status changes to ACTIVE (green)
5. Switch to student tab
6. **✓ Verify**: Toast notification "Session started!" appears
7. **✓ Verify**: Translation area now shows:
   - Green microphone icon
   - "Session is Active" heading
   - "Live translation will appear here..." text
   - Small note about "Translation Module (Phase 4)"
8. **✓ Verify**: Audio status changed to "🔊 Audio Ready"

### Step 2: Stop Session
1. Switch to organizer tab
2. Click "Stop Session"
3. **✓ Verify**: Confirmation dialog appears
4. Confirm stop
5. Switch to student tab
6. **✓ Verify**: Toast notification "Session stopped by organizer" appears
7. **✓ Verify**: Translation area now shows:
   - Red X icon
   - "Session Stopped" heading
   - "This session has been stopped..." text
8. **✓ Verify**: Audio status changed to "🔇 Audio Disconnected"

**Test 3 Result**: ✅ Real-time updates working

---

## Test 4: Cannot Join Stopped Session (1 minute)

### Step 1: Try Joining Stopped Session
1. Open new incognito window
2. Navigate to: `http://localhost:3000/join?code=123456`
3. **✓ Verify**: Error message appears:
   - "This session has been stopped and cannot be joined"
4. **✓ Verify**: Session info card does NOT appear
5. **✓ Verify**: Name and language fields do NOT appear
6. **✓ Verify**: Join button remains disabled

**Test 4 Result**: ✅ Join prevention working

---

## Test 5: Mobile Responsiveness (2 minutes)

### Step 1: Test Join Page on Mobile
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Navigate to join page with valid code
5. **✓ Verify**: All elements visible without horizontal scroll
6. **✓ Verify**: Session info card stacks properly
7. **✓ Verify**: Language chips wrap nicely
8. **✓ Verify**: Text is readable
9. **✓ Verify**: Join button is tappable (large enough)

### Step 2: Test Student Session on Mobile
1. Still in mobile view, join the session
2. **✓ Verify**: Header elements don't overlap
3. **✓ Verify**: Session info card grid becomes 1 column
4. **✓ Verify**: Status indicators visible
5. **✓ Verify**: Translation area has good height
6. **✓ Verify**: Instructions card readable
7. **✓ Verify**: No content cutoff
8. **✓ Verify**: Buttons are touch-friendly

**Test 5 Result**: ✅ Mobile UI working

---

## Test 6: Multiple Students (1 minute)

### Step 1: Create New Active Session
1. Login as organizer
2. Create new session
3. Start it immediately
4. Note the code

### Step 2: Join as Multiple Students
1. **Student 1**: Browser 1, join with Telugu
2. **Student 2**: Browser 2/Incognito, join with Hindi
3. **Student 3**: Mobile device or DevTools mobile, join with Tamil
4. **✓ Verify**: All 3 students connect successfully
5. **✓ Verify**: Organizer dashboard shows "Connected Students: 3"
6. **✓ Verify**: Each student sees their selected language
7. **✓ Verify**: Stop session propagates to all students

**Test 6 Result**: ✅ Multiple students working

---

## Test 7: Reconnection (1 minute)

### Step 1: Test Network Disconnect
1. Join session as student
2. Open DevTools → Network tab
3. Click "Offline" checkbox
4. **✓ Verify**: Connection status changes to "Reconnecting..." (yellow)
5. **✓ Verify**: Toast: "Disconnected from session. Reconnecting..."
6. Uncheck "Offline"
7. **✓ Verify**: Toast: "Reconnected!"
8. **✓ Verify**: Connection status back to "Connected" (green)
9. **✓ Verify**: Session continues normally

### Step 2: Test Page Refresh
1. While in active session, press F5 (refresh)
2. **✓ Verify**: Page reloads
3. **✓ Verify**: Session data preserved
4. **✓ Verify**: Reconnects to WebSocket automatically
5. **✓ Verify**: Session state maintained

**Test 7 Result**: ✅ Reconnection working

---

## Expected Results Summary

### ✅ All Tests Passing:
- Join page shows session information
- Language selector only shows available languages
- Cannot join stopped/expired sessions
- Student session page shows all status indicators
- Real-time updates propagate correctly
- Mobile layout is responsive
- Multiple students can join
- Reconnection works smoothly

### 🎯 Success Criteria:
- No JavaScript errors in console
- All visual elements render correctly
- WebSocket connection stable
- Real-time events propagate
- Mobile UI looks professional
- Error states handled gracefully

---

## Common Issues & Solutions

### Issue: Session info not appearing on join page
**Check**: Backend is running, session exists and is not expired

### Issue: Cannot join valid session
**Check**: Session status is CREATED or ACTIVE (not STOPPED/EXPIRED)

### Issue: WebSocket not connecting
**Check**: Backend .env CORS_ORIGIN matches frontend URL

### Issue: Reconnection fails
**Check**: Browser console for WebSocket errors

### Issue: Mobile layout broken
**Check**: Clear cache, use DevTools device toolbar

### Issue: Language dropdown empty
**Check**: Session has targetLanguages configured

---

## Module 3 Complete! ✅

If all tests pass:
- ✅ Enhanced join experience implemented
- ✅ Session information display working
- ✅ Live translation screen ready (placeholder)
- ✅ Connection/audio status indicators functional
- ✅ Mobile responsive
- ✅ Error states handled
- ✅ Ready for Phase 4 (actual translation)

**Report any failing tests for debugging!**
