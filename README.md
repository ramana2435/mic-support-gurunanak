# Live Translation Application

Real-time multilingual speech translation system for educational events, lectures, seminars, and conferences.

## 🎯 Project Overview

This application provides low-latency (~1 second) live translation for educational events. A speaker talks through a wireless microphone, and students hear the translation in their preferred language through their own devices and Bluetooth earbuds.

## 🏗️ Architecture

### Monorepo Structure

```
live-translation-app/
├── apps/
│   ├── backend/          # Node.js + Express + Socket.IO server
│   └── frontend/         # Next.js 14 React application
├── packages/
│   └── shared/           # Shared TypeScript types and utilities
└── package.json          # Root workspace configuration
```

### Tech Stack

**Frontend:**
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- Socket.IO Client
- Zustand (State Management)
- Axios

**Backend:**
- Node.js + Express
- Socket.IO (WebSocket)
- PostgreSQL
- TypeScript
- JWT Authentication
- Winston (Logging)

**Shared:**
- TypeScript types and interfaces
- Validation utilities
- Language configurations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (v20.18.1 recommended)
- PostgreSQL 12+ (configured on port **5433**, not default 5432)
- npm or yarn

**Note:** This application currently uses mock password hashing instead of bcrypt due to Windows build compatibility. For production deployment on Linux servers, bcrypt should be re-enabled.

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd live-translation-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   
   **Important:** This application uses PostgreSQL on port **5433** (not the default 5432).
   
   ```bash
   # Create database on port 5433
   psql -p 5433 -U postgres
   CREATE DATABASE mic_support;
   \q
   ```

4. **Configure environment variables**

   **Backend** (`apps/backend/.env`):
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   # Edit apps/backend/.env with your configuration
   ```

   **Frontend** (`apps/frontend/.env.local`):
   ```bash
   cp apps/frontend/.env.local.example apps/frontend/.env.local
   # Edit apps/frontend/.env.local with your configuration
   ```

5. **Build shared packages**
   ```bash
   cd packages/shared
   npm run build
   cd ../..
   ```

6. **Start the application**

   **Option 1: Start both services together**
   ```bash
   npm run dev
   ```

   **Option 2: Start services separately**
   
   Terminal 1 (Backend):
   ```bash
   npm run dev:backend
   ```

   Terminal 2 (Frontend):
   ```bash
   npm run dev:frontend
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3002
   - Health Check: http://localhost:3002/api/health

## 📋 Module 1 Features (Current Implementation)

### ✅ Implemented

**Authentication & Session Management:**
- Organizer registration and login
- JWT-based authentication
- Session creation with unique 6-digit codes
- QR code generation for easy joining

**Organizer Features:**
- Dashboard to view all sessions
- Create new translation sessions
- Configure source and target languages
- Set maximum students per session
- Manage session status (start/pause/resume/end)
- Real-time session controls via WebSocket

**Student Features:**
- Join session using 6-digit code or QR scan
- Select preferred translation language
- Real-time connection status
- Session state updates (active/paused/ended)

**Infrastructure:**
- PostgreSQL database with proper schema
- WebSocket (Socket.IO) real-time communication
- Type-safe shared types across frontend/backend
- Centralized error handling
- Structured logging (Winston)
- Health check endpoint
- Mobile-responsive UI

### 🔜 Future Modules

**Module 2: Audio Capture & STT** (Weeks 3-4)
- Microphone audio capture
- Google Cloud Speech-to-Text integration
- Real-time text display

**Module 3: Translation** (Week 5)
- Google Cloud Translation API
- Multi-language text distribution

**Module 4: Text-to-Speech** (Weeks 6-7)
- Google Cloud TTS integration
- Audio streaming to students
- Bluetooth audio playback

**Module 5-7:** Optimization, scalability, and advanced features

## 🔧 Development

### Available Scripts

