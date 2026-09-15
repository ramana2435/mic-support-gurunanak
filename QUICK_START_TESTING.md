# Quick Start Testing Guide

## 🚀 Test the Complete Implementation

All code is complete! Follow these steps to test the real Groq STT + Translation + Browser TTS pipeline.

## Prerequisites
- Node.js installed
- Groq API key (get from https://console.groq.com)
- Two browser windows (or one desktop + one mobile)

## Step 1: Set Groq API Key (30 seconds)

Edit `apps/backend/.env`:
```bash
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```

Replace `your-groq-api-key-here` with your real API key from Groq console.

## Step 2: Install Dependencies (First time only)

```bash
# From workspace root
npm install

# Backend
cd apps/backend
npm install

# Frontend
cd apps/frontend
npm install
```

## Step 3: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm run dev
```

Wait for: `✓ Server listening on port 4000`

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
npm run dev
```

Wait for: `✓ Ready on http://localhost:3000`

## Step 4: Test as Organizer

1. Open browser: http://localhost:3000
2. Click "Login" → Login as organizer (any email/password in dev mode)
3. Click "Create New Session"
4. Fill in:
   - Title: "Test Session"
   - Source Language: English
5. Click "Create Session"
6. You'll be redirected to session page
7. Click **"Start Microphone"** (allow microphone permission)
8. Click **"Start Session"**
9. **Speak clearly into your microphone**: "Hello everyone, this is a test"
10. Watch for:
    - ✅ Real transcript appears (your actual words, not mock phrases)
    - ✅ Backend logs show `[GroqSTT]` messages
    - ✅ Translation appears below

**Expected Backend Logs:**
```
[STT] Using Groq STT Provider (REAL speech recognition)
[Translation] Using Groq Translation Provider (REAL translation)
[GroqSTT] Starting STT streaming
[GroqSTT] Processing audio buffer with Groq Whisper
[GroqSTT] Transcription received from Groq
```

## Step 5: Test as Student

1. Open **second browser** (or incognito/mobile): http://localhost:3000
2. Look at organizer page, copy the **Session Code** (e.g., ABC123)
3. In second browser, enter the session code
4. Click "Join Session"
5. Fill in:
   - Name: "Test Student"
   - Language: Telugu (or any language you want)
6. Click "Join Session"
7. You should see the translated text appear
8. Click **"🔊 Enable Audio"** button
9. Watch for:
   - ✅ Button changes to "Audio On"
   - ✅ When organizer speaks, translation text appears
   - ✅ **Audio speaks the translation** through your device speakers

**Expected Student Experience:**
- Text appears instantly when organizer speaks
- Audio plays the translation aloud (if enabled)
- Status shows "(Speaking)" during audio playback
- Works with Bluetooth earbuds if connected to device

## Step 6: Test Mobile + Bluetooth (Optional)

1. Connect Bluetooth earbuds to your phone
2. Open student session on phone browser
3. Click "Enable Audio"
4. Verify audio plays through Bluetooth earbuds

## Verification Checklist

### Backend ✅
- [ ] Backend starts without errors
- [ ] Logs show "Using Groq STT Provider"
- [ ] Logs show "Using Groq Translation Provider"
- [ ] Microphone can be started
- [ ] Real speech generates `[GroqSTT]` logs

### Organizer Page ✅
- [ ] Can create session
- [ ] Can start microphone
- [ ] Can start session
- [ ] Real transcript appears (your actual words)
- [ ] Translation appears below transcript
- [ ] No mock phrases like "Hello everyone, welcome to today's lecture"
- [ ] No duplicate transcripts

### Student Page ✅
- [ ] Can join session with code
- [ ] Translated text appears
- [ ] "Enable Audio" button appears when session is active
- [ ] After clicking, button changes to "Audio On"
- [ ] Audio speaks the translation
- [ ] Status shows "(Speaking)" during playback
- [ ] Can disable audio anytime
- [ ] Text continues working even if audio is disabled

### Multi-Student ✅
- [ ] Multiple students can join
- [ ] Each student gets translation in their selected language
- [ ] All students see translated text
- [ ] All students (who enable audio) hear their translation

## Troubleshooting

### "Using mock STT provider" in logs
**Problem**: Backend not using Groq
**Solution**: 
1. Check `apps/backend/.env` has `GROQ_API_KEY=gsk_...`
2. Verify API key is correct (starts with `gsk_`)
3. Restart backend server

### No transcript appears
**Problem**: Microphone not working
**Solution**:
1. Check browser allowed microphone permission
2. Check correct microphone is selected in browser settings
3. Speak louder and clearer
4. Check backend logs for errors

### No audio on student page
**Problem**: Browser TTS not working
**Solution**:
1. Make sure you clicked "Enable Audio" button
2. Check browser supports Web Speech API (Chrome/Edge work best)
3. Check device volume is not muted
4. Check browser console for errors

### "Audio unavailable" message
**Problem**: Browser doesn't support Web Speech API
**Solution**:
1. Use Chrome, Edge, or Safari (best support)
2. Firefox has limited support
3. Text translation still works

### Groq API errors
**Problem**: "Invalid API key" or "Rate limit exceeded"
**Solution**:
1. Verify API key in Groq console
2. Check API usage limits in Groq console
3. Check backend logs for specific error message

### Translation wrong language
**Problem**: Student gets wrong language
**Solution**:
1. Verify language selected during join
2. Check session source language is correct
3. Groq may not support all languages (check Groq docs)

## Performance Expectations

### Latencies (typical)
- **STT Latency**: 500-1500ms (Groq Whisper processing)
- **Translation Latency**: 300-800ms (Groq LLM)
- **TTS Latency**: 100-300ms (Browser native)
- **Total End-to-End**: 1-3 seconds (speech → translated audio)

### Quality
- **STT Accuracy**: High (Groq Whisper-large-v3)
- **Translation Quality**: High (Groq llama-3.3-70b-versatile)
- **TTS Quality**: Depends on device's native voices

## Next Steps

### For Development
1. ✅ Test locally (this guide)
2. Test with different languages
3. Test with multiple students
4. Monitor Groq API usage
5. Optimize buffer sizes if needed

### For Production
1. Deploy backend to Railway with production `GROQ_API_KEY`
2. Deploy frontend to Vercel (auto-deploys)
3. Test production URLs
4. Monitor Groq API costs
5. Set up error monitoring

## Production Deployment

### Railway (Backend)
```bash
# Set environment variable in Railway dashboard
GROQ_API_KEY=gsk_your_production_key_here

# Deploy
git add .
git commit -m "Ready for production"
git push origin main
```

### Vercel (Frontend)
```bash
# Vercel auto-deploys on push
git push origin main
```

### Verify Production
1. Check Railway logs show "Using Groq STT Provider"
2. Test creating session on production URL
3. Test student joining on production URL
4. Verify audio works on mobile devices

## Support

If you encounter issues not covered here:
1. Check backend logs in terminal (local) or Railway dashboard (production)
2. Check browser console for frontend errors
3. Verify Groq API key is valid and has credits
4. Check network connectivity
5. Review `BROWSER_TTS_INTEGRATION_COMPLETE.md` for detailed architecture

## Success! 🎉

When everything works:
- Organizer speaks → Real transcript appears
- Students see instant translations in their language
- Students hear audio in their language (if enabled)
- No mock/fake data
- Multiple languages work simultaneously
- Bluetooth earbuds work
- Text resilient even if audio fails

**You now have a complete real-time multilingual translation system!**
