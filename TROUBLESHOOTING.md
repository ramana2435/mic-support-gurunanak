# Troubleshooting Guide

## Quick Diagnosis

**Symptom → Likely Cause → Solution**

| Problem | Cause | Fix |
|---------|-------|-----|
| Can't register organizer | Database not running | Start PostgreSQL |
| JWT errors | Wrong JWT_SECRET | Check .env file |
| Port 3001 in use | Another process | Kill process or change port |
| Module not found | Shared package not built | `cd packages/shared && npm run build` |
| Microphone not showing | Permission denied | Grant in browser settings |
| No audio from students | Mock TTS provider | Expected - not implemented yet |
| Translation shows English | Mock translation provider | Expected - not implemented yet |
| Student can't join | Session not ACTIVE | Organizer must start session |
| High latency (>3s) | Too many students | Reduce max students or upgrade hardware |
| WebSocket disconnected | CORS issue | Check CORS_ORIGIN in .env |

---

## Backend Issues

### 1. Database Connection Failed

**Error:**
```
Error: Connection terminated unexpectedly
  at Connection.<anonymous> (node_modules/pg/lib/client.js)
```

**Causes:**
- PostgreSQL not running
- Wrong connection string
- Wrong password
- Database doesn't exist

**Solutions:**

```bash
# Check if PostgreSQL is running
pg_isready

# If not running:
# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql

# Windows
# Start PostgreSQL service from Services app

# Test connection manually
psql -U postgres -d live_translation

# If database doesn't exist
psql -U postgres -c "CREATE DATABASE live_translation;"

# If password wrong, update .env
DATABASE_URL=postgresql://postgres:CORRECT_PASSWORD@localhost:5432/live_translation
```

### 2. Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**

```bash
# Find process using port
# macOS/Linux
lsof -i :3001
kill -9 <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change port in .env
PORT=3002
```

### 3. JWT Secret Error

**Error:**
```
Error: secretOrPrivateKey must have a value
```

**Solution:**

```bash
# Add JWT_SECRET to apps/backend/.env
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Or manually set
JWT_SECRET=your-64-character-random-string-here
```

### 4. Module Not Found

**Error:**
```
Error: Cannot find module '@live-translation/shared'
```

**Solution:**

```bash
# Build shared package
cd packages/shared
npm run build
cd ../..

# If still broken, reinstall
rm -rf node_modules packages/shared/dist
npm install
cd packages/shared && npm run build
```

### 5. TypeScript Compilation Errors

**Error:**
```
apps/backend/src/index.ts:5:23 - error TS2307: Cannot find module 'express'
```

**Solution:**

```bash
# Reinstall dependencies
cd apps/backend
rm -rf node_modules
npm install

# Check tsconfig.json exists
ls tsconfig.json

# Try building
npm run build
```

---

## Frontend Issues

### 1. Next.js Build Failed

**Error:**
```
Error: Module not found: Can't resolve '@live-translation/shared'
```

**Solution:**

```bash
# Build shared package first
cd packages/shared
npm run build

# Clear Next.js cache
cd ../../apps/frontend
rm -rf .next
npm run build
```

### 2. API Connection Failed

**Error (in browser console):**
```
Failed to fetch: http://localhost:3001/api/health
```

**Causes:**
- Backend not running
- Wrong API URL
- CORS error

**Solutions:**

```bash
# Check backend is running
curl http://localhost:3001/api/health

# Check .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001

# Check backend CORS
# apps/backend/.env
CORS_ORIGIN=http://localhost:3000
```

### 3. WebSocket Connection Failed

**Error (browser console):**
```
WebSocket connection to 'ws://localhost:3001' failed
```

**Solutions:**

```bash
# Verify backend Socket.IO is initialized
# Check apps/backend/src/index.ts has:
# const io = initializeSocket(server);

# Check CORS origin
# apps/backend/.env
CORS_ORIGIN=http://localhost:3000

# Try disabling browser extensions (ad blockers)

# Check firewall not blocking port 3001
```

### 4. Hydration Errors (React)

**Error:**
```
Hydration failed because the initial UI does not match
```

**Solutions:**

```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev

# If persistent, check for:
# - localStorage usage in component render
# - Date/time formatting without timezone
# - Conditional rendering based on window object
```