**Root level:**
- `npm run dev` - Start both backend and frontend
- `npm run dev:backend` - Start backend only
- `npm run dev:frontend` - Start frontend only
- `npm run build` - Build all workspaces
- `npm run lint` - Lint all workspaces
- `npm run type-check` - Type check all workspaces

**Backend** (`apps/backend`):
- `npm run dev` - Start dev server with nodemon
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Type check without emit

**Frontend** (`apps/frontend`):
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run Next.js linter
- `npm run type-check` - Type check without emit

**Shared** (`packages/shared`):
- `npm run build` - Build TypeScript types
- `npm run dev` - Watch mode for types

### Database Schema

The application automatically initializes the database tables on first run:

- `organizers` - Organizer user accounts
- `sessions` - Translation sessions
- `students` - Connected students
- `transcripts` - Session transcripts (for future use)

### Project Structure Details

```
apps/backend/src/
├── config/          # Configuration management
├── database/        # Database setup and queries
├── middleware/      # Express middleware (auth, error handling, validation)
├── routes/          # API routes
├── services/        # Business logic
├── socket/          # WebSocket event handlers
├── utils/           # Utility functions
└── index.ts         # Application entry point

apps/frontend/src/
├── app/             # Next.js app directory
│   ├── organizer/   # Organizer pages
│   ├── student/     # Student pages
│   └── join/        # Join session page
├── components/      # Reusable React components
├── lib/             # API and Socket.IO clients
└── store/           # State management (Zustand)

packages/shared/src/
├── types/           # TypeScript interfaces
├── constants/       # Shared constants
└── utils/           # Shared utilities
```

## 🌐 Supported Languages (20 Total)

### Indian Languages (13)
- **English** (en) • **Hindi** (hi) • **Telugu** (te) • **Tamil** (ta)
- **Kannada** (kn) • **Malayalam** (ml) • **Bengali** (bn) • **Marathi** (mr)
- **Gujarati** (gu) • **Punjabi** (pa) • **Urdu** (ur) • **Odia** (or) • **Assamese** (as)

### International Languages (7)
- **Spanish** (es) • **French** (fr) • **German** (de)
- **Chinese** (zh) • **Japanese** (ja) • **Korean** (ko) • **Arabic** (ar)

**For complete language details, see [AVAILABLE_LANGUAGES.md](AVAILABLE_LANGUAGES.md)**

## 🔐 Environment Variables

### Backend Required Variables

```env
NODE_ENV=development
PORT=3002
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://postgres:password@localhost:5433/mic_support
```

### Frontend Required Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## 🐛 Troubleshooting

**Database connection issues:**
```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
psql postgresql://user:password@localhost:5432/live_translation
```

**Port already in use:**
```bash
# Change PORT in backend .env or frontend port
# Backend: Edit apps/backend/.env
# Frontend: next dev -p 3001
```

**TypeScript errors in shared package:**
```bash
# Rebuild shared package
cd packages/shared
npm run build
```

## 📝 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register organizer
- `POST /api/auth/login` - Login organizer
- `GET /api/auth/me` - Get current user (requires auth)

### Session Endpoints

- `POST /api/sessions` - Create session (requires auth)
- `GET /api/sessions` - Get all organizer sessions (requires auth)
- `GET /api/sessions/:id` - Get session by ID (requires auth)
- `GET /api/sessions/code/:code` - Get session by code (public)
- `DELETE /api/sessions/:id` - Delete session (requires auth)

### WebSocket Events

**Client → Server:**
- `join:session` - Student joins session
- `session:start` - Organizer starts session
- `session:pause` - Organizer pauses session
- `session:resume` - Organizer resumes session
- `session:end` - Organizer ends session

**Server → Client:**
- `session:joined` - Student successfully joined
- `session:started` - Session started
- `session:paused` - Session paused
- `session:resumed` - Session resumed
- `session:ended` - Session ended
- `student:joined` - New student joined
- `student:left` - Student left

## 📄 License

MIT

## 👥 Support

For issues and questions, please create an issue in the repository.
