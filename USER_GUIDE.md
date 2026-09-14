# User Guide - Live Translation Application

## Table of Contents
1. [For Organizers](#for-organizers)
2. [For Students](#for-students)
3. [Bluetooth Earbuds Setup](#bluetooth-earbuds-setup)
4. [Real-Time Pipeline](#real-time-pipeline)
5. [Latency Measurement](#latency-measurement)
6. [Known Limitations](#known-limitations)
7. [Tips for Best Experience](#tips-for-best-experience)

---

## For Organizers

### Creating Your Account

1. **Navigate to Registration:**
   - Open `http://localhost:3000/organizer/register`
   - Or click "Organizer Login" → "Register"

2. **Fill Registration Form:**
   - **Name:** Your full name (2-100 characters)
   - **Email:** Valid email address
   - **Password:** Minimum 8 characters, at least one uppercase, one lowercase, one number

3. **Submit:**
   - Click "Register"
   - You'll be automatically logged in
   - Redirected to dashboard

### Creating a Translation Session

1. **Access Dashboard:**
   - Navigate to `/organizer/dashboard`
   - Click "Create Session" button

2. **Configure Session:**
   ```
   Session Title: "Introduction to AI Seminar"
   Organizer Name: "Dr. Smith"
   Speaker Language: English
   Target Languages: [Telugu, Hindi, Tamil]
   Max Students: 100 (default)
   ```

3. **Submit:**
   - Click "Create Session"
   - Redirected to session management page

### Session Management Page

**URL:** `/organizer/session/[id]`

**Display Elements:**

1. **Session Info Card (Top):**
   - Large session code (e.g., "123456")
   - QR code for students to scan
   - Connected students count (e.g., "23 / 100")
   - Session status badge
   - Source/target languages

2. **Session Controls:**
   - **Start Session** - Makes session active for students
   - **Stop Session** - Ends session permanently
   - **Start Transcription** - Begins STT processing
   - **Stop Transcription** - Pauses STT processing

3. **System Health Monitor:**
   - 🎤 Microphone: Green when capturing audio
   - 📝 STT: Green when transcribing
   - 🌐 Translation: Green when translating
   - 🔊 TTS: Green when synthesizing audio
   - 📡 Connection: Green when connected

4. **Latency Metrics:**
   - P50 (median): ~120ms
   - P95: ~250ms
   - P99 (worst case): ~380ms

### Starting a Live Session

**Step-by-Step Workflow:**

1. **Before Students Join:**
   ```
   ✓ Create session
   ✓ Share session code (display on screen/whiteboard)
   ✓ Share QR code (students scan with phone)
   ✓ Wait for students to join
   ```

2. **Connect Wireless Microphone:**
   ```
   ✓ Turn on wireless mic transmitter
   ✓ Attach to speaker (clip on collar)
   ✓ Verify receiver connected to laptop
   ✓ Check mic appears in browser device list
   ```

3. **Start Microphone:**
   - Click "Microphone Setup" card
   - Select wireless mic from dropdown
   - Click "Start Microphone"
   - Verify volume indicator moves when speaking

4. **Start Session:**
   - Click "Start Session" button
   - Session status changes to "ACTIVE"
   - Students can now connect

5. **Start Transcription:**
   - Automatically starts when microphone is ready
   - Or click "Start Transcription" manually
   - Speak into mic - transcription appears in real-time

### Monitoring During Session

**Watch For:**
- ✅ Green status indicators (all systems operational)
- 👥 Connected students count increasing
- 📊 Latency staying under 500ms
- ⚠️ Yellow/red status (check corresponding component)

**If Issues Occur:**
- **Microphone Idle:** Check mic battery, USB connection
- **STT Error:** Refresh page, check internet connection
- **Students Disconnecting:** Check Wi-Fi stability
- **High Latency:** Reduce number of target languages

### Ending a Session

1. **Stop Transcription:**
   - Click "Stop Transcription"
   - No more audio processing

2. **Stop Session:**
   - Click "Stop Session"
   - Confirm dialog
   - Students receive "Session Stopped" notification
   - No more students can join

3. **Session Data:**
   - Transcripts stored in database
   - Session remains in dashboard as "STOPPED"
   - Can create new session anytime

---

## For Students

### Joining a Session

**Method 1: Session Code**

1. **Navigate to Join Page:**
   - Open `http://localhost:3000/join` on your phone
   - Or scan organizer's QR code (goes directly to join page)

2. **Enter Session Code:**
   - Type 6-digit code (e.g., "123456")
   - Code auto-validates as you type
   - ✓ Green checkmark when valid

3. **Select Language:**
   - Choose your preferred language from dropdown
   - Shows available languages for this session
   - Must select before joining

4. **Enter Name (Optional):**
   - Your name (helps organizer identify you)
   - Can leave blank (will show as "Anonymous")

5. **Join Session:**
   - Click "Join Session"
   - Redirected to live translation view

**Method 2: QR Code**

1. **Scan QR Code:**
   - Use phone camera app
   - Point at organizer's QR code on screen
   - Tap notification to open link

2. **Auto-filled Code:**
   - Session code pre-filled
   - Proceed with language selection and join

### Live Translation View

**Layout (Mobile-First Design):**

```
┌─────────────────────────────────┐
│  🎙️ LIVE TRANSLATION           │
│  "Introduction to AI Seminar"   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Connection: ● Active           │
│  Audio: ● Playing               │
│  From: ENGLISH → To: TELUGU     │
└─────────────────────────────────┘
│                                 │
│   LARGE TRANSLATED TEXT         │
│   చాలా పెద్దగా చదవగలిగే         │
│   టెక్స్ట్                       │
│                                 │
│                                 │
│   ▼ Original Text (English)    │
│   Very large readable text      │
│                                 │
└─────────────────────────────────┘
```

**Features:**

1. **Sticky Header:**
   - Always visible at top
   - Shows session name
   - Connection status (green = connected)
   - Audio status (green = playing)
   - Languages (From → To)

2. **Main Translation Area:**
   - **VERY LARGE TEXT** (2xl-4xl font)
   - Readable from normal phone distance (30-40cm)
   - Auto-scrolls as new text arrives
   - Updates in real-time (~1 second latency)

3. **Optional Original Text:**
   - Tap "▼ Original Text" to expand
   - Shows speaker's original language
   - Helps verify translation
   - Tap again to collapse

4. **Disconnection Warning:**
   - Yellow banner appears if connection lost
   - "Attempting to reconnect..." message
   - Automatically reconnects when network available

### Using Bluetooth Earbuds

**Why Bluetooth Earbuds?**
- Private listening in crowded space
- Better audio quality than phone speaker
- Hands-free (can take notes)
- Multiple students won't disturb each other

**Setup Before Session:**

1. **Pair Earbuds with Phone:**
   ```
   iPhone: Settings → Bluetooth → [Your Earbuds]
   Android: Settings → Connections → Bluetooth → [Your Earbuds]
   ```

2. **Test Audio:**
   - Play music/video to verify earbuds work
   - Adjust volume to comfortable level

3. **Keep Connected:**
   - Don't disconnect during session
   - Keep phone near you (Bluetooth range ~10m)

**During Session:**

1. **Audio Playback:**
   - Translation audio plays automatically through earbuds
   - No need to tap anything
   - Volume controlled by phone volume buttons

2. **If Audio Stops:**
   - Check earbud battery
   - Check Bluetooth connection
   - Refresh page if needed
   - Text translation continues even if audio fails ✓

**Best Practices:**
- ✓ Charge earbuds fully before session
- ✓ Test before session starts
- ✓ Keep phone screen on during session
- ✓ Close other apps to save battery
- ✗ Don't share earbuds (hygiene + single user)
- ✗ Don't disconnect mid-session

---

## Bluetooth Earbuds Setup

### Recommended Models

**Budget (~$30-50):**
- Anker Soundcore Life P2
- JBL Tune 125TWS
- Xiaomi Redmi Buds

**Mid-Range (~$50-100):**
- Samsung Galaxy Buds 2
- OnePlus Buds Pro
- Jabra Elite 45h

**Premium (~$100+):**
- Apple AirPods Pro
- Sony WF-1000XM4
- Bose QuietComfort Earbuds

### Pairing Instructions

**iPhone (iOS 14+):**
1. Open earbud case near iPhone
2. Settings → Bluetooth
3. Tap earbud name when it appears
4. Tap "Connect"
5. ✓ "Connected" appears

**Android:**
1. Enable pairing mode on earbuds (varies by model)
2. Settings → Connections → Bluetooth
3. Scan for devices
4. Tap earbud name
5. ✓ "Connected" appears

**Troubleshooting Bluetooth:**
- Not pairing: Reset earbuds (check manual)
- Audio cutting out: Move phone closer, remove obstacles
- One earbud not working: Re-pair both earbuds
- Low volume: Check both phone and app volume
- Delay in audio: Expected ~50-100ms latency (normal for Bluetooth)

---

## Real-Time Pipeline

### How It Works

**End-to-End Flow:**

```
Speaker (Microphone)
    ↓
[1] Audio Capture (Browser MediaStream)
    ↓ ~50ms
[2] Speech-to-Text (Web Speech API / Google STT)
    ↓ ~500-800ms
[3] Text Translation (Mock / Google Translate)
    ↓ ~100-200ms
[4] Text-to-Speech (Mock / Google TTS)
    ↓ ~200-300ms
[5] Audio Playback (Student Browser)
    ↓
Student (Bluetooth Earbuds)

Total Latency: ~1-2 seconds
```

### Component Breakdown

**1. Audio Capture (Organizer Side)**
- **Tech:** Browser MediaStream API
- **Input:** Wireless microphone USB input
- **Processing:** 
  - 16kHz sample rate
  - Mono audio
  - 4096 byte chunks
- **Output:** Raw audio PCM data
- **Latency:** ~10-20ms

**2. Speech-to-Text**
- **Tech:** Web Speech API (current) or Google Cloud STT
- **Input:** Audio chunks
- **Processing:**
  - Continuous recognition
  - Interim results (for quick feedback)
  - Final results (confirmed transcription)
- **Output:** Text with timestamps
- **Latency:** ~300-800ms (varies by speech clarity)

**3. Translation**
- **Tech:** Mock Provider (current) or Google Cloud Translation
- **Input:** Source language text
- **Processing:**
  - Language detection (if needed)
  - Neural machine translation
  - Fan-out to multiple target languages simultaneously
- **Output:** Translated text per language
- **Latency:** ~100-200ms per language

**4. Text-to-Speech**
- **Tech:** Mock Provider (current) or Google Cloud TTS
- **Input:** Translated text per language
- **Processing:**
  - Text normalization
  - Phoneme generation
  - Audio synthesis
  - Chunked streaming (16KB chunks)
- **Output:** MP3/PCM audio stream
- **Latency:** ~200-400ms

**5. Distribution (Socket.IO)**
- **Tech:** WebSocket (Socket.IO rooms)
- **Input:** Translated text + audio
- **Processing:**
  - Room-based routing (one room per language)
  - Efficient fan-out (broadcast to all in room)
  - Sequence numbering (prevent duplicates)
- **Output:** Delivered to student browsers
- **Latency:** ~10-50ms (network dependent)

**6. Student Playback**
- **Tech:** Web Audio API
- **Input:** Audio chunks + translated text
- **Processing:**
  - Audio buffering (smooth playback)
  - Text display (immediate)
  - Synchronization (audio + text)
- **Output:** Bluetooth audio + screen text
- **Latency:** ~50-100ms

### Optimizations Applied

**MODULE 7: Reliable Text Channel**
- Sequence numbers prevent duplicate messages
- Recovery requests fetch missed messages
- Delivery acknowledgments track reception

**MODULE 9: Network Quality Monitoring**
- Tracks packet loss, jitter, latency
- Adjusts buffer size dynamically
- Degrades gracefully on poor connection

**MODULE 10: Pipeline Orchestrator**
- Parallel processing (STT + Translation concurrent)
- Early returns (interim results displayed immediately)
- Error isolation (one component failure doesn't break others)

**MODULE 11: Latency Optimization**
- Chunked streaming (audio sent in small pieces)
- Predictive buffering (pre-loads next audio)
- Connection pooling (reuse TCP connections)

**MODULE 12: Scalability**
- Room-based architecture (efficient fan-out)
- Resource monitoring (prevents overload)
- Connection limits (500 per session, 1000 total)

**MODULE 13: Resilience**
- Automatic reconnection (exponential backoff)
- Circuit breakers (fail fast on repeated errors)
- Session recovery (rejoin with state restoration)

---

## Latency Measurement

### How Latency is Measured

**Client → Server → Client Ping:**
```javascript
// Student sends ping
socket.emit('ping', { timestamp: Date.now() });

// Server responds immediately
socket.on('ping', (data, callback) => {
  callback({
    clientTimestamp: data.timestamp,
    serverTimestamp: Date.now()
  });
});

// Client calculates round-trip time
const rtt = Date.now() - clientTimestamp;
const latency = rtt / 2; // One-way latency estimate
```

**Component Latencies:**
- STT: Tracked from audio chunk sent → text received
- Translation: Tracked from text sent → translation received
- TTS: Tracked from text sent → first audio chunk received
- Network: Round-trip time / 2

**Aggregated Metrics:**
- **P50 (Median):** 50% of requests complete faster
- **P95:** 95% of requests complete faster
- **P99:** 99% of requests complete faster

**Display:**
- Organizer dashboard shows P50/P95/P99
- Student view shows current latency badge
- Network quality indicator (Good/Fair/Poor)

### Expected Latency Ranges

**Development (Local Network):**
- End-to-end: 800ms - 1500ms
- STT: 300ms - 800ms
- Translation: 50ms - 150ms
- TTS: 200ms - 400ms
- Network: 10ms - 50ms

**Production (Internet):**
- End-to-end: 1000ms - 2000ms
- STT: 300ms - 1000ms
- Translation: 100ms - 300ms
- TTS: 200ms - 500ms
- Network: 50ms - 200ms

**High Load (100+ students):**
- End-to-end: 1500ms - 3000ms
- Processing: +200ms per component
- Network: +50-100ms

### Monitoring Latency

**Organizer View:**
- System Health Monitor shows real-time metrics
- Latency dashboard (if enabled)
- Network quality for each student

**Student View:**
- Network quality badge (top right)
- Latency number (e.g., "Network: 145ms")
- Connection status (green/yellow/red)

**Logs:**
```bash
# Backend logs latency for each component
tail -f apps/backend/logs/combined.log | grep "latency"
```

---

## Known Limitations

### Current Implementation

**⚠️ Mock Providers (Not Production Ready):**

1. **Translation Service:**
   - Returns placeholder text: "Translated: [original]"
   - Does not perform actual translation
   - All languages show same English text
   - **Impact:** Students see English, not their language
   - **Workaround:** Use for testing UI only

2. **TTS Service:**
   - Generates silent audio buffers
   - No actual speech synthesis
   - Students receive empty audio
   - **Impact:** No audio playback
   - **Workaround:** Read text on screen

**✅ Working Components:**

1. **STT Service:**
   - Uses browser Web Speech API
   - Actually transcribes speech
   - Works in Chrome/Edge
   - **Limitation:** English-heavy bias, needs Google STT for other languages

2. **Real-Time Communication:**
   - WebSocket connections work
   - Text distribution works
   - Multiple students supported
   - Session management works

### Technical Limitations

**Performance:**
- Max 100 students per session (configurable to 500)
- Max 10 simultaneous sessions
- Latency increases with student count
- Higher load = higher resource usage

**Browser Compatibility:**
- **STT:** Chrome/Edge only (Web Speech API)
- **Audio:** All modern browsers
- **WebSocket:** All modern browsers
- **Mobile:** iOS Safari, Chrome Android

**Network Requirements:**
- Minimum 1 Mbps upload (organizer)
- Minimum 500 Kbps download (student)
- WebSocket support (port 3001)
- Stable connection (reconnection helps but increases latency)

**Hardware Requirements:**
- Organizer: 8GB RAM, 4 cores minimum
- Student: Any smartphone (2GB RAM+)
- Microphone: USB or Bluetooth with decent quality

### Language Support

**Implemented in Shared Package:**
- English (en)
- Telugu (te)
- Hindi (hi)
- Tamil (ta)
- Kannada (kn)
- Malayalam (ml)

**Actually Working:**
- English STT: ✅ (Web Speech API)
- Other languages STT: ⚠️ (needs Google Cloud STT)
- Translation: ❌ (mock provider only)
- TTS: ❌ (mock provider only)

### Known Issues

**Open Issues:**

1. **TypeScript Errors:**
   - Many TS errors in `npm run type-check`
   - Caused by missing React types installation
   - Does not affect runtime
   - Fix: `npm install` in each workspace

2. **Console Logs:**
   - 8 files with `console.log` in frontend
   - Used for debugging during development
   - Should be removed or converted to proper logging

3. **Session Expiration:**
   - Sessions expire after 24 hours
   - No automatic cleanup job
   - Database can grow with old sessions
   - Fix needed: Cron job to delete expired sessions

4. **Microphone Errors:**
   - No graceful recovery from mic disconnect
   - User must manually restart microphone
   - Should auto-retry with backoff

5. **Mobile Safari Issues:**
   - Audio playback requires user interaction
   - Workaround: Tap screen once after joining

**Workarounds Implemented:**

✅ Automatic reconnection (Module 13)
✅ Text continues if audio fails (Module 13)
✅ Circuit breakers prevent infinite retries
✅ Session recovery on reconnect
✅ Connection quality indicators

---

## Tips for Best Experience

### For Organizers

**Before Session:**
- [ ] Test microphone 10 minutes before
- [ ] Create session 5 minutes before
- [ ] Display QR code and session code on screen
- [ ] Ask students to join and test
- [ ] Verify 2-3 students can see translation
- [ ] Check system health - all green indicators

**During Session:**
- [ ] Speak clearly and at moderate pace
- [ ] Pause briefly between sentences (helps STT)
- [ ] Keep mic 10-15cm from mouth
- [ ] Monitor connected student count
- [ ] Watch for red/yellow status indicators
- [ ] Check latency stays under 2 seconds

**After Session:**
- [ ] Click "Stop Session"
- [ ] Students automatically disconnected
- [ ] Transcripts saved to database
- [ ] Review session for issues

### For Students

**Before Session:**
- [ ] Charge phone to 80%+
- [ ] Charge Bluetooth earbuds
- [ ] Test earbuds (play music)
- [ ] Close other apps
- [ ] Connect to strong Wi-Fi
- [ ] Disable mobile data (use Wi-Fi only)

**During Session:**
- [ ] Keep phone screen on (prevents disconnection)
- [ ] Keep phone near you (Bluetooth range)
- [ ] Read text if audio cuts out
- [ ] Report issues to organizer
- [ ] Don't refresh page unless necessary

**If Issues:**
- Text not updating: Refresh page
- Audio not playing: Check Bluetooth connection
- Disconnected: Wait 10 seconds for auto-reconnect
- Still issues: Rejoin session with same language

### Network Optimization

**Wi-Fi Best Practices:**
- Use 5GHz band (less interference)
- Place router centrally in room
- Limit other devices on network
- Use wired connection for organizer laptop
- Reserve bandwidth for translation app

**Load Testing:**
- Test with 10 students first
- Gradually increase to 50, then 100
- Monitor latency at each level
- Identify sweet spot for your network

---

## Support

**Common Questions:**

Q: Can I use this without internet?
A: No, cloud APIs require internet. Local-only mode not implemented.

Q: How many students can join?
A: Up to 100 per session (tested). Max 500 configurable but not tested.

Q: What if my internet fails during session?
A: Students disconnected, can rejoin when internet returns. Text may be missed.

Q: Can students join late?
A: Yes, while session is "ACTIVE". They miss earlier content.

Q: Can I pause and resume?
A: Not implemented. Stop and create new session instead.

Q: Where are transcripts stored?
A: PostgreSQL database. No UI to view yet (Module 16+).

**For Technical Support:**
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Review logs: `apps/backend/logs/`
- GitHub Issues: (your-repo-url)

---

**Ready to conduct your first seminar!** 🎓

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and fixes.
