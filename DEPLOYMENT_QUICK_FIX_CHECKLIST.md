# ⚡ Deployment Quick Fix Checklist
## MIC SUPPORT GURUNANAK - Action Items

**Time Required:** ~2 hours  
**Priority:** Complete before Git push and deployment

---

## 🔴 CRITICAL - Do First (30 minutes)

### 1. Clean Up Junk Files (2 min)

```bash
cd "c:\Users\maddili ramana\Desktop\MIC SUPPORT GURUNANAK"
rm appsbackend.env
rmdir appsbackendlogs
```

---

### 2. Update .gitignore (3 min)

**Edit:** `.gitignore`

**Add these lines at the end:**

```gitignore
# Additional safety for environment files
.env*
!.env*.example
apps/*/.env
apps/*/.env.local

# Log files (ensure these are ignored)
apps/backend/logs/*.log
```

---

### 3. Generate Strong JWT Secret (5 min)

**Open Git Bash and run:**

```bash
# Generate a secure random secret
openssl rand -base64 48
```

**Copy the output** (will look like: `Xq7p9LmK3...`)

**Save it somewhere safe** - you'll need it for production.

---

### 4. Update apps/backend/.env (5 min)

**Edit:** `apps/backend/.env`

**Change:**
```env
# BEFORE
JWT_SECRET=dev-secret-change-in-production-12345
DATABASE_URL="postgresql://postgres:ramana@localhost:5433/mic_support"

# AFTER (for development only - use different values in production)
JWT_SECRET=dev-secret-local-only-do-not-use-in-production
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/mic_support"
```

**⚠️ Important:** Replace `YOUR_PASSWORD` with your actual local password.

---

### 5. Initialize Git Repository (10 min)

```bash
cd "c:\Users\maddili ramana\Desktop\MIC SUPPORT GURUNANAK"

# Initialize Git
git init

# Ensure .env files are not tracked
git rm --cached apps/backend/.env 2>/dev/null || true
git rm --cached apps/frontend/.env.local 2>/dev/null || true
git rm --cached apps/backend/logs/*.log 2>/dev/null || true

# Check status (ensure no secrets)
git status

# Add all files
git add .

# Commit
git commit -m "Initial commit: MIC SUPPORT GURUNANAK - Live Translation System

Features:
- 20 language support (13 Indian + 7 International)
- Real-time translation via WebSocket
- Organizer and student interfaces
- PostgreSQL database integration
- JWT authentication
- Session management with QR codes
- Mobile-responsive UI

Tech stack:
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, Socket.IO, PostgreSQL
- Shared: TypeScript types and utilities
"
```

---

## 🟡 IMPORTANT - Before Deployment (1 hour)

### 6. Update Port References (10 min)

#### apps/backend/.env.example
**Change line 3:**
```env
PORT=3002
```

#### apps/frontend/.env.local.example
**Change line 1:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

#### apps/frontend/next.config.js
**Change line 6:**
```javascript
NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
```

#### apps/frontend/src/lib/api.ts
**Change line 12:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
```

#### apps/frontend/src/lib/socket.ts
**Change line 4:**
```typescript
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
```

---

### 7. Create vercel.json (5 min)

**Create:** `vercel.json` in root directory

```json
{
  "version": 2,
  "name": "mic-support-gurunanak",
  "builds": [
    {
      "src": "apps/frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "apps/frontend/$1"
    }
  ]
}
```

---

### 8. Create Production Environment Examples (10 min)

#### Create: `apps/frontend/.env.production.example`

```env
# Production Frontend Environment Variables

# Backend API URL (REQUIRED)
# Replace with your deployed backend URL
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# IMPORTANT:
# - Must start with NEXT_PUBLIC_ to be accessible in browser
# - Set this in Vercel dashboard → Environment Variables
# - Include protocol (https://) and NO trailing slash
# - Example: https://mic-support-backend.railway.app
```

#### Create: `apps/backend/.env.production.example`

```env
# Production Backend Environment Variables

# Server Configuration
NODE_ENV=production
PORT=3002

# CORS Origin (REQUIRED)
# Set to your Vercel frontend URL after deployment
# Example: https://mic-support-gurunanak.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app

# JWT Configuration (REQUIRED)
# Generate: openssl rand -base64 48
# NEVER use the development secret in production!
JWT_SECRET=REPLACE_WITH_STRONG_RANDOM_SECRET_MINIMUM_32_CHARS
JWT_EXPIRES_IN=7d

# Database Configuration (REQUIRED)
# Get from your database provider (Railway, Supabase, Neon, etc.)
# Include SSL: ?ssl=true or ?sslmode=require
DATABASE_URL=postgresql://user:password@host:5432/database?ssl=true

# Session Configuration
MAX_STUDENTS_PER_SESSION=100
SESSION_CODE_LENGTH=6
SESSION_EXPIRY_HOURS=24

# Logging
LOG_LEVEL=info

# Future API Keys (Optional - add when integrating real providers)
# GOOGLE_CLOUD_API_KEY=your-key-here
# AZURE_TRANSLATION_KEY=your-key-here
```

---

### 9. Update Frontend Build Script (5 min)

**Edit:** `apps/frontend/package.json`

**Change the `build` script:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "cd ../../packages/shared && npm run build && cd ../../apps/frontend && next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

---

### 10. Create .gitattributes (3 min)

**Create:** `.gitattributes` in root directory

```
# Auto detect text files and perform LF normalization
* text=auto

