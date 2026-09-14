# Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────┐         ┌─────────────────────────┐    │
│  │   Organizer Browser    │         │   Student Browser       │    │
│  │   (Next.js App)        │         │   (Next.js App)         │    │
│  │                        │         │                         │    │
│  │  - Dashboard           │         │  - Join Page            │    │
│  │  - Session Create      │         │  - Session View         │    │
│  │  - Session Manage      │         │  - Language Select      │    │
│  │  - QR Code Display     │         │  - Translation Display  │    │
│  └───────────┬────────────┘         └────────────┬────────────┘    │
│              │                                    │                  │
│              │    HTTP/HTTPS + WebSocket         │                  │
│              └────────────┬───────────────────────┘                  │
│                           │                                          │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────┐
│                    APPLICATION LAYER                                 │
├──────────────────────────────────────────────────────────────────────┤
│                           │                                          │
│              ┌────────────▼────────────┐                             │
│              │   Load Balancer         │                             │
│              │   (Nginx/CloudFront)    │                             │
│              └────────────┬────────────┘                             │
│                           │                                          │
│       ┌───────────────────┼───────────────────┐                     │
│       │                   │                   │                     │
│   ┌───▼──────┐      ┌────▼─────┐      ┌─────▼────┐               │
│   │ Frontend │      │ Backend  │      │ Backend  │               │
│   │ (Next.js)│      │ Server 1 │      │ Server N │               │
│   │          │      │          │      │          │               │
│   │ Port     │      │ Express  │      │ Express  │               │
│   │ 3000     │      │ Socket.IO│      │ Socket.IO│               │
│   └──────────┘      │ Port 3001│      │          │               │
│                     └────┬─────┘      └─────┬────┘               │
│                          │                   │                     │
│                          └────────┬──────────┘                     │
│                                   │                                 │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────┐
│                        DATA LAYER                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                   │                                  │
│         ┌─────────────────────────┼─────────────────────┐           │
│         │                         │                     │           │
│    ┌────▼─────┐          ┌───────▼────────┐      ┌────▼─────┐     │
│    │PostgreSQL│          │ Redis (Future) │      │ S3/Files │     │
│    │          │          │                │      │ (Future) │     │
│    │ Sessions │          │ - Cache        │      │          │     │
│    │ Students │          │ - Pub/Sub      │      │ - Logs   │     │
│    │ Users    │          │ - Sessions     │      │ - Records│     │
│    └──────────┘          └────────────────┘      └──────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture (Module 1)

```
apps/backend/src/
│
├── index.ts                    # Application Entry Point
│   ├── Express App Setup
│   ├── Middleware Registration
│   ├── Socket.IO Initialization
│   └── Database Initialization
│
├── config/
│   └── index.ts               # Centralized Configuration
│       ├── Environment Variables
│       ├── Database Config
│       └── JWT Settings
│
├── database/
│   └── index.ts               # Database Layer
│       ├── Connection Pool
│       ├── Query Helper
│       └── Schema Initialization
│
├── middleware/
│   ├── auth.ts                # JWT Authentication
│   ├── error-handler.ts       # Error Handling
│   └── validator.ts           # Request Validation
│
├── routes/
│   ├── index.ts               # Route Aggregator
│   ├── auth.routes.ts         # Auth Endpoints
│   ├── session.routes.ts      # Session Endpoints
│   └── health.routes.ts       # Health Check
│
├── services/
│   ├── auth.service.ts        # Authentication Logic
│   │   ├── register()
│   │   ├── login()
│   │   └── getOrganizerById()
│   │
│   └── session.service.ts     # Session Logic
│       ├── createSession()
│       ├── getSessionById()
│       ├── getSessionByCode()
│       ├── updateSessionStatus()
│       └── getConnectedStudentsCount()
│
├── socket/
│   └── index.ts               # WebSocket Handlers
│       ├── connection
│       ├── join:session
│       ├── session:start
│       ├── session:pause
│       ├── session:resume
│       ├── session:end
│       └── disconnect
│
└── utils/
    ├── logger.ts              # Winston Logger
    ├── errors.ts              # Custom Error Classes
    └── session-code.ts        # Session Code Generator
```

---

## Frontend Architecture (Module 1)

