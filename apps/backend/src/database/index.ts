import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import logger from '../utils/logger';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  // Removed connectionTimeoutMillis to use default (0 = no timeout)
  // This prevents timeout on slow Windows localhost connections
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
  logger.error('Verify PostgreSQL is running on port 5433 and database "mic_support" exists');
});

/**
 * Execute a query with automatic error handling
 */
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error', { text, error });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
export const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  return client;
};

/**
 * Initialize database tables
 * Creates all required tables if they don't exist
 * Port: 5433 (not default 5432)
 * Database: mic_support
 */
export const initDatabase = async (): Promise<void> => {
  try {
    logger.info('Initializing database...', {
      database: 'mic_support',
      port: 5433,
      host: 'localhost'
    });

    // Create organizers table
    await query(`
      CREATE TABLE IF NOT EXISTS organizers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(10) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
        organizer_name VARCHAR(255) NOT NULL,
        source_language VARCHAR(10) NOT NULL,
        target_languages TEXT[] NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'created',
        max_students INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        stopped_at TIMESTAMP,
        expires_at TIMESTAMP,
        CONSTRAINT valid_status CHECK (status IN ('created', 'active', 'stopped', 'expired'))
      )
    `);

    // Create index on session code for fast lookup
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code)
    `);

    // Create index on organizer_id for fast lookup
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_organizer ON sessions(organizer_id)
    `);

    // Create students table (for tracking connected students)
    await query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        name VARCHAR(255),
        selected_language VARCHAR(10) NOT NULL,
        socket_id VARCHAR(255) NOT NULL,
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        disconnected_at TIMESTAMP
      )
    `);

    // Create index on session_id for fast lookup
    await query(`
      CREATE INDEX IF NOT EXISTS idx_students_session ON students(session_id)
    `);

    // Create transcripts table (for storing session transcripts)
    await query(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        original_text TEXT NOT NULL,
        original_language VARCHAR(10) NOT NULL,
        translations JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_final BOOLEAN DEFAULT false
      )
    `);

    logger.info('Database initialized successfully', {
      tables: ['organizers', 'sessions', 'students', 'transcripts'],
      indexes: ['idx_sessions_code', 'idx_sessions_organizer', 'idx_students_session']
    });
  } catch (error) {
    logger.error('Failed to initialize database', error);
    logger.error('Check: PostgreSQL running on port 5433? Database "mic_support" exists?');
    throw error;
  }
};

/**
 * Close database connection pool
 */
export const closeDatabase = async (): Promise<void> => {
  await pool.end();
  logger.info('Database connection pool closed');
};
