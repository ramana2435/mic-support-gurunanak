// User and Authentication Types
export interface OrganizerUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
}

export interface AuthResponse {
  token: string;
  user: OrganizerUser;
}

// Language Types
export enum Language {
  ENGLISH = 'en',
  TELUGU = 'te',
  HINDI = 'hi',
  TAMIL = 'ta',
  KANNADA = 'kn',
  MALAYALAM = 'ml',
  BENGALI = 'bn',
  MARATHI = 'mr',
  GUJARATI = 'gu',
  PUNJABI = 'pa',
  URDU = 'ur',
  ODIA = 'or',
  ASSAMESE = 'as',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  CHINESE = 'zh',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  ARABIC = 'ar',
}

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  sttCode: string;
  ttsCode: string;
}

// Session Types
export enum SessionStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  STOPPED = 'stopped',
  EXPIRED = 'expired',
}

export interface Session {
  id: string;
  code: string;
  title: string;
  organizerId: string;
  organizerName: string;
  sourceLanguage: Language;
  targetLanguages: Language[];
  status: SessionStatus;
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  expiresAt?: Date;
  maxStudents: number;
  connectedStudents: number;
}

export interface CreateSessionRequest {
  title: string;
  organizerName: string;
  sourceLanguage: Language;
  targetLanguages: Language[];
  maxStudents?: number;
}

export interface CreateSessionResponse {
  session: Session;
  qrCodeUrl: string;
}

// Student Types
export interface Student {
  id: string;
  sessionId: string;
  name?: string;
  selectedLanguage: Language;
  connectedAt: Date;
  socketId: string;
}

export interface JoinSessionRequest {
  sessionCode: string;
  name?: string;
  selectedLanguage: Language;
}

export interface JoinSessionResponse {
  sessionId: string;
  studentId: string;
  session: Session;
}

// Transcript Types
export interface TranscriptSegment {
  id: string;
  sessionId: string;
  originalText: string;
  originalLanguage: Language;
  translations: Record<Language, string>;
  timestamp: Date;
  isFinal: boolean;
  sequenceNumber?: number;
}

// STT (Speech-to-Text) Types
export interface STTResult {
  sessionId: string;
  text: string;
  isFinal: boolean;
  timestamp: Date;
  sequenceNumber: number;
  confidence?: number;
  language: Language;
}

export interface STTLatencyMetrics {
  audioCaptureTimestamp: number;
  sttReceiveTimestamp: number;
  processingTimestamp: number;
  totalLatency: number;
}

// WebSocket Event Types
export enum SocketEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // Session Management
  JOIN_SESSION = 'join:session',
  LEAVE_SESSION = 'leave:session',
  SESSION_JOINED = 'session:joined',
  SESSION_LEFT = 'session:left',
  SESSION_ERROR = 'session:error',

  // Session Control (Organizer)
  START_SESSION = 'session:start',
  STOP_SESSION = 'session:stop',
  SESSION_STARTED = 'session:started',
  SESSION_STOPPED = 'session:stopped',

  // Student Management
  STUDENT_JOINED = 'student:joined',
  STUDENT_LEFT = 'student:left',
  STUDENTS_LIST = 'students:list',
  STUDENTS_COUNT_UPDATED = 'students:count:updated',

  // Audio Streaming (Future)
  AUDIO_STREAM = 'audio:stream',
  AUDIO_START = 'audio:start',
  AUDIO_STOP = 'audio:stop',

  // STT (Speech-to-Text)
  STT_START = 'stt:start',
  STT_STOP = 'stt:stop',
  STT_INTERIM = 'stt:interim',
  STT_FINAL = 'stt:final',
  STT_ERROR = 'stt:error',

  // Translation
  TRANSLATION_INTERIM = 'translation:interim',
  TRANSLATION_FINAL = 'translation:final',
  TRANSLATION_ERROR = 'translation:error',

  // Transcript
  TRANSCRIPT_INTERIM = 'transcript:interim',
  TRANSCRIPT_FINAL = 'transcript:final',
  TRANSLATION_READY = 'translation:ready',

  // Audio Output (Future)
  AUDIO_CHUNK = 'audio:chunk',
  AUDIO_END = 'audio:end',

  // Status Updates
  CONNECTION_STATUS = 'connection:status',
  LATENCY_UPDATE = 'latency:update',

  // Text Channel Recovery (MODULE 7)
  TEXT_RECOVERY_REQUEST = 'text:recovery:request',
  TEXT_RECOVERY_RESPONSE = 'text:recovery:response',
  TEXT_SYNC_ACK = 'text:sync:ack',

  // TTS Audio (MODULE 8)
  TTS_AUDIO_CHUNK = 'tts:audio:chunk',
  TTS_AUDIO_END = 'tts:audio:end',
  TTS_ERROR = 'tts:error',
  TTS_STATUS = 'tts:status',
}

