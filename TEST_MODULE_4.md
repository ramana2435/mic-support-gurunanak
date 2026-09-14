# MODULE 4 - TESTING GUIDE

## Microphone Capture System Testing

### Prerequisites
- Backend running on http://localhost:3001
- Frontend running on http://localhost:3000
- At least one microphone available (built-in or external)
- Chrome/Edge browser (for best Web Audio API support)

---

## Test 1: Basic Microphone Setup (5 minutes)

### Step 1: Navigate to Session
1. Login as organizer: http://localhost:3000/organizer/login
2. Create a new session or open existing session
3. Click on session to go to management page
4. **✓ Verify**: Microphone Setup card is visible on left side

### Step 2: Request Permission
1. **✓ Verify**: "Microphone Access Required" screen shows
2. **✓ Verify**: Microphone icon displayed
3. **✓ Verify**: Clear explanation text
4. Click "Grant Microphone Permission"
5. **✓ Verify**: Browser permission dialog appears
6. Click "Allow" in browser dialog
7. **✓ Verify**: Permission granted
8. **✓ Verify**: Device dropdown appears with at least one device

### Step 3: Test Built-in Microphone
1. **✓ Verify**: Dropdown shows device (e.g., "Built-in Microphone")
2. **✓ Verify**: Status indicators show:
   - Status: 🟢 Connected
   - Permission: 🟢 Granted
   - Audio: ⚪ Stopped
3. Click "Test Microphone" button
4. **✓ Verify**: Button changes to "Stop"
5. **✓ Verify**: Audio status changes to "🟢 Capturing"
6. Speak into microphone
7. **✓ Verify**: Level meter bars fill up (green)
8. **✓ Verify**: Percentage shows (e.g., 45%, 70%)
9. Stop speaking
10. **✓ Verify**: Bars drop back down
11. Click "Stop" button
12. **✓ Verify**: Capture stops
13. **✓ Verify**: Audio status: ⚪ Stopped
14. **✓ Verify**: Level meter at 0%

**Test 1 Result**: ✅ Basic microphone setup working

---

## Test 2: USB Wireless Receiver (5 minutes)

### Step 1: Connect USB Device
1. Connect USB wireless receiver to laptop
2. Wait 2-3 seconds for system recognition
3. **✓ Verify**: Device appears in dropdown automatically
4. **✓ Verify**: Device label shows (e.g., "USB Audio Device" or specific receiver name)

### Step 2: Select USB Device
1. Open device dropdown
2. **✓ Verify**: Multiple devices listed (built-in + USB)
3. Select "USB Wireless Receiver" (or similar name)
4. **✓ Verify**: Device selected in dropdown
5. **✓ Verify**: Status: 🟢 Connected

### Step 3: Test Wireless Microphone
1. Click "Test Microphone"
2. **✓ Verify**: Capture starts
3. Speak into wireless microphone (not laptop mic!)
4. **✓ Verify**: Level meter responds to wireless mic input
5. **✓ Verify**: Bars move when speaking into wireless mic
6. **✓ Verify**: Bars stay low when not speaking
7. Test different volumes (whisper, normal, loud)
8. **✓ Verify**: Level meter responds appropriately
9. **✓ Verify**: Green bars at normal volume
10. **✓ Verify**: Yellow/red bars at high volume

### Step 4: Verify Correct Device
1. While wireless mic is capturing
2. Speak into laptop's built-in microphone
3. **✓ Verify**: Level meter does NOT respond to laptop mic
4. Speak into wireless microphone
5. **✓ Verify**: Level meter DOES respond to wireless mic
6. **✓ Verify**: This confirms USB receiver is actually being used

**Test 2 Result**: ✅ USB wireless receiver working correctly

---

## Test 3: Device Switching (3 minutes)

### Step 1: Switch Between Devices
1. Start capture with built-in microphone
2. **✓ Verify**: Capturing with built-in mic
3. Click "Stop"
4. **✓ Verify**: Dropdown becomes enabled
5. Select USB device from dropdown
6. Click "Test Microphone"
7. **✓ Verify**: Capturing with USB device
8. Speak into wireless mic
9. **✓ Verify**: Level responds
10. Stop capture

### Step 2: Verify Dropdown Disabled During Capture
1. Start capture with any device
2. **✓ Verify**: Dropdown is disabled
3. **✓ Verify**: Message: "Stop capture to change device"
4. Stop capture
5. **✓ Verify**: Dropdown is enabled again

**Test 3 Result**: ✅ Device switching working

---

## Test 4: Permission Denial (2 minutes)

