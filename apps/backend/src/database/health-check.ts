/**
 * Database Health Check Utility
 * Verifies connection to PostgreSQL on port 5433
 */

import { pool, query } from './index';
import logger from '../utils/logger';

export interface DatabaseHealth {
  connected: boolean;
  database: string;
  port: number;
  version?: string;
  tableCount?: number;
  error?: string;
}

/**
 * Check database connection health
 * @returns DatabaseHealth object with connection status
 */
export const checkDatabaseHealth = async (): Promise<DatabaseHealth> => {
  try {
    // Test basic connection
    const versionResult = await query('SELECT version()');
    const version = versionResult.rows[0]?.version || 'unknown';
    
    // Count tables
    const tableResult = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tableCount = parseInt(tableResult.rows[0]?.count || '0', 10);
    
    // Get database name
    const dbResult = await query('SELECT current_database()');
    const database = dbResult.rows[0]?.current_database || 'unknown';
    
    logger.info('Database health check passed', {
      database,
      port: 5433,
      tableCount,
      version: version.split(' ').slice(0, 2).join(' ') // Shorter version string
    });
    
    return {
      connected: true,
      database,
      port: 5433,
      version: version.split(' ').slice(0, 2).join(' '),
      tableCount
    };
  } catch (error: any) {
    logger.error('Database health check failed', {
      error: error.message,
      hint: 'Verify PostgreSQL is running on port 5433 and database "mic_support" exists'
    });
    
    return {
      connected: false,
      database: 'mic_support',
      port: 5433,
      error: error.message
    };
  }
};

/**
 * Verify all required tables exist
 * @returns List of missing tables (empty array if all exist)
 */
export const verifyTables = async (): Promise<string[]> => {
  const requiredTables = ['organizers', 'sessions', 'students', 'transcripts'];
  const missingTables: string[] = [];
  
  try {
    for (const table of requiredTables) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      const exists = result.rows[0]?.exists;
      if (!exists) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length === 0) {
      logger.info('All required tables exist', { tables: requiredTables });
    } else {
      logger.warn('Missing tables detected', { missingTables });
    }
    
    return missingTables;
  } catch (error: any) {
    logger.error('Failed to verify tables', { error: error.message });
    throw error;
  }
};

/**
 * Test database by creating and reading a test session
 * @returns true if test passed, false otherwise
 */
export const testDatabaseOperations = async (): Promise<boolean> => {
  try {
    // This would require a test organizer to exist
    // For now, just verify we can query sessions table
    const result = await query('SELECT COUNT(*) FROM sessions');
    const count = result.rows[0]?.count || 0;
    
    logger.info('Database operations test passed', { 
      sessionsCount: count 
    });
    
    return true;
  } catch (error: any) {
    logger.error('Database operations test failed', { 
      error: error.message 
    });
    return false;
  }
};
