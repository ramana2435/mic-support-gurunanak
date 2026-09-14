# Quick Start Guide - Windows

**Complete step-by-step guide to run the Live Translation Application on Windows**

---

## Prerequisites Check

Before starting, verify you have:

### 1. Node.js (Required)

```bash
# Open Command Prompt or PowerShell and check:
node --version
# Should show v18.0.0 or higher

npm --version
# Should show v9.0.0 or higher
```

**If not installed:**
- Download from: https://nodejs.org/
- Install LTS version (20.x recommended)
- Restart Command Prompt after installation

### 2. PostgreSQL (Required)

```bash
# Check if installed:
psql --version
# Should show PostgreSQL 12 or higher
```

**If not installed:**
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer
3. Remember the password you set for `postgres` user
4. Default port: 5432

### 3. Git (Probably already have it)

```bash
git --version
```

---

## Step-by-Step Setup

### Step 1: Open PowerShell or Command Prompt

1. Press `Windows + X`
2. Select "Windows PowerShell" or "Command Prompt"
3. Navigate to your project:

```bash
cd "C:\Users\maddili ramana\Desktop\MIC SUPPORT GURUNANAK"
```

### Step 2: Install Dependencies

**This will take 5-10 minutes (downloads packages from internet)**

```bash
# Install root dependencies
npm install

# If you see any errors, try:
npm install --legacy-peer-deps
```

**Expected output:**
```
added 1500+ packages in 2-5 minutes
```

### Step 3: Build Shared Package

```bash
cd packages\shared
npm run build
cd ..\..
```

**Expected output:**
```
Successfully compiled TypeScript
```

### Step 4: Set Up Database

#### A. Create Database

```bash
# Connect to PostgreSQL (enter your password when prompted)
psql -U postgres

# In psql prompt, type:
CREATE DATABASE live_translation;

# Verify it was created:
\l

# Exit psql:
\q
```

**If `psql` command not found:**
- Find PostgreSQL bin folder: `C:\Program Files\PostgreSQL\14\bin`
- Add to PATH or use full path:
  ```bash
  "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres
  ```

#### B. Configure Backend Environment

```bash
# Navigate to backend
cd apps\backend

# Create .env file by copying example
copy .env.example .env

# Open .env in Notepad
notepad .env
```

**Edit these values in .env:**

```bash
# Change this line (replace YOUR_PASSWORD with your PostgreSQL password):
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/live_translation

# Example:
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/live_translation

# Change JWT_SECRET to something random:
JWT_SECRET=change-this-to-something-very-random-and-long-12345678

# Save and close Notepad
```

**Generate secure JWT_SECRET (optional but recommended):**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and paste it as JWT_SECRET value
```

### Step 5: Configure Frontend Environment

```bash
# Navigate to frontend (from backend folder)
cd ..\frontend

# Create .env.local file
copy .env.local.example .env.local

# Open and verify (usually no changes needed for local dev)
notepad .env.local
```

**Should contain:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Step 6: Start the Application

You need **2 terminal windows** (backend and frontend running simultaneously).

#### Terminal 1: Start Backend

```bash
# From project root
cd "C:\Users\maddili ramana\Desktop\MIC SUPPORT GURUNANAK\apps\backend"

npm run dev
```

**Expected output:**
```
[INFO] Database connected
[INFO] Server running on port 3001
[INFO] Socket.IO initialized
```

**If you see errors:**
- Database connection error: Check DATABASE_URL in .env
- Port 3001 in use: Close other apps or change PORT in .env

**Keep this terminal open!**

#### Terminal 2: Start Frontend

**Open a NEW terminal window** (don't close the first one)

```bash
# From project root
cd "C:\Users\maddili ramana\Desktop\MIC SUPPORT GURUNANAK\apps\frontend"

npm run dev
```

**Expected output:**
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**First run will take 1-2 minutes to compile**

**Keep this terminal open too!**

---

## Step 7: Open the Application

### Open Your Browser

1. **Open Chrome or Edge** (required for microphone to work)
2. **Navigate to:** `http://localhost:3000`

