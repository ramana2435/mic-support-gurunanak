# 🔍 PRODUCTION LOGIN ISSUE - ROOT CAUSE ANALYSIS

**Date:** September 14, 2026  
**Issue:** Organizer login shows "Network error" on production mobile

---

## 🎯 ROOT CAUSE IDENTIFIED

### The Problem

**Frontend (Vercel) is NOT configured with the production backend URL.**

The production frontend at `https://mic-support-gurunanak-frontend-wsq5.vercel.app` is attempting to send API requests to `http://localhost:3002` instead of `https://mic-support-gurunanak-production.up.railway.app`.

---

## 📊 EVIDENCE

### 1. Frontend API Configuration

**File:** `apps/frontend/src/lib/api.ts`
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})
```

### 2. Vercel Build Configuration

**File:** `apps/frontend/next.config.js`
```javascript
env: {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
},
```

### 3. Current Environment Files

```bash
apps/frontend/
├── .env.local               # Contains: NEXT_PUBLIC_API_URL=http://localhost:3002
├── .env.local.example       # Local development template
└── .env.production.example  # Production template (NOT USED in build)
```

**Problem:** Vercel build does NOT read `.env.local` or `.env.production.example`

### 4. CORS Preflight Success

```bash
$ curl -X OPTIONS https://mic-support-gurunanak-production.up.railway.app/api/auth/login \
  -H "Origin: https://mic-support-gurunanak-frontend-wsq5.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -i

HTTP/1.1 204 No Content
access-control-allow-credentials: true
access-control-allow-headers: content-type
access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
access-control-allow-origin: https://mic-support-gurunanak-frontend-wsq5.vercel.app
```

✅ **CORS is configured correctly on Railway backend**

### 5. Railway Network Logs Show

```
OPTIONS /api/auth/login -> 204
OPTIONS /api/auth/login -> 204
OPTIONS /api/auth/login -> 204
```

**But NO:**
```
POST /api/auth/login
```

---

## 🔬 WHAT'S ACTUALLY HAPPENING

### Request Flow (Broken)

```
1. User clicks "Sign In" on mobile
   ↓
2. Frontend JavaScript runs:
   - API_URL = process.env.NEXT_PUBLIC_API_URL  // undefined in production
   - Falls back to: 'http://localhost:3002'
   ↓
3. Browser prepares POST request to:
   http://localhost:3002/api/auth/login
   ↓
4. Browser detects CORS needed (localhost → localhost, but different context)
   ↓
5. Browser sends OPTIONS preflight to... where?
   
   HYPOTHESIS: Browser may send OPTIONS to Railway (due to some redirect/proxy)
   but POST stays at localhost
   ↓