```
apps/frontend/src/
│
├── app/                        # Next.js App Directory
│   ├── layout.tsx             # Root Layout
│   ├── page.tsx               # Homepage
│   ├── globals.css            # Global Styles
│   │
│   ├── organizer/
│   │   ├── login/
│   │   │   └── page.tsx       # Login Page
│   │   ├── register/
│   │   │   └── page.tsx       # Register Page
│   │   ├── dashboard/
│   │   │   └── page.tsx       # Dashboard
│   │   └── session/
│   │       ├── create/
│   │       │   └── page.tsx   # Create Session
│   │       └── [id]/
│   │           └── page.tsx   # Manage Session
│   │
│   ├── student/
│   │   └── session/
│   │       └── [code]/
│   │           └── page.tsx   # Student Session View
│   │
│   └── join/
│       └── page.tsx           # Join Session
│
├── components/                 # Reusable Components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── LanguageSelector.tsx
│
├── lib/                        # Utilities & Clients
│   ├── api.ts                 # Axios API Client
│   │   ├── authApi
│   │   ├── sessionApi
│   │   └── healthApi
│   │
│   └── socket.ts              # Socket.IO Client
│       ├── initSocket()
│       ├── connectSocket()
│       └── disconnectSocket()
│
└── store/                      # State Management
    └── auth.store.ts          # Zustand Auth Store
        ├── user
        ├── token
        ├── setAuth()
        ├── clearAuth()
        └── initAuth()
```

---

## Data Flow Diagrams

### 1. Authentication Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Browser │                │ Backend │                │ Database │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │  POST /api/auth/register │                          │
     │──────────────────────────>                          │
     │                          │                          │
     │                          │  INSERT INTO organizers  │
     │                          │─────────────────────────>│
     │                          │                          │
     │                          │  <─────────────────────  │
     │                          │     Return user ID       │
     │                          │                          │
     │                          │  Generate JWT Token      │
     │                          │                          │
     │  <────────────────────────                          │
     │    { token, user }       │                          │
     │                          │                          │
     │  Store in localStorage   │                          │
     │                          │                          │
```

### 2. Session Creation Flow

```
┌──────────┐            ┌─────────┐            ┌──────────┐
│Organizer │            │ Backend │            │ Database │
└────┬─────┘            └────┬────┘            └────┬─────┘
     │                       │                      │
     │ POST /api/sessions    │                      │
     │ (with JWT token)      │                      │
     │──────────────────────>│                      │
     │                       │                      │
     │                       │  Verify JWT          │
     │                       │                      │
     │                       │  Generate 6-digit    │
     │                       │  unique code         │
     │                       │                      │
     │                       │  INSERT INTO sessions│
     │                       │─────────────────────>│
     │                       │                      │
     │                       │  <─────────────────  │
     │                       │                      │
     │                       │  Generate QR Code    │
     │                       │                      │
     │  <────────────────────                       │
     │  { session, qrCode }  │                      │
     │                       │                      │