### Step 1: Deny Permission (New Session)
1. Open new incognito window (to reset permissions)
2. Login as organizer
3. Navigate to session management
4. Click "Grant Microphone Permission"
5. Click "Block" in browser dialog
6. **✓ Verify**: Permission denied screen appears
7. **✓ Verify**: Red X icon shown
8. **✓ Verify**: Error message clear
9. **✓ Verify**: Instructions on how to enable shown
10. **✓ Verify**: "Try Again" button visible

### Step 2: Enable and Retry
1. Click lock icon in browser address bar
2. Find "Microphone" setting
3. Change to "Allow"
4. Refresh page or click "Try Again"
5. Browser may ask for permission again - click "Allow"
6. **✓ Verify**: Devices now appear
7. **✓ Verify**: Can start capture

**Test 4 Result**: ✅ Permission denial handled correctly

---

## Test 5: Device Disconnection (3 minutes)

### Step 1: Disconnect During Capture
1. Start capture with USB device
2. **✓ Verify**: Capturing, level meter working
3. While capturing, unplug USB device
4. **✓ Verify**: Capture stops automatically
5. **✓ Verify**: Error message appears: "Selected microphone was disconnected."
6. **✓ Verify**: Device list updates (USB device removed)
7. **✓ Verify**: Status shows 🔴 Disconnected or switches to available device

### Step 2: Recover After Disconnection
1. After USB device disconnected
2. **✓ Verify**: Built-in mic still available in dropdown
3. Select built-in mic
4. Click "Test Microphone"
5. **✓ Verify**: Capture works with built-in mic
6. Stop capture

**Test 5 Result**: ✅ Device disconnection handled gracefully

---

## Test 6: Device Reconnection (2 minutes)

### Step 1: Reconnect Device
1. With USB device unplugged
2. Plug USB device back in
3. Wait 2-3 seconds
4. **✓ Verify**: Device automatically appears in dropdown
5. **✓ Verify**: No page refresh needed

### Step 2: Use Reconnected Device
1. Select the reconnected USB device
2. Click "Test Microphone"
3. Speak into wireless mic
4. **✓ Verify**: Capture works
5. **✓ Verify**: Level meter responds

**Test 6 Result**: ✅ Device reconnection working

---

## Test 7: No Microphone Available (2 minutes)

### Step 1: Simulate No Devices (if possible)
1. Disconnect all external microphones
2. If on desktop without built-in mic, this test is natural
3. If on laptop, this test may be hard to simulate
4. Alternative: Check UI design in code review

### Expected Behavior:
- **✓ Should show**: "No Microphone Input Detected"
- **✓ Should show**: Warning icon
- **✓ Should show**: "Please connect a microphone and refresh"

**Test 7 Result**: ✅ No devices state handled

---

## Test 8: Multiple Students Connected (2 minutes)

