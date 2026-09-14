# Environment Configuration Guide

## Overview

This document explains all environment variables used in the Live Translation Application, their purposes, required vs optional status, and secure configuration practices.

---

## Backend Environment Variables

**File Location:** `apps/backend/.env`

### Server Configuration

#### `NODE_ENV`
- **Purpose:** Determines runtime environment
- **Values:** `development` | `production` | `test`
- **Required:** Yes
- **Default:** `development`
- **Example:** `NODE_ENV=production`
- **Impact:**
  - `development`: Verbose logging, no caching, detailed errors
  - `production`: Minimal logging, caching enabled, generic errors
  - `test`: Test database, mock services

#### `PORT`
- **Purpose:** Backend server HTTP port
- **Required:** Yes
- **Default:** `3001`
- **Example:** `PORT=3001`
- **Notes:**
  - Must not conflict with frontend (3000)
  - Ports <1024 require root/admin privileges
  - Use 80 (HTTP) or 443 (HTTPS) in production behind proxy

#### `CORS_ORIGIN`
- **Purpose:** Allowed origins for CORS
- **Required:** Yes
- **Example:** `CORS_ORIGIN=http://localhost:3000`
- **Multiple origins:** `CORS_ORIGIN=http://localhost:3000,https://yourdomain.com`
- **Security:** Never use `*` in production
- **Validation:** Must match frontend URL exactly (including protocol and port)

---

### JWT Configuration

#### `JWT_SECRET`
- **Purpose:** Secret key for signing JWT tokens
- **Required:** Yes
- **Security:** **CRITICAL** - Keep secret, never commit to git
- **Minimum length:** 32 characters (64+ recommended)
- **Example:** `JWT_SECRET=your-super-secret-64-character-random-string-here-change-me`
- **Generation:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- **Rotation:** Change periodically (invalidates all existing tokens)
- **Per-environment:** Use different secrets for dev/staging/production

#### `JWT_EXPIRES_IN`
- **Purpose:** JWT token expiration time
- **Required:** No
- **Default:** `7d` (7 days)
- **Format:** Zeit/ms format (`60`, `2h`, `7d`, `30d`)
- **Example:** `JWT_EXPIRES_IN=30d`
- **Trade-offs:**
  - Shorter: More secure, frequent re-logins
  - Longer: Convenient, higher risk if token stolen
- **Recommendation:** 7-14 days for production

---

### Database Configuration

#### `DATABASE_URL`
- **Purpose:** PostgreSQL connection string
- **Required:** Yes
- **Format:** `postgresql://[user]:[password]@[host]:[port]/[database]`
- **Example:** `DATABASE_URL=postgresql://postgres:SecurePass123@localhost:5432/live_translation`
- **Components:**
  - `user`: Database username
  - `password`: Database password (URL-encoded if special characters)
  - `host`: Database hostname/IP
  - `port`: Database port (default 5432)
  - `database`: Database name
- **Security:**
  - **NEVER commit real passwords**
  - Use strong passwords (16+ characters, mixed case, numbers, symbols)
  - Use separate databases for dev/staging/production
- **Connection Pool:**
  - Automatically managed by `pg` library
  - Default: 10 connections
  - Configurable in `apps/backend/src/database/index.ts`

#### `DATABASE_SSL`
- **Purpose:** Enable SSL for database connection
- **Required:** No (required for cloud databases)
- **Values:** `true` | `false`
- **Example:** `DATABASE_SSL=true`
- **When needed:**
  - AWS RDS
  - Google Cloud SQL
  - Azure Database
  - Heroku Postgres
- **Local development:** Usually `false`

---

### Session Configuration

#### `MAX_STUDENTS_PER_SESSION`
- **Purpose:** Maximum students allowed per session
- **Required:** No
- **Default:** `100`
- **Range:** `1` to `500`
- **Example:** `MAX_STUDENTS_PER_SESSION=200`
- **Considerations:**
  - Higher = more resource usage
  - Tested up to 100 students
  - 500 theoretical max (untested)
  - Network bandwidth: ~100KB/s per student

#### `SESSION_CODE_LENGTH`
- **Purpose:** Length of generated session codes
- **Required:** No
- **Default:** `6`
- **Range:** `4` to `10`
- **Example:** `SESSION_CODE_LENGTH=6`
- **Trade-offs:**
  - Shorter: Easier to type, more collisions
  - Longer: Harder to type, fewer collisions
- **Recommendation:** Keep at 6 (good balance)

#### `SESSION_EXPIRY_HOURS`
- **Purpose:** Hours until session expires
- **Required:** No
- **Default:** `24`
- **Example:** `SESSION_EXPIRY_HOURS=48`
- **Notes:**
  - Expired sessions can't be joined
  - No automatic cleanup (manual deletion needed)
  - Consider implementing cron job for cleanup

---

### AI Provider Configuration

