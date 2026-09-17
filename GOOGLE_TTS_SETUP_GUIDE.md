# Google Cloud Text-to-Speech Setup Guide

Complete guide to set up Google Cloud TTS for your live translation application.

---

## 🎯 Why Google Cloud TTS?

✅ **Excellent Telugu Support** - High-quality Telugu voices  
✅ **All Indian Languages** - Hindi, Tamil, Kannada, Malayalam, Bengali, Gujarati, Marathi, Punjabi  
✅ **Neural Voices** - Natural-sounding speech  
✅ **Reliable** - Enterprise-grade service  
✅ **Affordable** - $4 per 1 million characters (Standard), $16 per 1 million (Neural)

---

## 📋 Prerequisites

- Google Cloud account (free tier available)
- Credit card (required for Google Cloud, but free tier is generous)
- Access to Google Cloud Console

---

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create a new project**:
   - Click "Select a project" dropdown at top
   - Click "New Project"
   - Project name: `mic-support-gurunanak` (or any name)
   - Click "Create"

3. **Enable billing** (required, but free tier covers initial usage):
   - Go to Billing section
   - Link a credit card
   - Free tier: $300 credit for 90 days + always-free usage

### Step 2: Enable Text-to-Speech API

1. **Go to APIs & Services**:
   - In Google Cloud Console, click hamburger menu
   - Navigate to "APIs & Services" → "Library"

2. **Search for "Text-to-Speech"**:
   - Type "text-to-speech" in search box
   - Click "Cloud Text-to-Speech API"

3. **Enable the API**:
   - Click "Enable" button
   - Wait for API to be enabled (takes ~30 seconds)

### Step 3: Create Service Account

1. **Go to IAM & Admin**:
   - Click hamburger menu
   - Navigate to "IAM & Admin" → "Service Accounts"

2. **Create service account**:
   - Click "Create Service Account"
   - Service account name: `tts-service`
   - Service account ID: `tts-service@your-project-id.iam.gserviceaccount.com`
   - Click "Create and Continue"

3. **Grant permissions**:
   - Role: Select "Cloud Text-to-Speech User"
   - Click "Continue"
   - Click "Done"

### Step 4: Create Service Account Key

1. **In Service Accounts page**:
   - Find the service account you just created
   - Click the three dots menu (⋮) on the right
   - Click "Manage keys"

2. **Add key**:
   - Click "Add Key" → "Create new key"
   - Key type: **JSON** (important!)
   - Click "Create"
   
3. **Download key**:
   - A JSON file will download automatically
   - **KEEP THIS FILE SECURE** - it's your credentials
   - Rename it to something memorable like `google-tts-key.json`

### Step 5A: Local Development Setup

For local testing on your machine:

1. **Save the JSON key file**:
   ```bash
   # Create credentials directory
   mkdir -p apps/backend/credentials
   
   # Move your downloaded key
   mv ~/Downloads/your-project-*.json apps/backend/credentials/google-tts-key.json
   ```

2. **Update your `.env` file**:
   ```bash
   # Add this line to apps/backend/.env
   GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-tts-key.json
   ```

3. **Add credentials to .gitignore** (already done):
   ```bash
   # Should already be in .gitignore
   apps/backend/credentials/
   *.json
   ```

### Step 5B: Production Setup (Railway)

For Railway deployment:

1. **Convert JSON key to single line**:
   ```bash
   # On Windows (PowerShell):
   Get-Content google-tts-key.json | ConvertTo-Json -Compress
   
   # On Mac/Linux:
   cat google-tts-key.json | jq -c .
   
   # Or manually: Remove all newlines and extra spaces
   ```

2. **Add to Railway environment variables**:
   - Go to Railway dashboard
   - Select your backend service
   - Go to "Variables" tab
   - Click "New Variable"
   - Name: `GOOGLE_CLOUD_KEY_JSON`
   - Value: Paste the single-line JSON (entire contents)
   - Click "Add"