You should see the home page!

---

## Step 8: Create Your First Session

### A. Register as Organizer

1. Click **"Organizer Login"** (top right)
2. Click **"Register"** link
3. Fill form:
   - Name: `Your Name`
   - Email: `test@example.com`
   - Password: `Test123!` (or anything with 8+ characters)
4. Click **"Register"**

**You'll be automatically logged in and redirected to dashboard**

### B. Create a Session

1. Click **"Create Session"** button
2. Fill form:
   - Session Title: `Test Seminar`
   - Organizer Name: `Your Name`
   - Speaker Language: `English`
   - Target Languages: Select `Telugu`, `Hindi`, `Tamil`
   - Max Students: `100` (default)
3. Click **"Create Session"**

**You'll see the session management page with:**
- Large 6-digit session code (e.g., "123456")
- QR code
- System health indicators
- Microphone setup card

### C. Start the Microphone

1. Scroll to **"Microphone Setup"** card
2. Click **"Select Device"** dropdown
3. Choose your microphone:
   - If you have a wireless mic: Select it
   - If not: Select "Default" or your laptop mic
4. Click **"Start Microphone"**
5. **Browser will ask for permission** - Click "Allow"

**You should see:**
- Green volume indicator moving when you speak
- Microphone status changes to green

### D. Start the Session

1. Click **"Start Session"** button (top)
2. Session status changes to **"ACTIVE"** (green badge)
3. Click **"Start Transcription"** button

**Now the session is live!**

**Test by speaking:**
- Speak clearly into the microphone
- Watch the transcript appear in real-time below

---

## Step 9: Join as a Student (Test)

### On Your Phone or Another Browser Tab

1. **Open:** `http://localhost:3000/join`
   
   **From phone on same Wi-Fi:**
   - Find your computer's IP: `ipconfig` → Look for IPv4 Address
   - Example: `http://192.168.1.100:3000/join`

2. **Enter Session Code:** Type the 6-digit code from organizer screen

3. **Code validates automatically** - you'll see:
   - ✓ Session verified!
   - Session title
   - Speaker language

4. **Select Your Language:** Choose `Telugu` (or any language you added)

5. **Enter Name** (optional): `Student 1`

6. **Click "Join Session"**

**You'll see the live translation view:**
- Large text display area
- Connection status (green = connected)
- Languages (From: ENGLISH → To: TELUGU)

---

## What You'll See

### ✅ What Works Right Now

1. **Organizer Side:**
   - ✅ Microphone captures audio
   - ✅ Speech-to-text transcription (English)
   - ✅ Real-time transcript display
   - ✅ System health indicators
   - ✅ Connected students count

2. **Student Side:**
   - ✅ Join with session code
   - ✅ See translated text
   - ✅ Connection status indicators
   - ✅ Large, readable display

### ⚠️ What Doesn't Work (Mock Providers)

1. **Translation:**
   - Shows: `"Translated: [original English text]"`
   - Not real translation - just placeholder
   - All languages show same English text

2. **Audio Playback:**
   - No sound (mock TTS provider)
   - Students see text but hear nothing
   - This is expected in current version

**To get real translation/audio:**
- Need Google Cloud API integration (not yet done)
- See SETUP.md for Google Cloud setup

---

## Testing the Full Flow

### Complete Test Scenario

1. **Organizer speaks:** "Hello everyone, welcome to the seminar"
2. **Organizer sees:** Transcript appears: "Hello everyone, welcome to the seminar"
3. **Student sees:** "Translated: Hello everyone, welcome to the seminar"
4. **Student hears:** (Nothing - mock TTS is silent)

**This proves:**
- ✅ Microphone working
- ✅ STT working
- ✅ WebSocket communication working
- ✅ Text distribution working
- ⚠️ Translation is mock
- ⚠️ TTS is mock

---

## Common Issues & Fixes

### Issue: "npm: command not found"

**Fix:**
- Node.js not installed or not in PATH
- Close terminal, open new one after installing Node.js

### Issue: "Database connection failed"

