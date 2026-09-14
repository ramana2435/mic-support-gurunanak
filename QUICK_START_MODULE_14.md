# Module 14: Quick Start Security Guide

## 🚀 Quick Integration (5 Minutes)

### 1. Install Dependencies
```bash
cd apps/backend
npm install helmet joi
```

### 2. Add Security Middleware to Main App

```typescript
// apps/backend/src/index.ts
import { securityHeaders, additionalSecurityHeaders, corsOptions } from './middleware/security-headers';
import { errorHandler, notFoundHandler, sanitizeResponse } from './middleware/output-sanitization';
import { preventPrototypePollution, sanitizeRequestBody } from './middleware/input-validation';
import { apiRateLimit } from './middleware/rate-limit';
import cors from 'cors';

// Apply middleware (order matters!)
app.use(securityHeaders);           // 1. Security headers
app.use(additionalSecurityHeaders); // 2. Additional headers
app.use(cors(corsOptions));         // 3. CORS
app.use(preventPrototypePollution); // 4. Prototype pollution prevention
app.use(sanitizeRequestBody);       // 5. Sanitize request body
app.use(express.json());            // 6. JSON parsing
app.use('/api', apiRateLimit);      // 7. Rate limiting
app.use(sanitizeResponse);          // 8. Sanitize responses

// Your routes here
app.use('/api', routes);

// Error handlers (must be last!)
app.use(notFoundHandler);
app.use(errorHandler);
```

### 3. Add Validation to Routes

```typescript
import { validateBody, commonSchemas } from '../middleware/input-validation';
import { authRateLimit } from '../middleware/rate-limit';

// Before
router.post('/login', authController.login);

// After (secure)
router.post('/login',
  authRateLimit,
  validateBody(Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
  })),
  authController.login
);
```

### 4. Set Environment Variables

```bash
# .env
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://yourdomain.com
DATABASE_URL=postgresql://user:password@host:5432/db
```

### 5. Test Security

```bash
# Check headers
curl -I http://localhost:3001

# Test rate limiting
for i in {1..10}; do curl http://localhost:3001/auth/login; done

# Run security audit
npm audit
```

---

## 🔒 Security Middleware Quick Reference

### Input Validation
```typescript
import { validateBody, validateQuery, validateParams, commonSchemas } from '../middleware/input-validation';

// Validate body
router.post('/endpoint', validateBody(schema), controller.method);

// Validate query params
router.get('/endpoint', validateQuery(schema), controller.method);

// Validate path params
router.get('/endpoint/:id', validateParams(schema), controller.method);

// Common schemas
commonSchemas.uuid        // UUID validation
commonSchemas.sessionCode // Session code (6-10 chars, alphanumeric)
commonSchemas.language    // Language code (2-3 chars, ISO 639)
commonSchemas.email       // Email validation
commonSchemas.password    // Password (8-128 chars)
commonSchemas.name        // Name (2-100 chars)
commonSchemas.text        // Text content (max 10000 chars)
```

### Session Authorization
```typescript
import { authenticateToken } from '../middleware/auth';
import { verifySessionOwnership, verifySessionActive } from '../middleware/session-auth';

// Organizer-only endpoint
router.get('/sessions/:sessionId',
  authenticateToken,         // Verify JWT
  verifySessionOwnership,    // Verify owns session
  controller.getSession
);

// Session must be active
router.post('/sessions/:sessionId/start',
  authenticateToken,
  verifySessionOwnership,
  verifySessionActive,      // Verify not expired
  controller.startSession
);
```

### Rate Limiting
```typescript
import { 
  authRateLimit,              // 5 requests / 5 minutes
  apiRateLimit,               // 100 requests / 1 minute
  sessionCreationRateLimit,   // 10 sessions / 1 hour
  sessionJoinRateLimit,       // 20 joins / 1 minute
  passwordResetRateLimit      // 3 requests / 1 hour
} from '../middleware/rate-limit';

// Apply to routes
router.post('/auth/login', authRateLimit, controller.login);
router.post('/sessions', sessionCreationRateLimit, controller.create);
router.post('/sessions/join', sessionJoinRateLimit, controller.join);
```

### WebSocket Security
```typescript
import { 
  verifyStudentConnection, 
  checkWebSocketRateLimit, 
  validateAudioDataSize 
} from '../middleware/websocket-auth';

socket.on('JOIN_SESSION', async (payload, callback) => {
  const verification = await verifyStudentConnection(socket, payload.sessionCode, payload);
  if (!verification.valid) {
    return callback({ success: false, error: verification.error });
  }
  // Continue...
});

socket.on('AUDIO_STREAM', async (data) => {
  if (!checkWebSocketRateLimit(socket.id)) return;
  if (!validateAudioDataSize(data.audio)) return;
  // Process...
});
```

---

## 🛡️ Security Best Practices

### ✅ DO

