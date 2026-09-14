# Module 2 Testing Guide

## Pre-Testing Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build Shared Package**
   ```bash
   cd packages/shared
   npm run build
   cd ../..
   ```

3. **Database Setup**
   - Ensure PostgreSQL is running
   - Database: `live_translation`
   - The updated schema will be created automatically on first run

4. **Start Application**
   ```bash
   npm run dev
   ```

## Module 2 Features to Test

### ✅ Session Creation with Title
1. Navigate to: http://localhost:3000/organizer/login
2. Login or register
3. Click "Create Session"
4. Fill in the form:
   - **Session Title**: "Advanced Physics Lecture" ✓ NEW
   - **Organizer Name**: Your name
   - **Source Language**: English
   - **Target Languages**: Select Telugu, Hindi, Tamil (Ctrl+Click)
   - **Max Students**: 100
5. Click "Create Session"
6. **Expected**: Session created with title displayed

### ✅ Session States
Test all 4 session states: CREATED, ACTIVE, STOPPED, EXPIRED

**Test CREATED State:**
1. Create a new session
2. **Expected**: Status badge shows "CREATED" (blue)
3. **Expected**: "Start Session" button is visible

**Test ACTIVE State:**
1. Click "Start Session"
2. **Expected**: Status changes to "ACTIVE" (green)
3. **Expected**: "Stop Session" button is visible
4. **Expected**: Session started notification appears

**Test STOPPED State:**
1. Click "Stop Session"
2. Confirm the action
3. **Expected**: Status changes to "STOPPED" (red)
4. **Expected**: No action buttons (session cannot be restarted)
5. **Expected**: Message: "This session has been stopped"

**Test EXPIRED State:**
- Expiration is automatic after 24 hours (default)
- To test immediately, modify `sessionExpiryHours` in .env to 0.001 (3.6 seconds)

### ✅ QR Code Generation
1. After creating a session
2. **Expected**: QR code is displayed
3. **Expected**: Session code is shown (6 digits)
4. **Expected**: "Copy Code" button works
5. **Expected**: "Copy Join Link" button works
6. Test QR code with phone camera or QR scanner

### ✅ Real-Time Student Count
1. Open session management page
2. **Expected**: Shows "Connected Students: 0 / 100"
3. Open incognito window (or another browser)
4. Join as student with the session code
5. **Expected**: Organizer sees count update to "1 / 100" in real-time
6. Open another incognito window and join
7. **Expected**: Count updates to "2 / 100"
8. Close one student window
9. **Expected**: Count updates to "1 / 100"

### ✅ Prevent Joining Stopped Sessions
1. Create and start a session
2. Join as a student (keep window open)
3. From organizer: Stop the session
4. Try to join as a new student
5. **Expected**: Error message: "Session is stopped. Cannot join."
6. **Expected**: Existing student sees "Session stopped" message

### ✅ Multiple Students Same Session
1. Create and start a session
2. Open 3-5 different browsers/incognito windows
3. Join all as different students
4. **Expected**: All can join successfully
5. **Expected**: All receive real-time updates
6. **Expected**: Organizer sees correct student count

### ✅ Session List in Dashboard
1. Create multiple sessions with different titles
2. Navigate to dashboard
3. **Expected**: All sessions listed with titles
4. **Expected**: Session codes displayed
5. **Expected**: Status badges correct colors
6. **Expected**: Can click "Manage" to open each session

### ✅ Invalid Session Code
1. Go to: http://localhost:3000/join
2. Enter invalid code: "999999"
3. **Expected**: Error message: "Invalid session code"
4. Enter valid code that's stopped
5. **Expected**: Error message about session status

### ✅ Session Expiration (Optional - requires time manipulation)
1. Set `SESSION_EXPIRY_HOURS=0.001` in backend .env (3.6 seconds)
2. Create a session
3. Wait 4 seconds
4. Try to join
5. **Expected**: Session marked as EXPIRED
6. **Expected**: Cannot join

### ✅ Session Details Display
1. Open session management page
2. **Expected**: Shows:
   - Session title ✓ NEW
   - Session code (6 digits)
   - Creation date/time
   - Organizer name
   - Source language
   - Target languages (comma-separated)
   - Connected students count (real-time) ✓ NEW
   - Status badge with correct color

