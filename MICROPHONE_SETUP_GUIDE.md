# Wireless Microphone Setup Guide
## MIC SUPPORT GURUNANAK - Live Translation System

---

## Hardware You Need

1. **Wireless Microphone Transmitter** (speaker/organizer wears this)
2. **Wireless Receiver** (receives signal from transmitter)
3. **Audio Cable** (connects receiver to laptop)
   - 3.5mm to 3.5mm cable, OR
   - USB audio interface with appropriate cables
4. **Your Laptop** (running the translation app)

---

## Physical Connection Steps

### Step 1: Power On Receiver
1. Connect receiver to power source
2. Turn on receiver
3. Check that receiver is ready (usually has LED indicator)

### Step 2: Pair Transmitter with Receiver
1. Turn on wireless transmitter (microphone)
2. Press pairing button on receiver (if required by your model)
3. Wait for pairing indicator (solid LED, usually green)
4. Test audio by speaking into mic and checking receiver's audio level meter

### Step 3: Connect Receiver to Laptop

**Option A - Direct 3.5mm Connection:**
```
Receiver Audio Out → 3.5mm cable → Laptop Mic Input (pink port)
```

**Option B - USB Audio Interface (Recommended):**
```
Receiver Audio Out → Audio Interface → USB → Laptop
```

### Step 4: Configure Windows Audio Input

1. **Open Sound Settings:**
   - Right-click speaker icon in taskbar
   - Click "Sound settings"
   - OR: Windows + I → System → Sound

2. **Select Input Device:**
   - Under "Input", click dropdown
   - Select your wireless receiver or USB audio device
   - Example names: "USB Audio Device", "Microphone (Realtek Audio)", etc.

3. **Test Microphone:**
   - Speak into the wireless mic
   - Watch the blue bar under "Test your microphone"
   - Should see levels moving when you speak

4. **Adjust Input Volume:**
   - Click "Device properties" under Input
   - Set volume to 80-100%
   - Test again

---

## Software Setup (Application)

### Step 1: Open Your Browser
Navigate to: **http://localhost:3000**

### Step 2: Login as Organizer
1. Click "Organizer Login" or "Create Account"
2. Register with your email and password
3. Login to dashboard

