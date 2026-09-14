# Module 14: Security Implementation Guide

## Overview

Comprehensive security implementation for production deployment of the Live Translation System.

---

## Security Measures Implemented

### 1. API Key Protection ✅

**Requirement**: Never expose AI provider API keys in frontend code.

**Implementation**:
- All API keys stored in backend environment variables
- Frontend never receives API keys
- Server-side API calls only
- `.env` files in `.gitignore`
- `.env.example` with placeholder values only

**Files**:
- `apps/backend/.env` (git-ignored, contains actual secrets)
- `apps/backend/.env.example` (tracked, no real secrets)
- `apps/backend/src/config/index.ts` (loads from env vars)

**Environment Variables**:
```bash
# Required secrets
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DATABASE_URL=postgresql://user:password@localhost:5432/live_translation

# Future provider keys (when integrated)
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key
AZURE_TRANSLATION_KEY=your-azure-key
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

---

### 2. Input Validation ✅

**File**: `apps/backend/src/middleware/input-validation.ts`

**Features**:
- Joi schema validation for all inputs
- Sanitization of strings (remove null bytes, control characters)
- UUID format validation
- Session code validation (alphanumeric, 6-10 chars)
- Language code validation (ISO 639)
- Email validation
- Prototype pollution prevention
- Max length enforcement

**Usage**:
```typescript
import { validateBody, commonSchemas } from '../middleware/input-validation';

// Validate request body
router.post('/sessions', 
  validateBody(Joi.object({
    title: commonSchemas.text.required(),
    maxStudents: Joi.number().integer().min(1).max(1000),
  })),
  sessionController.create
);
```

**Protections**:
- ✅ SQL injection (parameterized queries + validation)
- ✅ NoSQL injection (input sanitization)
- ✅ XSS (string sanitization)
- ✅ Path traversal (validated paths)
- ✅ Command injection (no shell execution with user input)
- ✅ Prototype pollution (blocked __proto__, constructor, prototype)

---

### 3. Session Authorization ✅

**File**: `apps/backend/src/middleware/session-auth.ts`

**Middleware Functions**:

1. **`verifySessionOwnership`**: Verify organizer owns session
2. **`verifyStudentInSession`**: Verify student belongs to session
3. **`verifySessionActive`**: Verify session is active/not expired
4. **`verifySessionByCode`**: Verify session by code (for joins)
5. **`rateLimitSessionJoins`**: Rate limit join attempts

**Usage**:
```typescript
// Organizer-only endpoint
router.get('/sessions/:sessionId',
  authenticateToken, // Verify JWT
  verifySessionOwnership, // Verify owns session
  sessionController.getDetails
);

// Student join
router.post('/sessions/join',
  rateLimitSessionJoins, // Prevent enumeration
  verifySessionByCode, // Verify code valid
  sessionController.joinSession
);
```

**Protections**:
- ✅ Unauthorized access to sessions
- ✅ Cross-session data access
- ✅ Session enumeration attacks
- ✅ Expired session access

---

### 4. Rate Limiting ✅

**File**: `apps/backend/src/middleware/rate-limit.ts`

**Rate Limits**:

| Endpoint Type | Limit | Window | Per |
|---------------|-------|--------|-----|
| Authentication | 5 | 5 minutes | IP |
| Session Creation | 10 | 1 hour | User |
| Session Join | 20 | 1 minute | IP |
| Password Reset | 3 | 1 hour | Email |
| API Calls | 100 | 1 minute | IP |

**Features**:
- Sliding window algorithm
- Per-IP and per-user limits
- Custom key generators
- Rate limit headers (X-RateLimit-*)
- Automatic cleanup of expired entries

**Usage**:
```typescript
import { authRateLimit, apiRateLimit } from '../middleware/rate-limit';

// Authentication endpoints (strict)
router.post('/auth/login', authRateLimit, authController.login);

// API endpoints (moderate)
router.use('/api', apiRateLimit);
```

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1694567890
Retry-After: 45
```