# Shell scripts always use LF
*.sh text eol=lf

# Windows batch files always use CRLF
*.bat text eol=crlf

# Binary files
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.pdf binary
*.db binary
```

---

### 11. Update Root package.json Build Order (5 min)

**Edit:** `package.json` (root)

**Change the `build` script:**

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "build": "npm run build --workspace=packages/shared && npm run build --workspace=apps/backend && npm run build --workspace=apps/frontend",
    "start": "npm run start --workspaces",
    "lint": "npm run lint --workspaces",
    "type-check": "npm run type-check --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

---

### 12. Update README.md (10 min)

**Edit:** `README.md`

**Find and replace:**

1. **Port 3001 → 3002** (all occurrences)
   - "http://localhost:3001" → "http://localhost:3002"
   - "PORT=3001" → "PORT=3002"

2. **Update Supported Languages section:**

Replace:
```markdown
## 🌐 Supported Languages

- English (en)
- Telugu (te)
- Hindi (hi)
- Tamil (ta)
- Kannada (kn)
- Malayalam (ml)
```

With:
```markdown
## 🌐 Supported Languages (20 Total)

### Indian Languages (13)
- English (en) • Hindi (hi) • Telugu (te) • Tamil (ta)
- Kannada (kn) • Malayalam (ml) • Bengali (bn) • Marathi (mr)
- Gujarati (gu) • Punjabi (pa) • Urdu (ur) • Odia (or) • Assamese (as)

### International Languages (7)
- Spanish (es) • French (fr) • German (de)
- Chinese (zh) • Japanese (ja) • Korean (ko) • Arabic (ar)

For complete details, see [AVAILABLE_LANGUAGES.md](AVAILABLE_LANGUAGES.md)
```

3. **Add Note about bcrypt:**

After "Prerequisites" section, add:
```markdown
**Note:** The application currently uses mock password hashing instead of bcrypt due to Windows build issues. For production deployment, bcrypt should be re-enabled on a Linux server.
```

4. **Add PostgreSQL Port Note:**

In "Set up PostgreSQL database" section, add:
```markdown
**Important:** This application uses PostgreSQL on port **5433** (not the default 5432).
```

---

### 13. Commit All Changes (5 min)

```bash
# Check what changed
git status

# Add all changes
git add .

# Commit
git commit -m "Prepare for deployment: Update ports, add Vercel config, create production env examples"
```

---

## 🟢 OPTIONAL - Quality Improvements (30 min)

### 14. Create Deployment Guide (15 min)

**Create:** `DEPLOYMENT_GUIDE.md`

(Copy content from the detailed report's "Files to Create" section)

---

### 15. Test Local Build (10 min)

```bash
# Build shared package
cd packages/shared
npm run build
cd ../..

# Build frontend
cd apps/frontend
npm run build
cd ../..

# Build backend
cd apps/backend
npm run build
cd ../..
```

**Verify:** No build errors.

---

### 16. Create GitHub Repository (5 min)

1. Go to https://github.com/new
2. Repository name: `mic-support-gurunanak`
3. Description: "Real-time multilingual live translation system for educational events (20 languages)"
4. Visibility: **Private** (recommended) or Public
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

---

## 🚀 PUSH TO GITHUB

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/mic-support-gurunanak.git

# Rename branch to main (if needed)
git branch -M main

# Push
git push -u origin main
```

**Verify:** Go to GitHub and confirm files are uploaded (check no .env files visible).

---

## ✅ VERIFICATION CHECKLIST

After completing all steps, verify:

- [ ] Git repository initialized
- [ ] Junk files deleted (`appsbackend.env`, `appsbackendlogs`)
- [ ] .gitignore updated
- [ ] Log files NOT in Git
- [ ] .env files NOT in Git
- [ ] Port references updated to 3002
- [ ] `vercel.json` created
- [ ] Production `.env.*.example` files created
- [ ] `.gitattributes` created
- [ ] Root `package.json` build script updated
- [ ] Frontend build script updated
- [ ] README.md updated (20 languages, port 3002, PostgreSQL 5433)
- [ ] All changes committed
- [ ] Pushed to GitHub
- [ ] No secrets visible in GitHub repository

---

## 📊 Status After Completion

| Task | Time | Status |
|------|------|--------|
| Critical Fixes | 30 min | ✅ |
| Deployment Prep | 1 hour | ✅ |
| Optional Improvements | 30 min | ✅ |
| **TOTAL** | **2 hours** | **✅ READY** |

---

## 🎯 Next: Deploy!

After completing this checklist:

1. **Deploy Backend** → Railway, Render, or Heroku
   - Provision PostgreSQL
   - Set environment variables
   - Deploy backend code
   - Get backend URL

2. **Deploy Frontend** → Vercel
   - Import GitHub repo
   - Set root directory: `apps/frontend`
   - Add `NEXT_PUBLIC_API_URL` env variable
   - Deploy

3. **Update CORS** → Update backend `CORS_ORIGIN` with Vercel URL

4. **Test** → Register, create session, join as student

---

**Good luck with deployment! 🚀**

All fixes preserve existing functionality - no code changes, only configuration updates.
