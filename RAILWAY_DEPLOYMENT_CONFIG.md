# Railway Deployment Configuration (Backend)

Your backend is deployed on Railway. The monorepo structure requires special configuration.

## ✅ Files Added

Two configuration files have been added to handle the monorepo:

- `railway.toml` - Railway-specific build configuration
- `nixpacks.toml` - Nixpacks builder configuration (Railway uses this)

## 🔧 Railway Dashboard Settings

### **If the automatic config doesn't work, configure manually:**

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your backend service**
3. **Go to Settings**

### **Root Directory:**
Leave blank or set to `.` (workspace root)

### **Build Command:**
```bash
npm install && npm run build --workspace=packages/shared && npm run build --workspace=apps/backend
```

### **Start Command:**
```bash
npm start --workspace=apps/backend
```

### **Watch Paths (Optional):**
```
apps/backend/**
packages/shared/**
```
This ensures Railway only rebuilds when backend or shared package changes.

---

## 🌐 Environment Variables

Make sure these are set in **Railway** → **Your Service** → **Variables**:

```bash
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://...

# Groq API (STT and Translation)
GROQ_API_KEY=your_groq_api_key

# Google Cloud TTS
# IMPORTANT: Add your service account JSON key as a single-line string
# Get from: Google Cloud Console → IAM → Service Accounts → Keys
# Convert to single line: cat key.json | jq -c .
GOOGLE_CLOUD_KEY_JSON={"type":"service_account","project_id":"...","private_key":"..."}

# JWT
JWT_SECRET=your_jwt_secret

# CORS
FRONTEND_URL=https://your-frontend.vercel.app
ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Session
SESSION_SECRET=your_session_secret
```

**Note on GOOGLE_CLOUD_KEY_JSON:**
- Must be the ENTIRE JSON key file contents
- Must be on ONE LINE (no line breaks)
- Use `jq -c .` to compact JSON: `cat your-key.json | jq -c .`
- Or manually remove all newlines from the JSON

---

## 🚀 Deploy

After pushing the new config files:

1. Railway will automatically detect the changes
2. It will rebuild using the new configuration
3. The build should succeed now

If it doesn't auto-deploy:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment

---

## 🐛 Troubleshooting

### Error: `@live-translation/shared` not found

**Cause:** Railway is trying to install from npm registry, but it's a local workspace package.

**Solution:** 
- Use the `railway.toml` and `nixpacks.toml` configs provided
- OR set Root Directory to workspace root and use workspace commands

### Build succeeds but app crashes on start

**Check:**
- Start command is correct: `npm start --workspace=apps/backend`
- All environment variables are set
- Database connection string is correct
- Port is set correctly (Railway provides PORT automatically)

---

## 📝 Quick Fix Checklist

- [x] `railway.toml` added to repository
- [x] `nixpacks.toml` added to repository
- [ ] Push changes to GitHub
- [ ] Railway auto-deploys
- [ ] Check environment variables
- [ ] Verify deployment succeeds

---

## 🔄 Alternative: Deploy from Backend Directory Only

If monorepo setup is too complex, you can:

1. Create a new Railway service
2. Set **Root Directory** to `apps/backend`
3. **But** you'll need to copy or build the shared package first

This is NOT recommended - better to fix the monorepo setup.
