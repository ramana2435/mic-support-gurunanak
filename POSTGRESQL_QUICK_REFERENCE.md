# PostgreSQL Quick Reference Card

**Database:** mic_support  
**Port:** 5433  
**User:** postgres

---

## ⚡ Quick Commands

### Test Connection (Fast)
```bash
cd apps/backend
node test-db-connection.js
```

### Create Database
```bash
psql -U postgres -p 5433 -c "CREATE DATABASE mic_support;"
```

### Start Backend
```bash
cd apps/backend
npm run dev
```

### Check Health
```bash
curl http://localhost:3001/api/health
```

### View Tables
```bash
psql -U postgres -p 5433 -d mic_support -c "\dt"
```

### View Sessions
```bash
psql -U postgres -p 5433 -d mic_support -c "SELECT code, title, status FROM sessions;"
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `apps/backend/.env` | **Your password here!** Edit if connection fails |
| `apps/backend/.env.example` | Template (updated with port 5433) |
| `apps/backend/src/database/index.ts` | Connection pool & schema |
| `apps/backend/src/database/health-check.ts` | Health check utilities (NEW) |
| `apps/backend/test-db-connection.js` | Standalone test (NEW) |

---

## ✅ Success Checklist

Run these in order to verify everything works:

```bash
# 1. Test connection
cd apps/backend
node test-db-connection.js
# Expected: "✅ ALL TESTS PASSED"

# 2. Start backend
npm run dev
# Expected: "Database initialized successfully"

# 3. Check health (different terminal)
curl http://localhost:3001/api/health
# Expected: "connected": true, "port": 5433

# 4. View tables
psql -U postgres -p 5433 -d mic_support -c "\dt"
# Expected: 4 tables (organizers, sessions, students, transcripts)
```

---

## 🔧 Common Fixes

### "Connection refused"
```bash
# Check PostgreSQL is running
# Windows: Services → PostgreSQL → Start

# Or check with netstat
netstat -an | findstr :5433
```

### "Database does not exist"
```bash
psql -U postgres -p 5433 -c "CREATE DATABASE mic_support;"
```

### "Password authentication failed"
```bash
# Edit apps/backend/.env
# Update password in DATABASE_URL line
notepad apps\backend\.env
```

### "Cannot find module 'pg'"
```bash
cd "c:/Users/maddili ramana/Desktop/MIC SUPPORT GURUNANAK"
npm install
```

---

## 📊 What Changed

**3 Files Modified:**
- `.env.example` - Port 5433 example
- `database/index.ts` - Better error logs
- `health.routes.ts` - Show DB details

**2 Files Created:**
- `database/health-check.ts` - Utilities
- `test-db-connection.js` - Test script

**0 Files Deleted**  
**0 Existing Features Removed**

---

## 🗄️ Database Schema

```
organizers (auth)
├── id (UUID)
├── email (unique)
├── password_hash
├── name
└── created_at

sessions (translation sessions)
├── id (UUID)
├── code (6-digit, indexed)
├── title
├── organizer_id → organizers(id)
├── source_language
├── target_languages (array)
├── status (created/active/stopped)
├── max_students
└── timestamps

students (connected users)
├── id (UUID)
├── session_id → sessions(id)
├── name
├── selected_language
├── socket_id
└── connected_at

transcripts (history)
├── id (UUID)
├── session_id → sessions(id)
├── original_text
├── original_language
├── translations (JSONB)
└── timestamp
```

---

## 🎯 Your Configuration

From your `.env` file:

```bash
DATABASE_URL="postgresql://postgres:ramana@localhost:5433/mic_support"
```

✅ Port: 5433 (correct)  
✅ Database: mic_support (correct)  
✅ User: postgres (correct)  
⚠️ Password: visible (change in production)

---

## 📞 If Something Breaks

1. Run: `node test-db-connection.js`
2. Read the error message
3. Check "Common Fixes" section above
4. Check full report: `POSTGRESQL_INTEGRATION_REPORT.md`

---

**Status:** ✅ READY TO TEST  
**Next:** Run `node test-db-connection.js`