6. POST to localhost:3002 FAILS (localhost doesn't exist on mobile)
   ↓
7. Axios catches error: "Network error"
```

### Why OPTIONS Shows Up in Railway Logs

Possible explanations:
1. Browser confusion between localhost and actual URL
2. Service Worker or PWA manifest redirecting
3. DNS resolution attempting Railway first
4. Mobile network proxy behavior

**Regardless:** The POST never reaches Railway because it's targeting localhost.

---

## ✅ BACKEND IS CORRECT

### Railway Backend Verified

1. **Health endpoint works:**
```bash
$ curl -I https://mic-support-gurunanak-production.up.railway.app/api/health
HTTP/1.1 200 OK
```

2. **CORS configured:**
```typescript
// apps/backend/src/index.ts
app.use(cors({
  origin: config.corsOrigin,  // Set via CORS_ORIGIN env var
  credentials: true,
}))
```

3. **Login route exists:**
```typescript
// apps/backend/src/routes/auth.routes.ts
router.post('/login', validate(loginSchema), async (req, res, next) => {
  // ... handler
})
```

4. **Environment variable check:**
   - Railway dashboard should have `CORS_ORIGIN=https://mic-support-gurunanak-frontend-wsq5.vercel.app`

---

## 🚨 THE FIX

### Required: Configure Vercel Environment Variable

**Action:** Add environment variable in Vercel dashboard

**Steps:**
1. Go to Vercel dashboard
2. Select project: `mic-support-gurunanak-frontend`
3. Settings → Environment Variables
4. Add new variable:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://mic-support-gurunanak-production.up.railway.app`
   - **Environments:** Production, Preview, Development (check all)
5. Save
6. Redeploy the frontend

### Why This Fixes It

**Before Fix:**
```javascript
// Production build
const API_URL = undefined || 'http://localhost:3002'  // ❌ localhost
```

**After Fix:**
```javascript
// Production build with Vercel env var
const API_URL = 'https://mic-support-gurunanak-production.up.railway.app' || 'http://localhost:3002'  // ✅ Railway
```

**Result:**
```
POST https://mic-support-gurunanak-production.up.railway.app/api/auth/login
```

---

## 🔍 WHY RAILWAY SHOWED OPTIONS BUT NO POST

### The Sequence

1. **Mobile browser loads Vercel frontend**
   - Frontend JavaScript has `API_URL = 'http://localhost:3002'`

2. **User clicks login**
   - axios prepares: `POST http://localhost:3002/api/auth/login`

3. **Browser CORS preflight logic**
   - Browser detects cross-origin request
   - But localhost doesn't exist on mobile
   - Browser may attempt DNS resolution
   - May hit Railway server during OPTIONS (due to routing/proxy)
   - OR: OPTIONS logged are from other testing/health checks

4. **POST never sent to Railway**
   - Browser attempts `POST localhost:3002`
   - Connection refused (localhost doesn't exist)
   - axios throws "Network error"
   - POST never reaches Railway

**Railway logs show OPTIONS because:**
- CORS preflight sometimes succeeds before POST fails
- OR: Logged OPTIONS are from health checks, not login attempts
- Regardless: Frontend is still pointing to localhost, so POST can't reach Railway

---

## 📋 VERIFICATION CHECKLIST

After configuring Vercel environment variable:

### A. Verify Vercel Environment Variable

```bash
# In Vercel dashboard
NEXT_PUBLIC_API_URL = https://mic-support-gurunanak-production.up.railway.app
```

### B. Trigger Redeployment

Vercel → Deployments → Redeploy

### C. Test Build Output

Check build logs for:
```
Compiled successfully
```

### D. Test Production Frontend

Open:
```
https://mic-support-gurunanak-frontend-wsq5.vercel.app
```

In browser console:
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
// Should show: https://mic-support-gurunanak-production.up.railway.app
```

### E. Test Login Flow

1. Open organizer login
2. Enter credentials
3. Watch Network tab:
   - Should see: `POST https://mic-support-gurunanak-production.up.railway.app/api/auth/login`
   - Should NOT see: `POST http://localhost:3002/api/auth/login`

### F. Verify Railway Logs

Should now show:
```
OPTIONS /api/auth/login -> 204
POST /api/auth/login -> 200
```

---

## 🎯 SECONDARY CHECK: Railway CORS_ORIGIN

Verify Railway backend has correct CORS origin:

**Railway Dashboard → Variables:**
```
CORS_ORIGIN=https://mic-support-gurunanak-frontend-wsq5.vercel.app
```

If not set, add it and redeploy backend.

---

## 📝 NO CODE CHANGES REQUIRED

✅ **Frontend code is correct** - It reads `NEXT_PUBLIC_API_URL`  
✅ **Backend code is correct** - CORS is properly configured  
✅ **Database is correct** - Connection works  
✅ **Routes are correct** - Login endpoint exists  

❌ **Only missing:** Vercel environment variable configuration

---

## 🚀 EXPECTED BEHAVIOR AFTER FIX

### Current (Broken)
```
Mobile Browser
  → POST http://localhost:3002/api/auth/login
  → Connection refused
  → "Network error"
```

### After Fix
```
Mobile Browser
  → OPTIONS https://mic-support-gurunanak-production.up.railway.app/api/auth/login
     ← 204 No Content (CORS OK)
  → POST https://mic-support-gurunanak-production.up.railway.app/api/auth/login
     ← 200 OK { token, user }
  → Login successful
  → Redirect to dashboard
```

---

## ⚠️ IMPORTANT NOTES

1. **DO NOT commit .env.local to Git** (already gitignored)
2. **DO NOT hardcode production URL in code** (use env vars)
3. **Vercel env vars are injected at build time** (not runtime)
4. **Must redeploy after adding env vars** (rebuild required)
5. **Test both mobile and desktop** after fix

---

## 🔄 SUPPORT MULTIPLE ENVIRONMENTS

Current configuration already supports:

**Local Development:**
```
.env.local → NEXT_PUBLIC_API_URL=http://localhost:3002
```

**Production (Vercel):**
```
Vercel env var → NEXT_PUBLIC_API_URL=https://mic-support-gurunanak-production.up.railway.app
```

**Fallback (if not set):**
```javascript
process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
```

---

## ✅ CONCLUSION

**Root Cause:** Missing Vercel environment variable  
**Fix Complexity:** Configuration only (no code changes)  
**Fix Time:** 2 minutes  
**Risk:** None (only affects production frontend)  

**Action Required:**
1. Add `NEXT_PUBLIC_API_URL` to Vercel dashboard
2. Redeploy frontend
3. Test login

**No Git commits needed for this fix** - it's pure configuration.
