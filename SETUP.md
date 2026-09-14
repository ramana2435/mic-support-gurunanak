# Setup Guide - Live Translation Application

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [AI Provider Configuration](#ai-provider-configuration)
4. [Wireless Microphone Setup](#wireless-microphone-setup)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [Running the Application](#running-the-application)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **PostgreSQL** 12.0 or higher
- **Git** 2.30.0 or higher

### Hardware Requirements
- **Development Machine**: 
  - 8GB RAM minimum (16GB recommended)
  - 4 CPU cores minimum
  - 10GB free disk space
- **Wireless Microphone**: 
  - USB wireless microphone system OR
  - Bluetooth microphone paired with laptop
  - Supported: Most USB audio devices recognized by browser
- **For Testing**:
  - Multiple phones/tablets with Bluetooth earbuds
  - Reliable Wi-Fi network

### Browser Requirements
- **Organizer (Desktop)**: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- **Student (Mobile)**: Chrome 90+, Safari 14+, Samsung Internet 14+

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd live-translation-app
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm run install:all
```

**What this does:**
- Installs dependencies for backend, frontend, and shared packages
- Sets up TypeScript configurations
- Links workspace packages

### Step 3: Build Shared Package

```bash
cd packages/shared
npm run build
cd ../..
```

**Why:** The shared package contains TypeScript types used by both frontend and backend.

---

## AI Provider Configuration

### Current Implementation Status

**MODULE STATUS:**
- ✅ STT: Browser-based (Web Speech API) - No API key needed
- ⚠️ Translation: Mock provider (returns placeholder text)
- ⚠️ TTS: Mock provider (generates silence)

### Google Cloud Setup (For Production)

**Note:** Google Cloud providers are partially implemented but not active in current build.

#### 1. Create Google Cloud Project

```bash
# Install gcloud CLI
# Visit: https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Create project
gcloud projects create live-translation-prod --name="Live Translation"

# Set project
gcloud config set project live-translation-prod
```

#### 2. Enable Required APIs

```bash
# Enable Speech-to-Text API
gcloud services enable speech.googleapis.com

# Enable Translation API
gcloud services enable translate.googleapis.com

# Enable Text-to-Speech API
gcloud services enable texttospeech.googleapis.com
```

#### 3. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create live-translation-sa \
    --display-name="Live Translation Service Account"

# Get the email
gcloud iam service-accounts list

# Grant roles
gcloud projects add-iam-policy-binding live-translation-prod \
    --member="serviceAccount:live-translation-sa@live-translation-prod.iam.gserviceaccount.com" \
    --role="roles/speech.client"

gcloud projects add-iam-policy-binding live-translation-prod \
    --member="serviceAccount:live-translation-sa@live-translation-prod.iam.gserviceaccount.com" \
    --role="roles/cloudtranslate.user"

gcloud projects add-iam-policy-binding live-translation-prod \
    --member="serviceAccount:live-translation-sa@live-translation-prod.iam.gserviceaccount.com" \
    --role="roles/texttospeech.client"
```

#### 4. Download Credentials

```bash
# Create credentials directory
mkdir -p apps/backend/credentials

# Download key
gcloud iam service-accounts keys create apps/backend/credentials/google-cloud-key.json \
    --iam-account=live-translation-sa@live-translation-prod.iam.gserviceaccount.com

# IMPORTANT: Add to .gitignore
echo "apps/backend/credentials/" >> .gitignore
```

#### 5. Update Environment Variables

```bash
# apps/backend/.env
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-cloud-key.json
GOOGLE_CLOUD_PROJECT_ID=live-translation-prod
STT_PROVIDER=google  # Change from 'browser'
TRANSLATION_PROVIDER=google  # Change from 'mock'
TTS_PROVIDER=google  # Change from 'mock'
```

### Testing AI Providers

```bash
# Test STT (browser-based works immediately)
# Navigate to organizer session page, start microphone

# Test Translation (currently mock - returns "Translated: [original]")
# Join as student, translation will show placeholder

# Test TTS (currently mock - silent audio)
# Student will receive silent audio buffers
```

---

## Wireless Microphone Setup

### Option 1: USB Wireless Microphone System (Recommended)

**Examples:**
- Rode Wireless Go II
- Sennheiser XSW-D
- Shure BLX14/SM31

**Setup:**
1. Connect USB receiver to organizer laptop
2. Pair transmitter with receiver (follow manufacturer instructions)
3. Attach transmitter to speaker (clip on collar/lapel)
4. Open browser, allow microphone access
5. Select wireless mic from browser's device list

**Browser Configuration:**
```javascript
// The application will automatically enumerate devices
// In MicrophoneSetup component, select your wireless mic
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    devices.forEach(device => {
      if (device.kind === 'audioinput') {
        console.log(device.label);
        // Look for your wireless mic name
      }
    });
  });
```

### Option 2: Bluetooth Microphone

**Setup:**
1. Pair Bluetooth mic with laptop via OS settings
2. Set as default audio input device
3. Open browser and allow microphone access
4. Browser will use system default input

**Limitations:**
- Higher latency than USB (~50-100ms additional)
- May have audio quality issues
- Bluetooth connection can drop

### Microphone Testing

**Test in Browser:**
```bash
# Open Chrome/Edge
chrome://settings/content/microphone

# Verify microphone appears in list
# Grant permission to localhost:3000
```

**Test in Application:**
1. Navigate to `/organizer/session/[id]`
2. Click microphone setup card
3. Select device from dropdown
4. Click "Start Microphone"
5. Speak - should see volume indicator moving

**Troubleshooting Microphone:**
- No audio: Check USB connection, battery, pairing
- Choppy audio: Too far from receiver, interference
- Not showing in browser: Refresh page, check USB port
- Permission denied: Grant in browser settings

---

## Database Setup

### PostgreSQL Installation

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
1. Download installer from postgresql.org
2. Run installer (default port 5432)
3. Remember the password you set

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE live_translation;

# Create user (optional)
CREATE USER liveuser WITH PASSWORD 'securepassword';
GRANT ALL PRIVILEGES ON DATABASE live_translation TO liveuser;

# Exit
\q
```

### Verify Connection

```bash
# Test connection
psql -U postgres -d live_translation -c "SELECT version();"
```

### Database Schema

**Auto-initialization:**
The application automatically creates tables on first run:
- `organizers` - Organizer accounts
- `sessions` - Translation sessions
- `students` - Connected students
- `transcripts` - Session transcripts

**Manual initialization (if needed):**
```sql
-- See apps/backend/src/database/index.ts for full schema
```

---

## Environment Configuration

### Backend Environment (.env)

Create `apps/backend/.env`:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# JWT Configuration
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_IN_PRODUCTION
JWT_EXPIRES_IN=7d

# Database Configuration
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/live_translation

# Session Configuration
MAX_STUDENTS_PER_SESSION=100
SESSION_CODE_LENGTH=6
SESSION_EXPIRY_HOURS=24

# AI Providers (Current: Browser STT, Mock Translation/TTS)
STT_PROVIDER=browser
TRANSLATION_PROVIDER=mock
TTS_PROVIDER=mock

# Google Cloud (For future use)
# GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-cloud-key.json
# GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Logging
LOG_LEVEL=info
```

### Frontend Environment (.env.local)

Create `apps/frontend/.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### Security Checklist

- [ ] Change `JWT_SECRET` to a random 64-character string
- [ ] Update database password
- [ ] Add `.env` to `.gitignore` (already done)
- [ ] Never commit credentials to git
- [ ] Use different secrets for dev/staging/production

**Generate secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Running the Application

### Development Mode (Both Services)

```bash
# From project root
npm run dev
```

This starts:
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`

### Development Mode (Separate Terminals)

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
npm run dev
```

### Production Build

```bash
# Build all
npm run build

# Start backend
cd apps/backend
npm start

# Start frontend (separate terminal)
cd apps/frontend
npm start
```

---

## Verification

### Health Check

```bash
# Backend health
curl http://localhost:3001/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.45,
  "database": "connected"
}
```

### Quick Functional Test

1. **Register Organizer:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Password123!",
       "name": "Test Organizer"
     }'
   ```

2. **Login:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Password123!"
     }'
   ```

3. **Open Frontend:**
   - Navigate to `http://localhost:3000`
   - Login with test credentials
   - Create a session
   - Verify QR code displays

