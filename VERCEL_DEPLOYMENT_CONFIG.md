# Vercel Deployment Configuration

Your frontend is deployed on Vercel. Follow these steps to fix the 404 error:

## ⚡ **EASIEST FIX** - Set Root Directory to Workspace Root

This is the simplest approach:

### Option A: Root at Workspace Root (RECOMMENDED)

1. **Go to Vercel** → Your Project → **Settings** → **General**

2. **Root Directory:** Leave blank or set to `.` (workspace root)

3. **Framework Preset:** `Other`

4. **Build Command:**
   ```bash
   npm run build --workspace=packages/shared && npm run build --workspace=apps/frontend
   ```

5. **Output Directory:**
   ```
   apps/frontend/.next
   ```

6. **Install Command:**
   ```bash
   npm install
   ```

7. **Save** and **Redeploy**

---

## 🔧 Alternative: Root at Frontend Directory

If you want Root Directory at `apps/frontend` (not recommended for monorepo):

1. **Go to your Vercel project**: https://vercel.com/dashboard
2. **Select your project** (the frontend deployment)
3. **Go to Settings** → **General**

### Configure these settings:

#### **Root Directory**
```
apps/frontend
```
☑️ **IMPORTANT:** Check "Include source files outside of the Root Directory in the Build Step"

#### **Build & Development Settings**

**Framework Preset:** `Next.js`

**Build Command:**
```bash
cd ../../packages/shared && npm install && npm run build && cd ../../apps/frontend && npm install && npm run build
```

**Alternative Build Command (if workspace commands work):**
```bash
npm --prefix ../../ run build --workspace=packages/shared && npm run build
```

**Output Directory:**
```
.next
```
(Leave as default, relative to Root Directory)

**Install Command:**
```bash
cd ../../ && npm install
```

**Alternative Install Command:**
```bash
npm --prefix ../../ install
```

#### **Node.js Version**
```
18.x
```

---

## 🌐 Environment Variables

Make sure these are set in Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=<your-backend-url>
NEXT_PUBLIC_SOCKET_URL=<your-backend-url>
```

Example:
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com
```

---

## 🚀 After Configuration

1. **Save settings**
2. **Redeploy**: Go to Deployments → Click the three dots on latest deployment → "Redeploy"
3. **Wait** for build to complete
4. **Test** your site

---

## ❌ Alternative: Simple Vercel Configuration (If above doesn't work)

If the monorepo setup is too complex, you can deploy ONLY the frontend folder:

1. Create a new Vercel project
2. When importing from Git, select **only** the `apps/frontend` directory
3. Use these settings:
   - **Root Directory:** `.` (current directory)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

But you'll need to manually copy the shared package into frontend or publish it to npm.

---

## 🐛 Current Issue

The 404 error means Vercel can't find the correct build output because it's looking in the wrong directory. The settings above will fix this.

---

## 📝 Quick Fix Checklist

- [ ] Set Root Directory to `apps/frontend`
- [ ] Enable "Include source files outside Root Directory"
- [ ] Update Build Command to build shared package first
- [ ] Update Install Command to install from workspace root
- [ ] Set environment variables
- [ ] Redeploy

Once these are configured, your deployment will work! 🎉