### Step 1: Microphone with Active Session
1. Start session (don't stop it)
2. Have 2-3 students join (multiple browsers/devices)
3. **✓ Verify**: Connected Students card shows correct count
4. Setup microphone
5. Start capture
6. **✓ Verify**: Capture works normally with students connected
7. **✓ Verify**: No errors in browser console

**Test 8 Result**: ✅ Microphone works with students connected

---

## Test 9: Session Lifecycle (3 minutes)

### Step 1: Microphone Through Session States
1. Create session (CREATED state)
2. Start microphone capture
3. **✓ Verify**: Capture works in CREATED state
4. Start session (ACTIVE state)
5. **✓ Verify**: Microphone continues capturing
6. **✓ Verify**: No interruption
7. Stop session (STOPPED state)
8. **✓ Verify**: Microphone still works
9. Navigate away from page
10. **✓ Verify**: No errors in console

### Step 2: Cleanup on Navigation
1. Start microphone capture
2. Click "Back to Dashboard"
3. **✓ Verify**: No errors in console
4. **✓ Verify**: Capture cleaned up properly

**Test 9 Result**: ✅ Session lifecycle handled correctly

---

## Test 10: Browser Refresh (2 minutes)

### Step 1: Refresh During Capture
1. Start microphone capture
2. Press F5 (refresh page)
3. **✓ Verify**: Page reloads
4. **✓ Verify**: No errors in console
5. **✓ Verify**: Microphone setup card appears
6. **✓ Verify**: Permission still granted (or needs re-grant)
7. Select device again
8. Start capture
9. **✓ Verify**: Works after refresh

**Test 10 Result**: ✅ Refresh handled correctly

---

## Test 11: Audio Level Accuracy (3 minutes)

### Step 1: Test Different Volume Levels
1. Start capture
2. Whisper into microphone
3. **✓ Verify**: Level meter shows low level (10-30%)
4. **✓ Verify**: Green bars only
5. Speak at normal volume
6. **✓ Verify**: Level meter shows medium level (40-70%)
7. **✓ Verify**: Green bars
8. Speak loudly
9. **✓ Verify**: Level meter shows high level (70-90%)
10. **✓ Verify**: Yellow bars appear
11. Shout or clap near microphone
12. **✓ Verify**: Level meter shows very high level (90-100%)
13. **✓ Verify**: Red bars appear

### Step 2: Test Silence
1. Stop speaking
2. **✓ Verify**: Level drops to near 0%
3. **✓ Verify**: Bars go back to gray
4. **✓ Verify**: Percentage shows low value (0-5%)

**Test 11 Result**: ✅ Audio level meter accurate

---

## Test 12: Error Recovery (2 minutes)

### Step 1: Cause and Recover from Errors
1. Start capture with USB device
2. Unplug device (error)
3. **✓ Verify**: Error message shown
4. Select built-in mic
5. **✓ Verify**: Error clears
6. Start capture
7. **✓ Verify**: Works with new device
8. Stop and start capture multiple times
9. **✓ Verify**: No accumulated errors

**Test 12 Result**: ✅ Error recovery working

---

## Test 13: Console Verification (2 minutes)

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform various operations:
   - Request permission
   - Start capture
   - Stop capture
   - Switch devices
   - Disconnect/reconnect device
4. **✓ Verify**: Stream ready messages appear
5. **✓ Verify**: No error messages
6. **✓ Verify**: Clean console output

### Step 2: Check Network Tab
1. Go to Network tab
2. **✓ Verify**: No unnecessary network requests
3. **✓ Verify**: No file uploads
4. **✓ Verify**: MediaStream is local only

**Test 13 Result**: ✅ No console errors

---

## Expected Results Summary

### ✅ All Tests Passing:
- Permission request/grant/deny working
- Device enumeration listing all devices
- Device selection with exact deviceId
- Live audio level meter responding
- Device disconnection detected
- Device reconnection working
- Error messages clear and helpful
- Cleanup proper on stop/unmount
- No recording or file creation
- MediaStream ready for Phase 5

### 🎯 Success Criteria:
- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ All 13 test scenarios pass
- ✅ Level meter responds to correct device
- ✅ Wireless receiver explicitly selected and used
- ✅ Stream ID logged to console
- ✅ Proper cleanup on navigation

---

## Common Issues & Solutions

### Issue: Device not appearing in list
**Check**: Permission granted? Try refresh after granting
**Solution**: Ensure microphone connected, grant permission, refresh if needed

### Issue: Level meter not responding
**Check**: Correct device selected? Speaking into right microphone?
**Solution**: Verify device selection, check physical microphone connection

### Issue: "Device already in use" error
**Check**: Another app using microphone? Another browser tab?
**Solution**: Close other apps/tabs using microphone

### Issue: Permission keeps being requested
**Check**: Browser permission settings
**Solution**: Click "Always allow" in browser permission dialog

### Issue: Dropdown shows "Microphone XXXX" instead of device name
**Check**: Permission granted before enumeration?
**Solution**: This is normal if permission not yet granted - labels appear after permission

---

## Phase 5 Integration Verification

### Verify Stream Ready for STT

1. Start microphone capture
2. Open browser console
3. **✓ Verify**: Message appears: "Microphone stream ready: [stream-id]"
4. Check console logs for stream ID
5. **✓ Verify**: Valid stream ID logged
6. **✓ Verify**: No "undefined" or null errors

This confirms the MediaStream is properly passed to the parent component and ready for Phase 5 STT integration.

---

## Performance Verification

### Check Resource Usage
1. Open browser Task Manager (Shift+Esc in Chrome)
2. Start microphone capture
3. **✓ Verify**: Reasonable CPU usage (<5%)
4. **✓ Verify**: Reasonable memory usage (<50MB)
5. Let run for 1 minute
6. **✓ Verify**: No memory leaks
7. **✓ Verify**: Smooth level meter animation

---

## Module 4 Complete! ✅

If all 13 tests pass:
- ✅ Microphone capture system working
- ✅ Device selection explicit and correct
- ✅ Live audio level meter functional
- ✅ Error handling comprehensive
- ✅ Resource management proper
- ✅ Ready for Phase 5 STT integration

**Report any failing tests for debugging!**

---

**Next Step**: Proceed to Phase 5 (Speech-to-Text Integration)