4. **Join as Student:**
   - Open `http://localhost:3000/join` on phone/another browser
   - Enter session code
   - Select language
   - Join session

### Component Verification

- [ ] Organizer can register/login
- [ ] Organizer can create session
- [ ] QR code displays correctly
- [ ] Session code is 6 digits
- [ ] Student can join with code
- [ ] Language selector shows all options
- [ ] Microphone permission prompt appears
- [ ] Microphone indicator shows activity
- [ ] Session status updates in real-time

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
psql $DATABASE_URL

# Common issues:
# - Wrong password
# - Wrong database name
# - PostgreSQL not started
# - Port 5432 already in use
```

### Module Not Found Errors

```bash
# Rebuild shared package
cd packages/shared
npm run build

# Reinstall dependencies
npm install

# Clear Next.js cache
cd apps/frontend
rm -rf .next
```

### Microphone Not Working

1. Check browser permissions: `chrome://settings/content/microphone`
2. Verify microphone in system settings
3. Try different browser
4. Check USB connection
5. Restart browser

### TypeScript Errors

```bash
# Check types
npm run type-check

# Common fix: rebuild shared
cd packages/shared
npm run build
```

### WebSocket Connection Failed

- Check CORS origin matches
- Verify backend is running
- Check firewall settings
- Try disabling browser extensions

---

## Next Steps

After setup:
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand system design
2. Read [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
3. Read [PERFORMANCE.md](./PERFORMANCE.md) - Optimization guide
4. Test with multiple students (see MODULE_12_LOAD_TEST_RESULTS.md)

---

**Setup completed? Proceed to creating your first session!**

See [USER_GUIDE.md](./USER_GUIDE.md) for step-by-step usage instructions.