#### `STT_PROVIDER`
- **Purpose:** Speech-to-Text provider selection
- **Required:** No
- **Default:** `browser`
- **Values:** `browser` | `google` | `mock`
- **Example:** `STT_PROVIDER=browser`
- **Providers:**
  - `browser`: Web Speech API (Chrome/Edge only, free)
  - `google`: Google Cloud Speech-to-Text (requires credentials, paid)
  - `mock`: Returns empty transcripts (testing only)
- **Current implementation:** `browser` works, `google` partially implemented

#### `TRANSLATION_PROVIDER`
- **Purpose:** Translation provider selection
- **Required:** No
- **Default:** `mock`
- **Values:** `google` | `mock`
- **Example:** `TRANSLATION_PROVIDER=mock`
- **Providers:**
  - `google`: Google Cloud Translation API (requires credentials, paid)
  - `mock`: Returns "Translated: [original]" (testing only)
- **Current implementation:** Only `mock` fully works

#### `TTS_PROVIDER`
- **Purpose:** Text-to-Speech provider selection
- **Required:** No
- **Default:** `mock`
- **Values:** `google` | `mock`
- **Example:** `TTS_PROVIDER=mock`
- **Providers:**
  - `google`: Google Cloud Text-to-Speech (requires credentials, paid)
  - `mock`: Returns silent audio buffers (testing only)
- **Current implementation:** Only `mock` fully works

---

### Google Cloud Configuration

#### `GOOGLE_APPLICATION_CREDENTIALS`
- **Purpose:** Path to Google Cloud service account JSON key
- **Required:** Only if using Google providers
- **Example:** `GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-cloud-key.json`
- **Security:**
  - **NEVER commit key file to git**
  - Add `credentials/` to `.gitignore`
  - Restrict key permissions: 
    - Speech-to-Text API
    - Translation API
    - Text-to-Speech API
- **Setup:**
  ```bash
  mkdir -p apps/backend/credentials
  # Download key from Google Cloud Console
  mv ~/Downloads/key.json apps/backend/credentials/google-cloud-key.json
  chmod 600 apps/backend/credentials/google-cloud-key.json
  ```

#### `GOOGLE_CLOUD_PROJECT_ID`
- **Purpose:** Google Cloud project ID
- **Required:** Only if using Google providers
- **Example:** `GOOGLE_CLOUD_PROJECT_ID=live-translation-prod`
- **Find it:** Google Cloud Console → Project Info
- **Format:** Lowercase letters, numbers, hyphens only

---

### Logging Configuration

#### `LOG_LEVEL`
- **Purpose:** Minimum log level to output
- **Required:** No
- **Default:** `info`
- **Values:** `error` | `warn` | `info` | `http` | `verbose` | `debug` | `silly`
- **Example:** `LOG_LEVEL=info`
- **Recommendations:**
  - Development: `debug` or `verbose`
  - Staging: `info`
  - Production: `warn` or `error`
- **Log files:**
  - `apps/backend/logs/error.log` - Errors only
  - `apps/backend/logs/combined.log` - All logs

#### `LOG_TO_FILE`
- **Purpose:** Enable/disable file logging
- **Required:** No
- **Default:** `true`
- **Values:** `true` | `false`
- **Example:** `LOG_TO_FILE=true`
- **Production:** Always `true`
- **Docker:** Consider `false` and use container logging

---

## Frontend Environment Variables

**File Location:** `apps/frontend/.env.local`

**Note:** Next.js requires `NEXT_PUBLIC_` prefix for client-side variables.

### API Configuration

#### `NEXT_PUBLIC_API_URL`
- **Purpose:** Backend API base URL
- **Required:** Yes
- **Example:** `NEXT_PUBLIC_API_URL=http://localhost:3001`
- **Production:** `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`
- **Notes:**
  - Must be accessible from user's browser
  - Include protocol (http/https)
  - No trailing slash

#### `NEXT_PUBLIC_SOCKET_URL`
- **Purpose:** WebSocket server URL
- **Required:** No (defaults to API_URL)
- **Example:** `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001`
- **Production:** `NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com`
- **Notes:**
  - Usually same as API_URL
  - Can be different if using separate WebSocket server

---

### Feature Flags (Optional)

#### `NEXT_PUBLIC_ENABLE_ANALYTICS`
- **Purpose:** Enable analytics tracking
- **Required:** No
- **Default:** `false`
- **Values:** `true` | `false`
- **Example:** `NEXT_PUBLIC_ENABLE_ANALYTICS=true`
- **Note:** Not currently implemented

#### `NEXT_PUBLIC_ENABLE_DEBUG`
- **Purpose:** Enable debug mode UI
- **Required:** No
- **Default:** `false`
- **Values:** `true` | `false`
- **Example:** `NEXT_PUBLIC_ENABLE_DEBUG=true`
- **Impact:** Shows extra debugging info in UI

---

## Environment File Examples

### Development (.env)