// WebSocket Payload Types
export interface JoinSessionPayload {
  sessionCode: string;
  name?: string;
  selectedLanguage: Language;
}

export interface SessionJoinedPayload {
  sessionId: string;
  studentId: string;
  session: Session;
  students: Student[];
}

export interface StudentJoinedPayload {
  student: Student;
}

export interface StudentLeftPayload {
  studentId: string;
}

export interface TranscriptPayload {
  segment: TranscriptSegment;
}

export interface ConnectionStatusPayload {
  connected: boolean;
  reconnecting?: boolean;
  reason?: string;
}

export interface LatencyUpdatePayload {
  latency: number;
  timestamp: Date;
}

export interface StudentsCountPayload {
  sessionId: string;
  count: number;
}

// STT Payload Types
export interface STTStartPayload {
  sessionId: string;
  language: Language;
}

export interface STTResultPayload {
  sessionId: string;
  text: string;
  isFinal: boolean;
  timestamp: Date;
  sequenceNumber: number;
  confidence?: number;
  latency?: STTLatencyMetrics;
}

export interface STTErrorPayload {
  sessionId: string;
  error: string;
  code?: string;
}

// Translation Payload Types
export interface TranslationResultPayload {
  sessionId: string;
  text: string;
  translatedText: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  sequenceNumber: number;
  timestamp: Date;
  isFinal: boolean;
  confidence?: number;
  latency?: TranslationLatencyMetrics;
}

export interface TranslationLatencyMetrics {
  sttTimestamp: number;
  translationStartTimestamp: number;
  translationResultTimestamp: number;
  translationLatency: number;
  totalLatency: number;
}

export interface TranslationErrorPayload {
  sessionId: string;
  targetLanguage: Language;
  error: string;
}

// Text Channel Recovery Types (MODULE 7)
export interface TextRecoveryRequest {
  sessionId: string;
  studentId: string;
  targetLanguage: Language;
  lastReceivedSequence: number;
}

export interface TextRecoveryResponse {
  sessionId: string;
  missedMessages: any[]; // Array of TranslationResultPayload
  recoveredCount: number;
}

export interface TextSyncAck {
  studentId: string;
  sequenceNumber: number;
  timestamp: Date;
}

// TTS Audio Types (MODULE 8)
export interface TTSAudioChunkPayload {
  sessionId: string;
  targetLanguage: Language;
  sequenceNumber: number;
  chunkIndex: number;
  audioData: string; // Base64 encoded audio
  format: string; // 'pcm', 'mp3', etc.
  sampleRate: number;
  isLast: boolean;
  timestamp: Date;
  latency?: TTSLatencyMetrics;
}

export interface TTSLatencyMetrics {
  translationResultTimestamp: number;
  ttsStartTimestamp: number;
  firstAudioChunkTimestamp: number;
  audioDeliveryTimestamp: number;
  ttsLatency: number;
  totalLatency: number;
}

export interface TTSErrorPayload {
  sessionId: string;
  targetLanguage: Language;
  sequenceNumber?: number;
  error: string;
}

export interface TTSStatusPayload {
  sessionId: string;
  targetLanguage: Language;
  status: 'starting' | 'streaming' | 'interrupted' | 'resumed' | 'stopped';
  message?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Error Types
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SESSION_FULL = 'SESSION_FULL',
  SESSION_NOT_ACTIVE = 'SESSION_NOT_ACTIVE',
  INVALID_SESSION_CODE = 'INVALID_SESSION_CODE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
}

// Configuration Types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  databaseUrl: string;
  redisUrl?: string;
  maxStudentsPerSession: number;
  sessionCodeLength: number;
  sessionExpiryHours: number;
}
