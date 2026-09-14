# Quick Start Guide

## 5-Minute Setup

### 1. Prerequisites Check
```bash
node --version  # Should be 18+
npm --version   # Should be 8+
psql --version  # PostgreSQL should be installed
```

### 2. One-Command Setup (Windows)
```bash
setup.bat
```

### 3. One-Command Setup (Linux/Mac)
```bash
chmod +x setup.sh
./setup.sh
```

### 4. Create Database
```bash
# PostgreSQL command
createdb live_translation

# Or using psql
psql -U postgres
CREATE DATABASE live_translation;
\q
```

### 5. Start Application
```bash
npm run dev
```

### 6. Open Browser
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api/health

---

## Quick Test (2 Minutes)

### Step 1: Register (30 seconds)
1. Go to http://localhost:3000/organizer/register
2. Fill form:
   - Name: Test Organizer
   - Email: test@example.com
   - Password: password123
3. Click "Create Account"

### Step 2: Create Session (30 seconds)
1. Click "Create Session"
2. Configure:
   - Source: English
   - Target: Telugu, Hindi (Ctrl+Click)
   - Max Students: 100
3. Click "Create Session"
4. **Note the 6-digit code**

### Step 3: Join as Student (30 seconds)
1. Open new incognito window
2. Go to http://localhost:3000/join
3. Enter the 6-digit code
4. Select language: Telugu
5. Click "Join Session"

### Step 4: Test Real-Time (30 seconds)
1. In organizer window: Click "Start Session"
2. In student window: See status change to "Active"
3. In organizer: Click "Pause Session"
4. In student: See status change to "Paused"

✅ **Success!** Module 1 is working!

---

## Common Commands

```bash
# Start development
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Build all packages
npm run build

# Type check
npm run type-check

# Lint code
npm run lint

# View backend logs
tail -f apps/backend/logs/combined.log
```

---

## Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL in apps/backend/.env
# Default: postgresql://postgres:postgres@localhost:5432/live_translation
```

### "Port 3000 already in use"
```bash
# Option 1: Kill process on port 3000
# Windows: netstat -ano | findstr :3000
# Linux/Mac: lsof -ti:3000 | xargs kill

# Option 2: Use different port
cd apps/frontend
npx next dev -p 3001
```

### "Port 3001 already in use"
```bash
# Change backend port in apps/backend/.env
PORT=3002

# Update frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
cd packages/shared && npm run build && cd ../..
```

---

## Default Credentials

**Database:**
- Host: localhost
- Port: 5432
- Database: live_translation
- User: postgres
- Password: postgres

**Backend:**
- Port: 3001
- CORS: http://localhost:3000

**Frontend:**
- Port: 3000
- API: http://localhost:3001

---

## Project URLs

| Service | URL |
|---------|-----|
| Homepage | http://localhost:3000 |
| Organizer Login | http://localhost:3000/organizer/login |
| Organizer Register | http://localhost:3000/organizer/register |
| Join Session | http://localhost:3000/join |
| API Health | http://localhost:3001/api/health |

---

## Need Help?

1. Check `INSTALLATION.md` for detailed setup
2. Check `README.md` for architecture details
3. Check `MODULE_1_SUMMARY.md` for implementation details
4. Check backend logs: `apps/backend/logs/combined.log`

---

## What's Next?

Module 1 ✅ - Foundation complete

**Module 2** - Audio & STT (Weeks 3-4):
- Microphone audio capture
- Google Cloud Speech-to-Text
- Real-time transcription display

See `README.md` for complete roadmap.