```typescript
// ✅ Use environment variables
const apiKey = process.env.API_KEY;

// ✅ Validate all inputs
validateBody(schema)

// ✅ Use parameterized queries
await query('SELECT * FROM users WHERE id = $1', [userId]);

// ✅ Sanitize error messages
throw new ValidationError('Invalid input');

// ✅ Rate limit sensitive endpoints
router.post('/login', authRateLimit, ...);

// ✅ Log safely
logger.info('Audio processed', { size: buffer.length });

// ✅ Use secure ID generation
const code = generateSessionCode(6);
```

### ❌ DON'T

```typescript
// ❌ Hard-code secrets
const apiKey = 'sk-abc123...';

// ❌ Skip validation
router.post('/endpoint', controller.method);

// ❌ Use string interpolation in queries
await query(`SELECT * FROM users WHERE id = '${userId}'`);

// ❌ Expose stack traces in production
res.json({ error: error.stack });

// ❌ No rate limiting on auth endpoints
router.post('/login', controller.login);

// ❌ Log sensitive data
logger.info('Password', { password });

// ❌ Use Math.random() for security
const code = Math.floor(Math.random() * 1000000);
```

---

## 🧪 Quick Security Tests

### Test 1: Rate Limiting
```bash
# Should reject after limit
for i in {1..10}; do curl -X POST http://localhost:3001/auth/login; done
```

### Test 2: Input Validation
```bash
# Should reject invalid session code
curl -X POST http://localhost:3001/sessions/join \
  -d '{"sessionCode":"INVALID!@#"}' \
  -H "Content-Type: application/json"
```

### Test 3: Session Authorization
```bash
# Should reject unauthorized access
curl http://localhost:3001/api/sessions/OTHER_USER_SESSION \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 4: Security Headers
```bash
# Should return security headers
curl -I http://localhost:3001 | grep -E "(Strict-Transport|X-Frame|X-Content)"
```

### Test 5: CORS
```bash
# Should reject non-whitelisted origin
curl http://localhost:3001/api/health \
  -H "Origin: https://evil.com" \
  -v
```

---

## 🔐 Environment Variables Checklist

```bash
# Required
[ ] NODE_ENV=production
[ ] JWT_SECRET=<generate with: openssl rand -base64 32>
[ ] DATABASE_URL=postgresql://...
[ ] CORS_ORIGIN=https://yourdomain.com

# Optional
[ ] PORT=3001
[ ] JWT_EXPIRES_IN=7d
[ ] MAX_STUDENTS_PER_SESSION=500
[ ] SESSION_CODE_LENGTH=6
[ ] SESSION_EXPIRY_HOURS=24
[ ] LOG_LEVEL=info
```

---

## 🚨 Pre-Deployment Checklist

### Security
- [ ] All secrets in environment variables
- [ ] Strong JWT secret generated
- [ ] CORS whitelist configured
- [ ] HTTPS only in production
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Error sanitization enabled
- [ ] Security headers configured

### Testing
- [ ] npm audit clean
- [ ] Rate limiting tested
- [ ] Input validation tested
- [ ] Session authorization tested
- [ ] Security headers verified
- [ ] CORS tested

### Monitoring
- [ ] Error logging configured
- [ ] Rate limit violations monitored
- [ ] 401/403 errors monitored
- [ ] Alerts set up

---

## 🐛 Common Issues

### Issue: CORS Errors
```bash
# Fix: Add frontend URL to CORS_ORIGIN
CORS_ORIGIN=https://frontend.com,https://www.frontend.com
```

### Issue: Rate Limit Too Strict
```typescript
// Adjust limits in middleware/rate-limit.ts
export const customRateLimit = rateLimit({
  windowMs: 60000,
  max: 200, // Increase limit
});
```

### Issue: Validation Rejecting Valid Input
```typescript
// Check schema is correct
validateBody(Joi.object({
  title: Joi.string().max(200), // Increase max if needed
}))
```

---

## 📊 Security Status

✅ API Keys Protected  
✅ Input Validated  
✅ Sessions Authorized  
✅ Rate Limited  
✅ Headers Secured  
✅ CORS Configured  
✅ IDs Cryptographically Secure  
✅ Output Sanitized  
✅ WebSockets Secured  
✅ Logging Safe  

**Status**: Production Ready 🎉

---

## 📚 Documentation

- **Full Guide**: `MODULE_14_SECURITY_GUIDE.md`
- **Audit Report**: `MODULE_14_SECURITY_AUDIT.md`
- **Implementation Summary**: `MODULE_14_IMPLEMENTATION_SUMMARY.md`
- **Quick Start**: This file

---

## 🆘 Need Help?

1. Check security guide for detailed explanations
2. Review audit report for specific vulnerabilities
3. Test with provided test commands
4. Run `npm audit` for dependency vulnerabilities

**Remember**: Security is not a one-time task. Regular audits and updates are essential!