---

### 5. Security Headers ✅

**File**: `apps/backend/src/middleware/security-headers.ts`

**Headers Implemented**:

1. **HSTS** (HTTP Strict Transport Security)
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   - Forces HTTPS for 1 year

2. **CSP** (Content Security Policy)
   - Restricts script sources, styles, images
   - Allows WebSocket connections
   - Blocks inline scripts (except Socket.IO)

3. **X-Frame-Options**
   - `X-Frame-Options: DENY`
   - Prevents clickjacking

4. **X-Content-Type-Options**
   - `X-Content-Type-Options: nosniff`
   - Prevents MIME sniffing

5. **X-XSS-Protection**
   - `X-XSS-Protection: 1; mode=block`
   - Browser XSS filter

6. **Referrer-Policy**
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - Limits referrer information

7. **Permissions-Policy**
   - `Permissions-Policy: microphone=(self), camera=(), geolocation=()`
   - Controls browser features

8. **Removes X-Powered-By**
   - Hides Express/Node.js version

**Usage**:
```typescript
import { securityHeaders, additionalSecurityHeaders } from '../middleware/security-headers';

app.use(securityHeaders);
app.use(additionalSecurityHeaders);
```

---

### 6. CORS Configuration ✅

**File**: `apps/backend/src/middleware/security-headers.ts`

**Configuration**:
```typescript
{
  origin: process.env.CORS_ORIGIN, // Whitelist only
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-*'],
  maxAge: 86400, // 24 hours
}
```

**Environment Variables**:
```bash
# Single origin
CORS_ORIGIN=https://yourdomain.com

# Multiple origins (comma-separated)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**Protections**:
- ✅ Cross-origin requests blocked (except whitelisted)
- ✅ Credentials only sent to trusted origins
- ✅ Preflight requests handled correctly

---

### 7. Secure Session IDs ✅

**File**: `apps/backend/src/utils/secure-id.ts`

**Functions**:

1. **`generateSessionCode(length)`**: Cryptographically secure session codes
   - Uses `crypto.randomBytes()`
   - 36^6 = 2.1 billion combinations (6 chars)
   - Safe with rate limiting

2. **`generateUUID()`**: Standard UUID v4

3. **`generateSecureToken(bytes)`**: Random tokens

4. **`timingSafeEqual(a, b)`**: Timing-safe string comparison

**Usage**:
```typescript
import { generateSessionCode, generateUUID } from '../utils/secure-id';

// Generate session code
const code = generateSessionCode(6); // e.g., "A3X9K2"