### Step 3: Create Translation Session
1. Click **"Create New Session"** button
2. Fill in session details:
   - Session name (e.g., "Gurunanak Conference 2026")
   - Select source language (language you'll speak)
   - Select target languages (languages students need)
3. Click **"Create Session"**

### Step 4: Configure Microphone in Browser
1. Session page will open automatically
2. Browser will ask: **"Allow microphone access?"**
3. Click **"Allow"**
4. In the "Microphone Setup" section:
   - Click dropdown to select your wireless receiver
   - You should see: "USB Audio Device" or your receiver name
   - Click "Test Microphone"
   - Speak into wireless mic - you should see audio levels

### Step 5: Start Session
1. Click **"Start Session"** button
2. Your microphone will start capturing audio
3. System monitors will show:
   - 🎤 Microphone: Active (green)
   - 🗣️ STT (Speech-to-Text): Active
   - 🌐 Translation: Active
   - 🔊 TTS (Text-to-Speech): Active
   - 📡 Connection: Active

---

## Student/Audience Connection

### Share Session with Students

**Option 1: QR Code**
1. QR code appears on your session screen
2. Project it on screen or print it
3. Students scan with phone camera
4. Opens join page automatically

**Option 2: Session Code**
1. 6-digit code shown on session screen (e.g., "ABC123")
2. Tell students to visit: **http://localhost:3000/join**
   - Or your laptop's IP address: **http://192.168.x.x:3000/join**
3. Students enter the 6-digit code
4. Select their preferred language
5. Click "Join Session"

### Students' View
Once connected, students will:
- See live transcript of your speech
- Hear translated audio in their selected language (if TTS enabled)
- See real-time translations as you speak

---

## Troubleshooting

### Problem: Laptop doesn't detect wireless receiver

**Solution:**
1. Check cable connections (receiver to laptop)
2. Try different USB port (if using USB interface)
3. In Windows:
   - Settings → Sound → Input
   - Click "Manage sound devices"
   - Enable your receiver if it's disabled
4. Restart browser after changing audio device

### Problem: No audio levels showing in browser

**Solution:**
1. Verify wireless transmitter (mic) is ON and paired
2. Check receiver has power and is receiving signal
3. In browser, refresh the page and re-allow microphone permission
4. Check Windows privacy:
   - Settings → Privacy & Security → Microphone
   - Ensure "Microphone access" is ON
   - Ensure your browser (Chrome/Edge) has permission

### Problem: Students can't connect

**Solution:**
1. **If using localhost URL:**
   - Students must be on same WiFi network as your laptop
   - Share your laptop's IP address instead:
     - Open Command Prompt: `ipconfig`
     - Find "IPv4 Address" (e.g., 192.168.1.100)
     - Students use: `http://192.168.1.100:3000/join`

2. **Check backend is running:**
   - Backend should be on port 3002
   - Frontend should be on port 3000

3. **Check firewall:**
   - Windows Firewall may block connections
   - Allow Node.js through firewall when prompted

### Problem: Audio quality is poor

**Solution:**
1. Check wireless mic battery level
2. Reduce distance between transmitter and receiver
3. Check for interference (other wireless devices)
4. In Windows Sound Settings:
   - Device properties → Additional device properties
   - Levels tab → Set to 80-90%
   - Advanced tab → Use 44100 Hz or 48000 Hz, 16-bit
5. Move receiver away from laptop and power sources

---

## Testing Before Live Event

### Test Checklist

1. ✅ Wireless transmitter battery charged
2. ✅ Receiver powered and paired with transmitter
3. ✅ Receiver connected to laptop (USB or audio jack)
4. ✅ Windows detects microphone input
5. ✅ Backend running (http://localhost:3002)
6. ✅ Frontend running (http://localhost:3000)
7. ✅ Browser has microphone permission
8. ✅ Audio levels visible when speaking
9. ✅ Session created successfully
10. ✅ QR code/session code displayed
11. ✅ Test device can join session
12. ✅ Translation working in test device

### Quick Test Procedure

1. **Create test session**
2. **Start speaking into wireless mic**
3. **Open second browser window** (or use phone on same WiFi)
4. **Join session with test device**
5. **Verify you see transcript on test device**
6. **Speak different sentences and verify translations**

---

## Network Setup for Large Events

### For Multiple Students (20+ devices)

1. **Use your laptop as WiFi hotspot:**
   - Settings → Network & Internet → Mobile hotspot
   - Turn ON "Share my Internet connection"
   - Note the network name and password

2. **Or connect to venue WiFi:**
   - Both laptop and students on same network
   - Share laptop's IP address (not localhost)

3. **Backend should handle up to 100 students per session**
   - Monitor system health on session screen
   - Watch for memory/CPU warnings

---

## What Happens During Live Session

### Your Laptop Does:
1. ✅ Captures audio from wireless receiver
2. ✅ Converts speech to text (STT)
3. ✅ Translates text to multiple languages
4. ✅ Sends translations to connected students
5. ✅ Generates audio (TTS) for each language
6. ✅ Logs everything to database

### System Requirements:
- **Minimum:** 8GB RAM, i5 processor, stable WiFi
- **Recommended:** 16GB RAM, i7 processor, wired Ethernet + WiFi hotspot

---

## During the Event - Monitoring

Watch these indicators on your session screen:

| Indicator | Status | Meaning |
|-----------|--------|---------|
| 🎤 Microphone | Green "Active" | Receiving audio ✅ |
| 🗣️ STT | Green "Active" | Converting speech ✅ |
| 🌐 Translation | Green "Active" | Translating ✅ |
| 🔊 TTS | Green "Active" | Generating audio ✅ |
| 📡 Connection | Green "Active" | Students connected ✅ |
| 👥 Students | Number | Shows connected count |

**If any turn red:** Check that component immediately

---

## After the Event

1. Click **"End Session"** button
2. Session data saved to database
3. Transcripts available in dashboard
4. Disconnect wireless transmitter and receiver
5. Charge batteries for next event

---

## Hardware Recommendations

### For Best Results:

**Wireless Mic System:**
- UHF frequency (more stable than VHF)
- True diversity receiver (reduces dropouts)
- Rechargeable transmitter battery

**USB Audio Interface (if using):**
- Focusrite Scarlett Solo
- Behringer U-Phoria UM2
- Any USB audio interface with mic input

**Laptop:**
- Windows 10/11
- 16GB RAM recommended
- SSD storage
- Intel i5 or better
- Built-in WiFi + Ethernet port

---

## Quick Reference Commands

### Check if backend is running:
```bash
# Open browser to:
http://localhost:3002/api/health
```
Should return: `{"status":"ok"}`

### Check if frontend is running:
```bash
# Open browser to:
http://localhost:3000
```
Should show login page

### Find your laptop's IP address:
```bash
# Open Command Prompt (Win + R, type "cmd"):
ipconfig

# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

### Share URL with students:
```
http://YOUR_IP_ADDRESS:3000/join
Example: http://192.168.1.100:3000/join
```

---

## Support

For technical issues during setup:
1. Check backend logs in terminal
2. Check browser console (F12 → Console tab)
3. Verify database connection (PostgreSQL on port 5433)
4. Ensure all services running:
   - Frontend: Port 3000 ✅
   - Backend: Port 3002 ✅
   - Database: Port 5433 ✅

---

## Summary - Connection Flow

```
📻 Wireless Transmitter (on speaker)
         ↓ [Radio waves]
📡 Wireless Receiver
         ↓ [Audio cable]
💻 Laptop Microphone Input
         ↓ [Browser captures]
🌐 Your Translation App (localhost:3000)
         ↓ [Speech-to-Text]
📝 Text Transcript
         ↓ [Translation Engine]
🌍 Multiple Languages
         ↓ [WiFi Network]
📱 Students' Devices (phone/tablet/laptop)
```

**You're ready to run live multilingual translation sessions!** 🎉
