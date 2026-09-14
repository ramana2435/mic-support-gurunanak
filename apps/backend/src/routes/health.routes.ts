import { Router } from 'express';
import { pool } from '../database';
import { checkDatabaseHealth } from '../database/health-check';
import { ApiResponse } from '@live-translation/shared';
import { config } from '../config';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint with database connection verification
 */
router.get('/', async (req, res) => {
  try {
    // Check database connection with detailed health info
    const dbHealth = await checkDatabaseHealth();

    if (!dbHealth.connected) {
      const response: ApiResponse = {
        success: false,
        error: 'Database connection failed',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          environment: config.nodeEnv,
          database: {
            connected: false,
            name: dbHealth.database,
            port: dbHealth.port,
            error: dbHealth.error
          },
        },
      };
      return res.status(503).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        uptime: process.uptime(),
        database: {
          connected: true,
          name: dbHealth.database,
          port: dbHealth.port,
          version: dbHealth.version,
          tables: dbHealth.tableCount
        },
      },
    };

    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        database: {
          connected: false,
          name: 'mic_support',
          port: 5433,
          error: error.message
        },
      },
    };

    res.status(503).json(response);
  }
});

export default router;