**Fix:**
```bash
# Check PostgreSQL is running:
# Windows Services → PostgreSQL → Start

# Or in PowerShell:
Get-Service -Name postgresql*
Start-Service postgresql-x64-14  # (or your version)

# Test connection:
psql -U postgres -d live_translation -c "SELECT 1;"
```

### Issue: "Port 3001 already in use"

**Fix:**
```bash
# Find process using port:
netstat -ano | findstr :3001

# Kill process:
taskkill /PID <PID_NUMBER> /F

# Or change port in apps\backend\.env:
PORT=3002
```

### Issue: "Module not found: @live-translation/shared"

**Fix:**
```bash
# Rebuild shared package:
cd packages\shared
npm run build
cd ..\..

# If still broken, reinstall:
npm install
```

### Issue: Microphone not showing in browser

**Fix:**
1. Check USB connection (if wireless mic)
2. Check Windows Sound Settings:
   - Settings → System → Sound → Input
   - Verify microphone appears and levels move
3. Check browser permissions:
   - Chrome: `chrome://settings/content/microphone`
   - Allow for localhost:3000
4. Try different browser (Chrome or Edge recommended)

### Issue: TypeScript errors when running

**These are warnings, not blockers:**
- App still runs fine
- To fix: `npm install` in each folder
- Can ignore during development

### Issue: Cannot access from phone

**Fix:**
1. Check both devices on same Wi-Fi
2. Check Windows Firewall:
   - Allow ports 3000 and 3001
   - Or temporarily disable firewall for testing
3. Use your computer's IP address:
   ```bash
   ipconfig
   # Look for IPv4 Address: 192.168.x.x
   # Use: http://192.168.x.x:3000/join
   ```

---

## Stopping the Application

### To Stop:

1. **In each terminal window**, press: `Ctrl + C`
2. Wait for "Server stopped" message
3. Close terminal windows

### To Restart:

Just repeat Step 6 (start backend, then frontend)

**Database stays running** - no need to restart PostgreSQL

---

## Quick Command Reference

### Start Application
```bash
# Terminal 1 - Backend
cd "C:\Users\maddili ramana\Desktop\MIC SUPPORT GURUNANAK\apps\backend"
npm run dev

# Terminal 2 - Frontend
cd "C:\Users\maddili ramana\Desktop\MIC SUPPORT GURUNANAK\apps\frontend"
npm run dev
```

### URLs
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/api/health

### Database Commands
```bash
# Connect to database
psql -U postgres -d live_translation

# List tables
\dt

# View sessions
SELECT code, title, status FROM sessions;

# Exit
\q
```

---

## Next Steps

### After Basic Testing:

1. **Read Documentation:**
   - USER_GUIDE.md - How to use all features
   - TROUBLESHOOTING.md - Fix common issues
   - SETUP.md - Full setup including Google Cloud

2. **Test with Multiple Students:**
   - Open multiple browser tabs
   - Or use multiple phones
   - Join same session with different languages

3. **Try Failure Scenarios:**
   - Disconnect internet (should auto-reconnect)
   - Stop microphone (can restart)
   - Close and reopen student tab

4. **Production Setup** (when ready):
   - Set up Google Cloud APIs (real translation/TTS)
   - Deploy to cloud server
   - See MODULE_16_PRODUCTION_READINESS_REPORT.md

---

## Summary

**You should now have:**
- ✅ Backend running on port 3001
- ✅ Frontend running on port 3000
- ✅ Database connected
- ✅ Organizer can create sessions
- ✅ Students can join
- ✅ Speech-to-text working
- ⚠️ Translation is mock (shows English)
- ⚠️ Audio is silent (mock TTS)

**This is perfect for:**
- Testing the UI/UX
- Demonstrating the system
- Development and learning
- Preparing for production

**For production use:**
- Need to integrate Google Cloud APIs
- See SETUP.md "AI Provider Configuration" section

---

**Questions?** See TROUBLESHOOTING.md or check the logs in `apps\backend\logs\`

**Ready to go!** 🚀
