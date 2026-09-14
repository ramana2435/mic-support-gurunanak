import QRCode from 'qrcode';
import { query } from '../database';
import {
  Session,
  CreateSessionRequest,
  CreateSessionResponse,
  SessionStatus,
  Language,
} from '@live-translation/shared';
import { generateSessionCode } from '../utils/session-code';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { config } from '../config';

export class SessionService {
  /**
   * Create a new session
   */
  async createSession(
    organizerId: string,
    request: CreateSessionRequest
  ): Promise<CreateSessionResponse> {
    const {
      title,
      organizerName,
      sourceLanguage,
      targetLanguages,
      maxStudents = config.maxStudentsPerSession,
    } = request;

    // Generate unique session code
    let code = generateSessionCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await query('SELECT id FROM sessions WHERE code = $1', [
        code,
      ]);
      if (existing.rows.length === 0) {
        isUnique = true;
      } else {
        code = generateSessionCode();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new ValidationError('Failed to generate unique session code');
    }

    // Calculate expiration time (24 hours from now by default)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.sessionExpiryHours);

    // Create session
    const result = await query(
      `INSERT INTO sessions 
       (code, title, organizer_id, organizer_name, source_language, target_languages, max_students, status, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        code,
        title,
        organizerId,
        organizerName,
        sourceLanguage,
        targetLanguages,
        maxStudents,
        SessionStatus.CREATED,
        expiresAt,
      ]
    );

    const session = this.mapRowToSession(result.rows[0]);

    // Generate QR code
    const joinUrl = `${config.corsOrigin}/join?code=${code}`;
    const qrCodeUrl = await QRCode.toDataURL(joinUrl);

    logger.info('Session created', {
      sessionId: session.id,
      code,
      organizerId,
      title,
    });

    return {
      session,
      qrCodeUrl,
    };
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<Session> {
    const result = await query('SELECT * FROM sessions WHERE id = $1', [
      sessionId,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Session not found');
    }

    return this.mapRowToSession(result.rows[0]);
  }

  /**
   * Get session by code
   */
  async getSessionByCode(code: string): Promise<Session> {
    const result = await query('SELECT * FROM sessions WHERE code = $1', [
      code,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Session not found');
    }

    return this.mapRowToSession(result.rows[0]);
  }

  /**
   * Get sessions by organizer
   */
  async getSessionsByOrganizer(organizerId: string): Promise<Session[]> {
    const result = await query(
      'SELECT * FROM sessions WHERE organizer_id = $1 ORDER BY created_at DESC',
      [organizerId]
    );

    return result.rows.map(this.mapRowToSession);
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus
  ): Promise<Session> {
    const now = new Date();
    let query_text = 'UPDATE sessions SET status = $1';
    const params: any[] = [status, sessionId];

    if (status === SessionStatus.ACTIVE) {
      query_text += ', started_at = $3';
      params.splice(2, 0, now);
    } else if (status === SessionStatus.STOPPED) {
      query_text += ', stopped_at = $3';
      params.splice(2, 0, now);
    }

    query_text += ` WHERE id = $${params.length} RETURNING *`;

    const result = await query(query_text, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('Session not found');
    }

    const session = this.mapRowToSession(result.rows[0]);

    logger.info('Session status updated', { sessionId, status });

    return session;
  }

  /**
   * Get connected students count
   */
  async getConnectedStudentsCount(sessionId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM students WHERE session_id = $1 AND disconnected_at IS NULL',
      [sessionId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string, organizerId: string): Promise<void> {
    const result = await query(
      'DELETE FROM sessions WHERE id = $1 AND organizer_id = $2',
      [sessionId, organizerId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Session not found');
    }

    logger.info('Session deleted', { sessionId, organizerId });
  }

  /**
   * Check and mark expired sessions
   */
  async checkExpiredSessions(): Promise<void> {
    const now = new Date();
    await query(
      `UPDATE sessions 
       SET status = $1 
       WHERE status IN ($2, $3) 
       AND expires_at < $4`,
      [SessionStatus.EXPIRED, SessionStatus.CREATED, SessionStatus.ACTIVE, now]
    );
  }

  /**
   * Validate session is joinable
   */
  async validateSessionJoinable(sessionId: string): Promise<boolean> {
    const session = await this.getSessionById(sessionId);
    
    // Check if expired
    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      await this.updateSessionStatus(sessionId, SessionStatus.EXPIRED);
      return false;
    }

    // Only CREATED or ACTIVE sessions are joinable
    if (session.status !== SessionStatus.CREATED && session.status !== SessionStatus.ACTIVE) {
      return false;
    }

    // Check if full
    const connectedCount = await this.getConnectedStudentsCount(sessionId);
    if (connectedCount >= session.maxStudents) {
      return false;
    }

    return true;
  }

  /**
   * Map database row to Session object
   */
  private mapRowToSession(row: any): Session {
    return {
      id: row.id,
      code: row.code,
      title: row.title || `Session ${row.code}`,
      organizerId: row.organizer_id,
      organizerName: row.organizer_name,
      sourceLanguage: row.source_language as Language,
      targetLanguages: row.target_languages as Language[],
      status: row.status as SessionStatus,
      createdAt: row.created_at,
      startedAt: row.started_at,
      stoppedAt: row.stopped_at,
      expiresAt: row.expires_at,
      maxStudents: row.max_students,
      connectedStudents: 0, // Will be updated in real-time
    };
  }
}

export const sessionService = new SessionService();