3. **Redeploy**:
   - Railway will auto-deploy when you add the variable
   - Or click "Redeploy" manually

---

## ✅ Verify Setup

### Test Locally

1. **Install dependencies**:
   ```bash
   cd apps/backend
   npm install
   ```

2. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

3. **Check logs** - You should see:
   ```
   Google TTS initialized with credentials file
   Using Google Cloud TTS provider
   ```

   **If you see:**
   ```
   Using MockTTSProvider (no real audio)
   ```
   Then credentials are not configured correctly.

### Test in Production

1. **Deploy to Railway** (if not already done)

2. **Check deployment logs**:
   - Go to Railway dashboard
   - Click on your backend service
   - Go to "Deployments" tab
   - Click latest deployment
   - Check logs for "Google TTS initialized"

3. **Test end-to-end**:
   - Open your frontend
   - Create an organizer session
   - Speak in English
   - Check if Telugu students hear audio

---

## 🧪 Test TTS Independently

Create a test script to verify TTS works:

```javascript
// test-tts.js
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

async function testTTS() {
  try {
    const client = new TextToSpeechClient();
    
    const request = {
      input: { text: 'హలో, ఇది టెలుగు పరీక్ష' },
      voice: { 
        languageCode: 'te-IN', 
        name: 'te-IN-Standard-A' 
      },
      audioConfig: { audioEncoding: 'LINEAR16' },
    };

    const [response] = await client.synthesizeSpeech(request);
    
    console.log('✅ TTS working!');
    console.log('Audio size:', response.audioContent.length, 'bytes');
  } catch (error) {
    console.error('❌ TTS failed:', error.message);
  }
}

testTTS();
```

Run:
```bash
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-tts-key.json node test-tts.js
```

---

## 💰 Pricing & Free Tier

### Free Tier (Monthly)
- **Standard voices**: 0-4 million characters FREE
- **WaveNet/Neural voices**: 0-1 million characters FREE

### After Free Tier
- **Standard voices**: $4 per 1 million characters
- **WaveNet voices**: $16 per 1 million characters

### Example Usage
- Average sentence: ~50 characters
- 10,000 sentences = 500,000 characters
- **Cost with Standard voices**: FREE (under 4M limit)
- **Cost with Neural voices**: $0.80

### For your use case:
- 100 students × 1-hour event × ~100 sentences = 500,000 chars
- **Estimated cost**: FREE (under monthly limit)

---

## 🔐 Security Best Practices

### DO:
✅ Keep JSON key file secure  
✅ Add `credentials/` to `.gitignore`  
✅ Use environment variables in production  
✅ Rotate keys periodically (every 90 days)  
✅ Use least-privilege role (Cloud Text-to-Speech User)

### DON'T:
❌ Commit JSON key to Git  
❌ Share JSON key in chat/email  
❌ Use Owner/Editor roles (too permissive)  
❌ Hardcode credentials in code  
❌ Expose credentials in frontend

---

## 🐛 Troubleshooting

### Error: "Could not load the default credentials"

**Cause**: Google Cloud credentials not configured

**Fix**:
1. Check `GOOGLE_APPLICATION_CREDENTIALS` env var is set
2. Verify JSON key file exists at that path
3. Check file permissions (should be readable)

```bash
# Verify env var
echo $GOOGLE_APPLICATION_CREDENTIALS

# Verify file exists
ls -la ./credentials/google-tts-key.json

# Fix permissions if needed
chmod 600 ./credentials/google-tts-key.json
```

### Error: "API has not been enabled"

**Cause**: Text-to-Speech API not enabled in Google Cloud

**Fix**:
1. Go to https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
2. Select your project
3. Click "Enable"

### Error: "The caller does not have permission"

**Cause**: Service account missing permissions