---

## Microphone Issues

### 1. Microphone Not Detected

**Symptom:** Dropdown shows no devices

**Solutions:**

1. **Check USB connection:**
   - Unplug and replug USB receiver
   - Try different USB port
   - Check device manager (Windows) / System Preferences (Mac)

2. **Check browser permissions:**
   ```
   Chrome: chrome://settings/content/microphone
   Edge: edge://settings/content/microphone
   
   - Verify localhost:3000 is allowed
   - Remove and re-grant permission
   ```

3. **Restart browser:**
   - Close all tabs
   - Restart browser
   - Navigate to app again

4. **Test system recognition:**
   ```
   # macOS
   System Preferences → Sound → Input → [Your Mic]
   
   # Windows
   Settings → System → Sound → Input → [Your Mic]
   
   # Speak and verify levels move
   ```

### 2. Microphone Permissions Denied

**Error:** "Permission denied" or "NotAllowedError"

**Solutions:**

1. **Grant permission in browser:**
   - Click lock icon in address bar
   - Change microphone to "Allow"
   - Refresh page

2. **Check system permissions (macOS):**
   ```
   System Preferences → Security & Privacy → Privacy → Microphone
   - Enable for Chrome/Edge/Firefox
   ```

3. **Clear site data and retry:**
   ```
   Chrome: chrome://settings/content/siteDetails?site=http://localhost:3000
   - Clear data
   - Reload page
   ```

### 3. No Audio / Volume Too Low

**Symptom:** Microphone connected but no waveform

**Solutions:**

1. **Check mic is not muted:**
   - Hardware mute switch on transmitter
   - Check receiver mute button

2. **Increase gain:**
   - Adjust mic gain on receiver
   - Speak louder / move closer to mic
   - Check microphone is facing correct direction

3. **Test in system settings:**
   - Record audio using system tools
   - If works there but not in browser, it's a browser issue
   - Try different browser

4. **Check correct device selected:**
   - Dropdown might show multiple devices
   - Ensure wireless mic selected, not laptop built-in

### 4. Choppy / Distorted Audio

**Solutions:**

1. **Check wireless signal:**
   - Move receiver closer to transmitter
   - Remove obstacles between receiver and transmitter
   - Check battery level on transmitter

2. **Reduce interference:**
   - Move away from Wi-Fi routers, Bluetooth devices
   - Change wireless mic channel if supported
   - Turn off other 2.4GHz devices

3. **Check USB bandwidth:**
   - Disconnect other USB devices
   - Use USB 2.0 port (not a hub)
   - Close other apps using webcam/mic

---

## Student Connection Issues

### 1. "Invalid Session Code"

**Causes:**
- Typo in code
- Session doesn't exist
- Session expired (>24 hours)

**Solutions:**

```bash
# Verify code from organizer
# Check session status in database
psql -U postgres -d live_translation -c "SELECT code, status FROM sessions WHERE code='123456';"

# If expired, create new session
```

### 2. "Session Not Active"

**Symptom:** Can't join even with valid code

**Solution:**
- Organizer must click "Start Session" button
- Session status must be "ACTIVE"
- If "STOPPED", cannot rejoin - create new session

### 3. Connection Drops Repeatedly

**Solutions:**

1. **Check Wi-Fi signal:**
   - Move closer to router
   - Switch to 5GHz band
   - Reduce other devices on network

2. **Check phone settings:**
   - Disable battery saver mode
   - Disable data saver mode
   - Keep screen on during session
   - Close other apps

3. **Network congestion:**
   - If 50+ students, network may be overloaded
   - Use wired connection for organizer
   - Upgrade router/access points

### 4. Bluetooth Audio Not Playing

**Symptom:** Text appears but no audio

**Current Status:** **EXPECTED - TTS is mock provider**

If this were production:

1. **Check Bluetooth connection:**
   - Open phone Bluetooth settings
   - Verify earbuds connected
   - Forget and re-pair if needed

2. **Check audio output:**
   - Play music to verify earbuds work
   - May need to select audio output in browser
   - Some browsers don't auto-route to Bluetooth

3. **Check volume:**
   - Phone volume up
   - Media volume (not ringer)
   - No "Do Not Disturb" mode