// Generate UUID
const id = generateUUID(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

**Security**:
- ✅ No predictable patterns
- ✅ Cryptographically secure randomness
- ✅ No timing attack vulnerabilities

---

### 8. Output Sanitization ✅

**File**: `apps/backend/src/middleware/output-sanitization.ts`

**Features**:

1. **Error Sanitization**: Generic errors in production
2. **Stack Trace Removal**: No stack traces to clients in production
3. **Sensitive Field Redaction**: Remove passwords, tokens, keys
4. **Path Removal**: Strip file paths from errors
5. **Database String Removal**: Strip connection strings

**Redacted Fields**:
- password, passwordHash, password_hash
- secret, apiKey, api_key
- token, accessToken, refreshToken
- privateKey, private_key
- credentials

**Usage**:
```typescript
import { errorHandler, sanitizeResponse } from '../middleware/output-sanitization';

// Sanitize all responses
app.use(sanitizeResponse);

// Global error handler (must be last)
app.use(errorHandler);
```

**Example**:
```typescript
// Development error
{
  error: {
    message: "Database error at /app/src/database.ts:42",
    stack: "Error: ...\n at /app/src/..."
  }
}

// Production error (sanitized)
{
  error: {
    message: "An internal error occurred. Please try again later.",
    code: "INTERNAL_ERROR"
  }
}
```

---

### 9. WebSocket Security ✅

**File**: `apps/backend/src/middleware/websocket-auth.ts`

**Features**:

1. **Connection Verification**:
   - Verify organizer owns session
   - Verify student session code valid
   - Check session active/not expired

2. **Rate Limiting**:
   - 100 messages per minute per connection
   - Prevents message flooding

3. **Data Validation**:
   - Audio data size limits (1MB max)
   - Data sanitization (prevent prototype pollution)

4. **Authorization**:
   - Session-based authorization
   - Cross-session access prevention

**Usage in Socket Handler**:
```typescript
import { 
  verifyOrganizerConnection,
  verifyStudentConnection,
  checkWebSocketRateLimit,
  validateAudioDataSize 
} from '../middleware/websocket-auth';

// Student join
socket.on('JOIN_SESSION', async (payload, callback) => {
  const verification = await verifyStudentConnection(
    socket,
    payload.sessionCode,
    { name: payload.name, selectedLanguage: payload.language }
  );

  if (!verification.valid) {
    return callback({ success: false, error: verification.error });
  }

  // Continue with join...
});

// Audio stream
socket.on('AUDIO_STREAM', async (data) => {
  // Rate limit check
  if (!checkWebSocketRateLimit(socket.id)) {
    return; // Drop message
  }

  // Validate size
  if (!validateAudioDataSize(data.audio)) {
    return; // Drop oversized data
  }

  // Process audio...
});
```

---

### 10. Logging Security ✅

**Requirements**:
- Don't log audio buffers
- Don't log full translation text
- Don't log API keys
- Redact sensitive fields

**Implementation**:
```typescript
// ❌ BAD: Logging sensitive data
logger.info('Processing audio', { audio: audioBuffer }); // DON'T
logger.info('Translation result', { text: fullText }); // DON'T
logger.info('API call', { apiKey: config.apiKey }); // DON'T

// ✅ GOOD: Logging safely
logger.info('Processing audio', { size: audioBuffer.length }); // DO
logger.info('Translation result', { textLength: text.length }); // DO
logger.info('API call', { provider: 'google' }); // DO
```

**Logger Configuration**:
```typescript
// apps/backend/src/utils/logger.ts
const sensitiveKeys = ['password', 'token', 'apiKey', 'secret'];

// Redact sensitive fields before logging
function redactSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const redacted = { ...obj };
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  return redacted;
}
```

---

## Security Checklist

### Environment Variables ✅

- [x] All secrets in environment variables
- [x] `.env` in `.gitignore`
- [x] `.env.example` with placeholders only
- [x] No hard-coded secrets in code
- [x] Config validation on startup

### Input Validation ✅

- [x] All endpoints validate input
- [x] Joi schemas for request validation
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention (input sanitization)
- [x] Prototype pollution prevention
- [x] Max length enforcement

### Authentication & Authorization ✅

- [x] JWT for authentication
- [x] Session ownership verification
- [x] Student session verification
- [x] Cross-session access prevention
- [x] Expired session checks

### Rate Limiting ✅

- [x] Authentication endpoints: 5/5min
- [x] API endpoints: 100/min
- [x] Session joins: 20/min
- [x] WebSocket messages: 100/min
- [x] Rate limit headers

### Security Headers ✅

- [x] HSTS enabled
- [x] CSP configured
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] X-XSS-Protection enabled
- [x] Referrer-Policy set
- [x] Permissions-Policy configured
- [x] X-Powered-By removed

### CORS ✅

- [x] Whitelist origins only
- [x] Credentials enabled
- [x] Proper methods/headers
- [x] Preflight handling

### Output Sanitization ✅

- [x] Error messages sanitized
- [x] Stack traces removed (production)
- [x] Sensitive fields redacted
- [x] Generic 500 errors (production)

### WebSocket Security ✅

- [x] Connection authorization
- [x] Rate limiting per connection
- [x] Data size validation
- [x] Session verification

### Logging ✅

- [x] No audio buffers logged
- [x] No full text logged
- [x] No API keys logged
- [x] Sensitive fields redacted