**Fix**:
1. Go to Google Cloud Console → IAM & Admin → IAM
2. Find your service account
3. Click "Edit" (pencil icon)
4. Add role: "Cloud Text-to-Speech User"
5. Click "Save"

### Error: "Request had invalid authentication credentials"

**Cause**: Malformed JSON key in Railway

**Fix**:
1. Ensure JSON is on ONE LINE (no newlines)
2. Ensure all quotes are properly escaped
3. Try re-pasting the key
4. Redeploy after updating

### Application still uses MockTTSProvider

**Cause**: Credentials not detected during startup

**Fix**:
1. Check backend logs for "Google TTS initialized" message
2. If missing, credentials not configured
3. Verify environment variable is set
4. Restart backend after adding credentials

---

## 📊 Monitoring Usage

### View usage in Google Cloud Console:

1. Go to https://console.cloud.google.com/
2. Select your project
3. Navigate to "APIs & Services" → "Dashboard"
4. Click "Cloud Text-to-Speech API"
5. View charts for:
   - Total requests
   - Characters synthesized
   - Errors
   - Latency

### Set up billing alerts:

1. Go to "Billing" → "Budgets & alerts"
2. Click "Create Budget"
3. Set budget amount (e.g., $10/month)
4. Set alert threshold (e.g., 50%, 90%, 100%)
5. Add your email for notifications

---

## 🎨 Available Voices

### Telugu (te-IN)
- `te-IN-Standard-A` - Female, Standard
- `te-IN-Standard-B` - Male, Standard

### Hindi (hi-IN)
- `hi-IN-Neural2-A` - Female, Neural (best quality)
- `hi-IN-Neural2-C` - Male, Neural
- `hi-IN-Standard-A` - Female, Standard
- `hi-IN-Standard-C` - Male, Standard

### Tamil (ta-IN)
- `ta-IN-Standard-A` - Female
- `ta-IN-Standard-B` - Male

### Kannada (kn-IN)
- `kn-IN-Standard-A` - Female
- `kn-IN-Standard-B` - Male

### Malayalam (ml-IN)
- `ml-IN-Standard-A` - Female
- `ml-IN-Standard-B` - Male

### English (en-US)
- `en-US-Neural2-J` - Male, Neural
- `en-US-Neural2-F` - Female, Neural
- Many more options available

---

## 🔄 Switching Between Providers

The application automatically detects which TTS provider to use:

### If Google Cloud credentials are configured:
```
✅ Using Google Cloud TTS provider
```

### If no credentials:
```
⚠️  Google Cloud TTS credentials not configured, using MockTTSProvider
⚠️  Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_KEY_JSON to enable real TTS
```

No code changes needed - it's automatic!

---

## 📝 Summary Checklist

- [ ] Create Google Cloud project
- [ ] Enable Text-to-Speech API
- [ ] Create service account with TTS User role
- [ ] Download JSON key file
- [ ] **Local**: Set `GOOGLE_APPLICATION_CREDENTIALS` in `.env`
- [ ] **Production**: Set `GOOGLE_CLOUD_KEY_JSON` in Railway
- [ ] Add credentials folder to `.gitignore`
- [ ] Install dependencies: `npm install`
- [ ] Test locally: Check logs for "Google TTS initialized"
- [ ] Deploy to Railway
- [ ] Test in production
- [ ] Set up billing alerts
- [ ] Celebrate! 🎉

---

## 🆘 Need Help?

**Google Cloud Support**:
- Documentation: https://cloud.google.com/text-to-speech/docs
- Pricing: https://cloud.google.com/text-to-speech/pricing
- Supported voices: https://cloud.google.com/text-to-speech/docs/voices

**Common Issues**:
- Authentication errors → Check JSON key and permissions
- API not enabled → Enable Text-to-Speech API in console
- Billing errors → Ensure billing account is linked
- Still using Mock → Check logs, verify env vars

---

**Setup complete!** Your application now has real Telugu TTS support powered by Google Cloud. 🚀