---

## Performance Issues

### 1. High Latency (>3 seconds)

**Causes:**
- Too many students
- Slow internet
- Weak server hardware
- Resource exhaustion

**Solutions:**

1. **Check resource usage:**
   ```bash
   # Backend server
   top
   # Look for node process CPU/RAM
   
   # If >80% CPU or RAM, you need:
   # - Fewer students per session
   # - Stronger server
   # - Multiple backend instances (load balancer)
   ```

2. **Reduce student count:**
   ```bash
   # apps/backend/.env
   MAX_STUDENTS_PER_SESSION=50
   
   # Restart backend
   ```

3. **Reduce target languages:**
   - Each language = separate translation + TTS
   - 1 language: Low load
   - 5 languages: 5x load
   - Recommend max 3 languages per session

4. **Check network:**
   ```bash
   # Organizer laptop
   speedtest-cli
   # Need: 5+ Mbps upload for 50 students
   
   # Students
   # Need: 1+ Mbps download each
   ```

### 2. Backend Crashes

**Error:** Backend process exits unexpectedly

**Solutions:**

1. **Check logs:**
   ```bash
   tail -f apps/backend/logs/error.log
   tail -f apps/backend/logs/combined.log
   
   # Look for:
   # - Out of memory errors
   # - Uncaught exceptions
   # - Database connection losses
   ```

2. **Increase memory:**
   ```bash
   # Start backend with more memory
   NODE_OPTIONS="--max-old-space-size=4096" npm run dev
   ```

3. **Enable PM2 (production):**
   ```bash
   npm install -g pm2
   pm2 start apps/backend/dist/index.js --name live-translation
   pm2 startup
   pm2 save
   
   # Auto-restart on crash
   ```

4. **Fix code issues:**
   - Uncaught promise rejections
   - Memory leaks (check with `node --inspect`)
   - Connection pool exhaustion

### 3. Database Slow

**Symptom:** API endpoints take >1 second

**Solutions:**

1. **Check query performance:**
   ```sql
   -- Enable query logging
   ALTER SYSTEM SET log_min_duration_statement = 100;
   SELECT pg_reload_conf();
   
   -- Check slow queries
   tail -f /var/log/postgresql/postgresql-14-main.log
   ```

2. **Add indexes:**
   ```sql
   -- If many sessions
   CREATE INDEX idx_sessions_organizer ON sessions(organizer_id);
   CREATE INDEX idx_sessions_code ON sessions(code);
   CREATE INDEX idx_sessions_status ON sessions(status);
   
   -- If many students
   CREATE INDEX idx_students_session ON students(session_id);
   ```

3. **Clean up old data:**
   ```sql
   -- Delete expired sessions
   DELETE FROM sessions WHERE status = 'expired' AND created_at < NOW() - INTERVAL '7 days';
   
   -- Vacuum
   VACUUM ANALYZE sessions;
   ```

---

## Build / Deployment Issues

### 1. Production Build Fails

**Error:** `npm run build` fails

**Solutions:**

1. **Check TypeScript errors:**
   ```bash
   npm run type-check
   
   # Fix all errors before building
   # Common issues:
   # - Missing types: npm install @types/xxx
   # - Import errors: Check file paths
   # - Shared package: Rebuild it
   ```

2. **Check environment variables:**
   ```bash
   # All required vars must be set
   # Backend: JWT_SECRET, DATABASE_URL
   # Frontend: NEXT_PUBLIC_API_URL
   
   # Load .env in production
   # Use dotenv or docker secrets
   ```

3. **Clear caches:**
   ```bash
   rm -rf node_modules dist .next
   npm install
   npm run build
   ```

### 2. Production Server Won't Start

**Error:** Process exits immediately after `npm start`

**Solutions:**

1. **Check dist directory exists:**
   ```bash
   ls apps/backend/dist/
   # If empty, run: npm run build
   ```

2. **Check environment:**
   ```bash
   # Must set NODE_ENV=production
   NODE_ENV=production npm start
   ```

3. **Check port binding:**
   ```bash
   # If port 80/443, may need sudo
   sudo PORT=80 npm start
   
   # Or use reverse proxy (nginx)
   ```

