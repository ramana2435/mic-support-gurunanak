# Installation Guide

## Module 1 - Complete Setup Instructions

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# This will install all workspace dependencies including:
# - apps/backend
# - apps/frontend  
# - packages/shared
```

### Step 2: Build Shared Package

```bash
# Build the shared TypeScript package
cd packages/shared
npm run build
cd ../..
```

### Step 3: Set Up PostgreSQL Database

**Option 1: Local PostgreSQL**
```bash
# Create database
createdb live_translation

# Or using psql
psql -U postgres
CREATE DATABASE live_translation;
\q
```

**Option 2: Docker PostgreSQL**
```bash
docker run --name live-translation-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=live_translation \
  -p 5432:5432 \
  -d postgres:15
```

### Step 4: Configure Environment Variables

The .env files are already created with default values. Update if needed:

**Backend** (`apps/backend/.env`):
- `DATABASE_URL` - Update with your PostgreSQL credentials
- `JWT_SECRET` - Change in production
- `CORS_ORIGIN` - Update if frontend runs on different port

**Frontend** (`apps/frontend/.env.local`):
- `NEXT_PUBLIC_API_URL` - Update if backend runs on different port

### Step 5: Create Logs Directory

```bash
mkdir -p apps/backend/logs
```

### Step 6: Start the Application

**Option 1: Start Both Services (Recommended)**
```bash
npm run dev
```

**Option 2: Start Services Separately**

Terminal 1 (Backend):
```bash
npm run dev:backend
```

Terminal 2 (Frontend):
```bash
npm run dev:frontend
```

### Step 7: Verify Installation

1. **Backend Health Check**
   ```bash
   curl http://localhost:3001/api/health
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "status": "healthy",
       "timestamp": "...",
       "environment": "development",
       "database": "connected"
     }
   }
   ```

2. **Frontend**
   - Open browser: http://localhost:3000
   - You should see the homepage

3. **Database Tables**
   The tables will be created automatically on first backend start:
   - organizers
   - sessions
   - students
   - transcripts

## Troubleshooting

### Database Connection Error

If you see database connection errors:

```bash
# Check PostgreSQL is running
pg_isready

# Verify connection manually
psql postgresql://postgres:postgres@localhost:5432/live_translation
```

### Port Already in Use

**Backend (3001):**
```bash
# Change PORT in apps/backend/.env
PORT=3002
```

**Frontend (3000):**
```bash
# Start on different port
cd apps/frontend
npx next dev -p 3001
```

### TypeScript Build Errors

```bash
# Rebuild shared package
cd packages/shared
rm -rf dist
npm run build
cd ../..

# Clear Next.js cache
cd apps/frontend
rm -rf .next
cd ../..
```

### Module Not Found Errors

```bash
# Clean and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
```

## Quick Test Workflow

1. **Register Organizer**
   - Go to http://localhost:3000/organizer/register
   - Create account

2. **Create Session**
   - Login at http://localhost:3000/organizer/login
   - Create a new session
   - Note the 6-digit code

3. **Join as Student**
   - Open http://localhost:3000/join in another browser/tab
   - Enter the session code
   - Select preferred language
   - Join session

4. **Test Session Controls**
   - Start session from organizer dashboard
   - Verify student sees status updates
   - Test pause/resume/end controls

## Development Tips

**Hot Reload:**
- Backend: Uses nodemon for auto-restart
- Frontend: Uses Next.js Fast Refresh

**Database Migrations:**
- Current: Tables auto-created on startup
- Production: Consider using a migration tool (e.g., node-pg-migrate)

**Viewing Logs:**
```bash
# Backend logs
tail -f apps/backend/logs/combined.log
tail -f apps/backend/logs/error.log

# Or view in terminal (console output)
```

**Type Checking:**
```bash
# Check all workspaces
npm run type-check

# Or individually
cd apps/backend && npm run type-check
cd apps/frontend && npm run type-check
```

## Next Steps

Module 1 is complete. The foundation is ready for:
- Module 2: Audio capture and Speech-to-Text
- Module 3: Translation integration
- Module 4: Text-to-Speech and audio playback

Refer to README.md for the complete roadmap.