```

### 3. Student Join Flow

```
┌─────────┐        ┌─────────┐        ┌─────────┐        ┌──────────┐
│ Student │        │ Frontend│        │ Backend │        │ Database │
└────┬────┘        └────┬────┘        └────┬────┘        └────┬─────┘
     │                  │                  │                   │
     │ Enter Code       │                  │                   │
     │─────────────────>│                  │                   │
     │                  │                  │                   │
     │                  │ GET /api/sessions│                   │
     │                  │     /code/:code  │                   │
     │                  │─────────────────>│                   │
     │                  │                  │                   │
     │                  │                  │ SELECT * FROM     │
     │                  │                  │ sessions WHERE    │
     │                  │                  │ code = ?          │
     │                  │                  │──────────────────>│
     │                  │                  │                   │
     │                  │                  │ <────────────────│
     │                  │                  │                   │
     │                  │ <───────────────                     │
     │                  │ { session }      │                   │
     │                  │                  │                   │
     │ <───────────────                    │                   │
     │ "Session Valid"  │                  │                   │
     │                  │                  │                   │
     │ Click Join       │                  │                   │
     │─────────────────>│                  │                   │
     │                  │                  │                   │
     │                  │  WebSocket       │                   │
     │                  │  Connect         │                   │
     │                  │─────────────────>│                   │
     │                  │                  │                   │
     │                  │  emit('join:     │                   │
     │                  │    session')     │                   │
     │                  │─────────────────>│                   │
     │                  │                  │                   │
     │                  │                  │ INSERT INTO       │
     │                  │                  │ students          │
     │                  │                  │──────────────────>│
     │                  │                  │                   │
     │                  │                  │ Join Room         │
     │                  │                  │                   │
     │                  │ <───────────────                     │
     │                  │ 'session:joined' │                   │
     │                  │                  │                   │
     │ <───────────────                    │                   │
     │ Joined Success   │                  │                   │
     │                  │                  │                   │
```

### 4. Real-Time Session Control

```
┌──────────┐                ┌─────────┐                ┌─────────┐
│Organizer │                │ Socket  │                │ Student │
└────┬─────┘                │ Server  │                └────┬────┘
     │                      └────┬────┘                     │
     │                           │                          │
     │ emit('session:start')     │                          │
     │──────────────────────────>│                          │
     │                           │                          │
     │                           │  Update DB Status        │
     │                           │                          │
     │                           │  to('session:123')       │
     │                           │  emit('session:started') │
     │                           │─────────────────────────>│
     │                           │                          │
     │                           │ <─────────────────────────
     │ <────────────────────────│   Acknowledge            │
     │ 'session:started'         │                          │
     │                           │                          │
```

---

## Database Schema (ER Diagram)

```
┌─────────────────────────┐
│      organizers         │
├─────────────────────────┤
│ id (PK)        UUID     │
│ email          VARCHAR  │◄────┐
│ password_hash  VARCHAR  │     │
│ name           VARCHAR  │     │
│ created_at     TIMESTAMP│     │
└─────────────────────────┘     │
                                │ FK
                                │
┌─────────────────────────┐     │
│       sessions          │     │
├─────────────────────────┤     │
│ id (PK)        UUID     │     │
│ code           VARCHAR  │     │
│ organizer_id   UUID     │─────┘
│ organizer_name VARCHAR  │
│ source_language VARCHAR │
│ target_languages TEXT[] │
│ status         VARCHAR  │
│ max_students   INTEGER  │
│ created_at     TIMESTAMP│
│ started_at     TIMESTAMP│
│ ended_at       TIMESTAMP│
└────────┬────────────────┘
         │
         │ FK
         │
┌────────▼────────────────┐
│       students          │
├─────────────────────────┤
│ id (PK)          UUID   │
│ session_id       UUID   │
│ name             VARCHAR│
│ selected_language VARCHAR│
│ socket_id        VARCHAR│
│ connected_at     TIMESTAMP│
│ disconnected_at  TIMESTAMP│
└─────────────────────────┘

┌─────────────────────────┐
│      transcripts        │
├─────────────────────────┤
│ id (PK)          UUID   │
│ session_id       UUID   │
│ original_text    TEXT   │
│ original_language VARCHAR│
│ translations     JSONB  │
│ timestamp        TIMESTAMP│
│ is_final         BOOLEAN│
└─────────────────────────┘
```

---

## WebSocket Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket Events                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Client                    Server                  Database │
│    │                         │                        │      │
│    │  connect               │                        │      │
│    │───────────────────────>│                        │      │
│    │                         │                        │      │
│    │  join:session           │                        │      │
│    │  (code, name, lang)     │                        │      │
│    │───────────────────────>│                        │      │
│    │                         │  INSERT student        │      │
│    │                         │───────────────────────>│      │
│    │                         │                        │      │
│    │                         │  socket.join(room)     │      │
│    │                         │                        │      │
│    │  session:joined         │                        │      │
│    │<───────────────────────│                        │      │
│    │  (session, students)    │                        │      │
│    │                         │                        │      │
│    │                         │  to(room).emit         │      │
│    │                         │  student:joined        │      │
│    │                         │                        │      │
│    │  student:joined         │                        │      │
│    │<───────────────────────│                        │      │
│    │  (new student info)     │                        │      │
│    │                         │                        │      │
│    │  session:start          │                        │      │
│    │───────────────────────>│                        │      │
│    │                         │  UPDATE status         │      │
│    │                         │───────────────────────>│      │
│    │                         │                        │      │
│    │                         │  to(room).emit         │      │
│    │                         │  session:started       │      │
│    │                         │                        │      │
│    │  session:started        │                        │      │
│    │<───────────────────────│                        │      │
│    │                         │                        │      │
│    │  disconnect             │                        │      │
│    │───────────────────────>│                        │      │
│    │                         │  UPDATE disconnected_at│      │
│    │                         │───────────────────────>│      │
│    │                         │                        │      │
│    │                         │  to(room).emit         │      │
│    │                         │  student:left          │      │
│    │                         │                        │      │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Security Layers                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Network Security                                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ - HTTPS/TLS                                          │ │
│  │ - WSS (WebSocket Secure)                             │ │
│  │ - CORS Configuration                                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Layer 2: Authentication & Authorization                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ - JWT Tokens (HS256)                                 │ │
│  │ - Password Hashing (bcrypt, 10 rounds)               │ │
│  │ - Protected Routes (middleware)                      │ │
│  │ - Token Expiration (7 days)                          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Layer 3: Input Validation                                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ - Joi Schema Validation                              │ │
│  │ - Email Format Validation                            │ │
│  │ - Password Strength Check                            │ │
│  │ - SQL Injection Prevention (parameterized queries)   │ │
│  │ - XSS Prevention (input sanitization)                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Layer 4: Database Security                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ - Parameterized Queries                              │ │
│  │ - Foreign Key Constraints                            │ │
│  │ - Connection Pooling                                 │ │
│  │ - Secure Credentials (env variables)                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Layer 5: Application Security                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ - Error Handling (no sensitive data exposure)        │ │
│  │ - Logging (Winston, structured)                      │ │
│  │ - Environment Variable Management                    │ │
│  │ - Session Isolation (room-based)                     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PRODUCTION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────┐     │
│  │              CDN / CloudFront                      │     │
│  │         (Static Assets, Images, JS, CSS)          │     │
│  └─────────────────────┬─────────────────────────────┘     │
│                        │                                     │
│  ┌────────────────────▼────────────────────────────┐       │
│  │            Load Balancer (Nginx)                 │       │
│  │          - SSL Termination                       │       │
│  │          - Request Distribution                  │       │
│  └─────────────────┬───────────┬────────────────────┘       │
│                    │           │                             │
│         ┌──────────▼───┐   ┌──▼──────────┐                 │
│         │  Frontend    │   │  Backend    │                 │
│         │  (Vercel)    │   │  Servers    │                 │
│         │  Next.js     │   │  (EC2/VPS)  │                 │
│         └──────────────┘   │  Node.js    │                 │
│                            │  Socket.IO  │                 │
│                            └──────┬──────┘                 │
│                                   │                         │
│                     ┌─────────────┼─────────────┐          │
│                     │             │             │          │
│              ┌──────▼─────┐ ┌────▼─────┐ ┌────▼─────┐    │
│              │ PostgreSQL │ │  Redis   │ │    S3    │    │
│              │    (RDS)   │ │ (Cache)  │ │ (Storage)│    │
│              │  Primary   │ │          │ │          │    │
│              │  + Replica │ │          │ │          │    │
│              └────────────┘ └──────────┘ └──────────┘    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Monitoring & Logging                 │    │
│  │  - CloudWatch / Grafana                          │    │
│  │  - Sentry (Error Tracking)                       │    │
│  │  - ELK Stack (Log Aggregation)                   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## State Management (Frontend)

```
┌────────────────────────────────────────────────────┐
│              Zustand Store (Auth)                   │
├────────────────────────────────────────────────────┤
│                                                     │
│  State:                                            │
│  ┌──────────────────────────────────────────────┐ │
│  │ user: OrganizerUser | null                   │ │
│  │ token: string | null                         │ │
│  │ isAuthenticated: boolean                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  Actions:                                          │
│  ┌──────────────────────────────────────────────┐ │
│  │ setAuth(user, token)                         │ │
│  │   └─> Save to localStorage                   │ │
│  │   └─> Update state                           │ │
│  │                                              │ │
│  │ clearAuth()                                  │ │
│  │   └─> Remove from localStorage               │ │
│  │   └─> Clear state                            │ │
│  │                                              │ │
│  │ initAuth()                                   │ │
│  │   └─> Read from localStorage                 │ │
│  │   └─> Restore state                          │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  Persistence:                                      │
│  ┌──────────────────────────────────────────────┐ │
│  │ localStorage.setItem('authToken')            │ │
│  │ localStorage.setItem('authUser')             │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

This architecture is designed to be:
- **Scalable**: Can grow from 5 to 100+ students
- **Maintainable**: Clear separation of concerns
- **Secure**: Multiple layers of security
- **Performant**: Optimized data flow
- **Extensible**: Ready for Modules 2-7

---

**Module 1 Complete** ✅