4. **Check database connection:**
   ```bash
   # Test connection in production
   psql $DATABASE_URL -c "SELECT 1;"
   ```

---

## Testing Issues

### 1. Can't Run Tests

**Error:** `npm test` fails

**Current Status:** Test framework configured but no tests written

**To add tests:**

```bash
# Backend
cd apps/backend
npm install --save-dev jest @types/jest ts-jest
npx ts-jest config:init

# Create test file
# apps/backend/src/services/__tests__/session.service.test.ts

# Frontend
cd apps/frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Create test file
# apps/frontend/src/components/__tests__/Button.test.tsx
```

### 2. Load Tests Fail

**Location:** `apps/backend/test/load/load-test.ts`

**Common issues:**

1. **Backend not running:**
   ```bash
   # Start backend first
   cd apps/backend
   npm run dev
   
   # Then run load test
   cd test/load
   ./run-load-test.sh
   ```

2. **Connection refused:**
   - Check `TEST_API_URL` in load test script
   - Should be `http://localhost:3001`

3. **High failure rate:**
   - Server can't handle load
   - Reduce `NUM_STUDENTS` in script
   - Increase server resources

---

## Security Issues

### 1. CORS Errors

**Error (browser console):**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**

```bash
# Check CORS_ORIGIN matches frontend URL
# apps/backend/.env
CORS_ORIGIN=http://localhost:3000

# For multiple origins (production + dev)
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Restart backend after changing
```

### 2. JWT Token Expired

**Error:** "Token expired"

**Solutions:**

1. **Login again:**
   - Tokens expire after 7 days (default)
   - Re-login to get new token

2. **Adjust expiry:**
   ```bash
   # apps/backend/.env
   JWT_EXPIRES_IN=30d
   ```

3. **Implement refresh tokens:**
   - Not currently implemented
   - Would require code changes

### 3. Exposed Secrets

**Check:**

```bash
# Search for hardcoded secrets
grep -r "API_KEY\|SECRET\|PASSWORD" apps/ --include="*.ts" --include="*.tsx"

# Should only find env variable references
# e.g., process.env.JWT_SECRET

# Never commit:
# - .env files
# - credentials/ directory
# - API keys in code
```

---

## Logging & Debugging

### Enable Debug Logs

```bash
# Backend
# apps/backend/.env
LOG_LEVEL=debug

# Restart backend
# Check apps/backend/logs/combined.log

# Frontend
# Open browser console (F12)
# Network tab: See WebSocket messages
# Console tab: See application logs
```

### Common Log Messages

**Normal:**
```
info: Client connected {"socketId":"abc123"}
info: Student joined session {"sessionId":"xyz","studentId":"def456"}
info: STT result {"sessionId":"xyz","text":"Hello"}
```

**Warnings:**
```
warn: High resource usage {"cpu":85,"memory":90}
warn: Connection stale {"studentId":"def456"}
```

**Errors:**
```
error: STT provider error {"error":"Network timeout"}
error: Database query failed {"error":"Connection lost"}
```

### Debug WebSocket

```javascript
// Open browser console on frontend
// Type:
localStorage.debug = 'socket.io-client:*';
// Reload page
// See all WebSocket events
```

---

## Getting Help

**Before asking for help:**

1. Check logs:
   - `apps/backend/logs/error.log`
   - Browser console (F12)

2. Try basic fixes:
   - Restart backend
   - Refresh browser
   - Clear cache
   - Reinstall dependencies

3. Search documentation:
   - README.md
   - SETUP.md
   - ARCHITECTURE.md
   - This file (TROUBLESHOOTING.md)

**When reporting issues:**

Include:
- Error message (full stack trace)
- Steps to reproduce
- Environment (OS, Node version, browser)
- Logs (redact sensitive info)
- Screenshots if UI issue

**Where to get help:**
- GitHub Issues: [repo-url]
- Documentation: All .md files in project root
- Logs: `apps/backend/logs/`

---

**Still stuck? Check the module summaries:**
- MODULE_13_ERROR_SCENARIOS_TESTING.md
- MODULE_14_SECURITY_AUDIT.md
- All other MODULE_*.md files

They contain detailed troubleshooting for specific features.