**Backend (`apps/backend/.env`):**
```bash
# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# JWT
JWT_SECRET=dev-secret-change-in-production-12345
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/live_translation

# Session
MAX_STUDENTS_PER_SESSION=100
SESSION_CODE_LENGTH=6
SESSION_EXPIRY_HOURS=24

# AI Providers (Mock for dev)
STT_PROVIDER=browser
TRANSLATION_PROVIDER=mock
TTS_PROVIDER=mock

# Logging
LOG_LEVEL=debug
LOG_TO_FILE=true
```

**Frontend (`apps/frontend/.env.local`):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_DEBUG=true
```

---

### Production (.env)

**Backend (`apps/backend/.env`):**
```bash
# Server
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com

# JWT - MUST CHANGE
JWT_SECRET=<GENERATE_SECURE_64_CHAR_STRING>
JWT_EXPIRES_IN=14d

# Database - Use strong password
DATABASE_URL=postgresql://<user>:<strong-password>@<host>:5432/live_translation
DATABASE_SSL=true

# Session
MAX_STUDENTS_PER_SESSION=100
SESSION_CODE_LENGTH=6
SESSION_EXPIRY_HOURS=24

# AI Providers - Use Google Cloud
STT_PROVIDER=google
TRANSLATION_PROVIDER=google
TTS_PROVIDER=google
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-cloud-prod.json
GOOGLE_CLOUD_PROJECT_ID=live-translation-prod

# Logging
LOG_LEVEL=warn
LOG_TO_FILE=true
```

**Frontend (`apps/frontend/.env.local`):**
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

---

## Security Best Practices

### DO:
✅ Use separate secrets for dev/staging/production
✅ Generate cryptographically secure random secrets
✅ Add `.env` to `.gitignore` (already done)
✅ Use environment variable management (AWS Secrets Manager, etc.)
✅ Rotate secrets periodically
✅ Use strong database passwords (16+ characters)
✅ Enable SSL for production databases
✅ Restrict Google Cloud IAM permissions
✅ Use different Google Cloud projects for dev/prod

### DON'T:
❌ Commit `.env` files to git
❌ Share secrets via email/chat
❌ Use weak passwords ("password123", "admin")
❌ Use same secrets across environments
❌ Hardcode secrets in code
❌ Use `CORS_ORIGIN=*` in production
❌ Expose secrets in error messages
❌ Log secrets to files

---

## Validation

### Required Variables Check

**Backend:**
```typescript
// apps/backend/src/config/index.ts validates:
- NODE_ENV
- PORT
- CORS_ORIGIN
- JWT_SECRET
- DATABASE_URL

// Throws error if missing or invalid
```

**Frontend:**
```typescript
// Next.js validates at build time:
- NEXT_PUBLIC_API_URL

// Runtime check:
if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is required');
}
```

### Test Configuration

```bash
# Verify backend config
cd apps/backend
npm run type-check
npm run dev
# Should start without errors

# Verify frontend config
cd apps/frontend
npm run build
# Should build without errors

# Test health endpoint
curl http://localhost:3001/api/health
# Should return: {"status":"healthy",...}
```

---

## Deployment Checklist

Before deploying:

- [ ] All required variables set
- [ ] Secrets are strong and unique
- [ ] `.env` files NOT committed to git
- [ ] Google Cloud credentials restricted
- [ ] Database uses SSL
- [ ] CORS origins whitelist only production URLs
- [ ] Log level appropriate (warn/error)
- [ ] JWT_SECRET rotated from dev
- [ ] Database password changed from dev
- [ ] Test health endpoint returns 200
- [ ] Test session creation works
- [ ] Test student join works

---

## Troubleshooting

### "Config validation failed"

**Cause:** Required environment variable missing

**Fix:**
```bash
# Check which variable is missing in error message
# Add to .env file
# Restart application
```

### "Database connection failed"

**Cause:** Invalid `DATABASE_URL`

**Fix:**
```bash
# Test connection manually
psql "$DATABASE_URL" -c "SELECT 1;"

# Common issues:
# - Wrong password
# - Wrong host/port
# - Database doesn't exist
# - SSL required but not enabled
```

### "CORS error"

**Cause:** `CORS_ORIGIN` doesn't match frontend URL

**Fix:**
```bash
# Backend .env
CORS_ORIGIN=http://localhost:3000

# Must match EXACTLY:
# - Protocol (http/https)
# - Domain
# - Port
```

### "JWT secret missing"

**Cause:** `JWT_SECRET` not set or too short

**Fix:**
```bash
# Generate secure secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Add to .env
echo "JWT_SECRET=$JWT_SECRET" >> apps/backend/.env
```

---

## References

- [dotenv documentation](https://github.com/motdotla/dotenv)
- [Next.js environment variables](https://nextjs.org/docs/basic-features/environment-variables)
- [PostgreSQL connection strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [JWT best practices](https://tools.ietf.org/html/rfc8725)
- [Google Cloud authentication](https://cloud.google.com/docs/authentication/getting-started)

---

**Need help?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or [SETUP.md](./SETUP.md)