### ✅ Speaker Language Configuration
1. Navigate to session creation
2. **Expected**: Source Language dropdown shows:
   - English (English)
   - Telugu (తెలుగు)
   - Hindi (हिन्दी)
   - Tamil (தமிழ்)
   - Kannada (ಕನ್ನಡ)
   - Malayalam (മലയാളം)
3. **Expected**: Data is configurable (from LANGUAGES constant)
4. **Expected**: Same languages available for target selection

### ✅ Real-Time Toast Notifications
**Organizer Side:**
1. Keep session management page open
2. Have a student join
3. **Expected**: Toast notification: "[Student name] joined"
4. Have student leave
5. **Expected**: Toast notification: "A student left"
6. Start session
7. **Expected**: Toast notification: "Session started!"
8. Stop session
9. **Expected**: Toast notification: "Session stopped"

**Student Side:**
1. Join a session
2. Organizer starts session
3. **Expected**: Toast notification: "Session started!"
4. Organizer stops session
5. **Expected**: Toast notification with stop icon

### ✅ Mobile Responsive UI
1. Open on mobile device or use browser dev tools
2. Test all pages:
   - Session creation form
   - Session management page
   - QR code display
   - Dashboard
3. **Expected**: All elements properly sized and responsive

### ✅ WebSocket Connection Status
1. Open browser dev tools → Network tab
2. Filter by "WS" (WebSocket)
3. **Expected**: WebSocket connection established
4. **Expected**: No disconnection errors
5. Disable network briefly then re-enable
6. **Expected**: Automatic reconnection

## Test Results Template

```
✅ Session creation with title
✅ Session states (CREATED, ACTIVE, STOPPED, EXPIRED)
✅ QR code generation
✅ Real-time student count updates
✅ Prevent joining stopped sessions
✅ Multiple students in same session
✅ Session list with titles
✅ Invalid session code handling
✅ Session details display
✅ Language configuration
✅ Real-time toast notifications
✅ Mobile responsive UI
✅ WebSocket connection stability
```

## Common Issues & Solutions

### Issue: "Cannot connect to database"
**Solution**: Check PostgreSQL is running and DATABASE_URL is correct

### Issue: TypeScript errors
**Solution**: 
```bash
cd packages/shared
rm -rf dist node_modules
npm install
npm run build
```

### Issue: Student count not updating
**Solution**: 
- Check WebSocket connection in browser dev tools
- Verify organizer joined session room
- Check backend logs for errors

### Issue: Session not found
**Solution**: 
- Verify session code is correct
- Check session hasn't expired
- Look for database errors in backend logs

## Performance Testing

### Load Test: 50 Students
1. Use a tool like Artillery or create multiple browser windows
2. Have 50 students join the same session
3. **Expected**: All join successfully
4. **Expected**: Organizer sees correct count (50)
5. **Expected**: No lag or disconnections

### Latency Test
1. Join as student
2. Organizer starts session
3. Measure time until student sees update
4. **Expected**: <100ms update time on good connection

## Security Testing

### Test: Cannot Join Without Code
1. Try to access `/student/session/[invalidcode]` directly
2. **Expected**: Redirected or error message

### Test: Stopped Session Protection
1. Stop a session
2. Try joining via direct URL
3. **Expected**: Error message, cannot join

### Test: Max Students Limit
1. Set max students to 2
2. Join with 2 students
3. Try joining with 3rd student
4. **Expected**: Error: "Session is full"

## Module 2 Completion Checklist

- [ ] All session states working (CREATED, ACTIVE, STOPPED, EXPIRED)
- [ ] Session title field added and displayed
- [ ] QR code generation working
- [ ] Real-time student count updates
- [ ] Cannot join stopped/expired sessions
- [ ] Multiple students can join same session
- [ ] Session validation server-side
- [ ] WebSocket real-time updates
- [ ] Mobile responsive UI
- [ ] Toast notifications working
- [ ] Language configuration as data (not hardcoded)
- [ ] Error handling for invalid sessions
- [ ] Backend properly validates all requests
- [ ] No secrets exposed in frontend
- [ ] Database schema updated
- [ ] All TypeScript types updated

## Next Steps After Module 2

Once all tests pass:
1. Document any issues found
2. Note performance metrics
3. Prepare for Module 3 (Translation Integration)