### Secure IDs ✅

- [x] Cryptographically secure session codes
- [x] UUID v4 for IDs
- [x] No predictable patterns
- [x] Timing-safe comparisons

---

## Deployment Security Checklist

### Before Production

- [ ] Change all default secrets
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS only
- [ ] Configure firewall rules
- [ ] Set up monitoring/alerts
- [ ] Review all environment variables
- [ ] Test rate limiting
- [ ] Verify CORS whitelist
- [ ] Check security headers
- [ ] Review error messages

### Environment Variables

```bash
# Production .env template
NODE_ENV=production
PORT=3001

# CORS - Only your domain(s)
CORS_ORIGIN=https://yourdomain.com

# JWT - Generate strong secret
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Database - Use secure credentials
DATABASE_URL=postgresql://user:password@host:5432/db

# Redis (if using)
REDIS_URL=redis://:password@host:6379

# Session limits
MAX_STUDENTS_PER_SESSION=500
SESSION_CODE_LENGTH=6
SESSION_EXPIRY_HOURS=24

# Logging
LOG_LEVEL=info
```

### Generate Strong Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Session Secret
openssl rand -hex 32

# API Token
openssl rand -base64 48
```

---

## Testing Security

### Manual Tests

```bash
# 1. Test rate limiting
for i in {1..10}; do curl -X POST http://localhost:3001/auth/login; done

# 2. Test invalid session code
curl -X POST http://localhost:3001/sessions/join \
  -d '{"sessionCode": "INVALID"}' \
  -H "Content-Type: application/json"

# 3. Test SQL injection (should be blocked)
curl -X POST http://localhost:3001/sessions/join \
  -d '{"sessionCode": "ABC123; DROP TABLE sessions;--"}' \
  -H "Content-Type: application/json"

# 4. Test XSS (should be sanitized)
curl -X POST http://localhost:3001/sessions \
  -d '{"title": "<script>alert(1)</script>"}' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Check security headers
curl -I http://localhost:3001
```

### Automated Security Scans

```bash
# Install security tools
npm install -g snyk
npm install -g npm-audit

# Run security audit
npm audit
npm audit fix

# Snyk scan
snyk test
snyk monitor

# Check for known vulnerabilities
npm outdated
```

---

## Common Vulnerabilities - Status

| Vulnerability | Status | Protection |
|---------------|--------|------------|
| SQL Injection | ✅ Protected | Parameterized queries + validation |
| XSS | ✅ Protected | Input sanitization + CSP |
| CSRF | ✅ Protected | JWT + SameSite cookies |
| Clickjacking | ✅ Protected | X-Frame-Options: DENY |
| Session Hijacking | ✅ Protected | Secure session IDs + HTTPS |
| Brute Force | ✅ Protected | Rate limiting |
| DDoS | ✅ Mitigated | Rate limiting + connection limits |
| Information Leakage | ✅ Protected | Error sanitization |
| Prototype Pollution | ✅ Protected | Input validation |
| Path Traversal | ✅ Protected | Input validation |

---

## Security Incident Response

If security issue discovered:

1. **Immediate**: Disable affected endpoint/feature
2. **Assess**: Determine scope and impact
3. **Patch**: Fix vulnerability
4. **Test**: Verify fix works
5. **Deploy**: Roll out fix
6. **Notify**: Inform affected users (if applicable)
7. **Document**: Record incident and response

---

## Conclusion

Module 14 implements comprehensive security measures covering:

✅ API key protection (environment variables)  
✅ Input validation (all endpoints)  
✅ Session authorization (ownership verification)  
✅ Rate limiting (per endpoint type)  
✅ Security headers (Helmet + custom)  
✅ CORS (whitelist only)  
✅ Secure IDs (cryptographically secure)  
✅ Output sanitization (error messages)  
✅ WebSocket security (authorization + rate limiting)  
✅ Logging security (no sensitive data)  

**System is production-ready from a security perspective** ✅
