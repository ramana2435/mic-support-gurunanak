import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { config } from './config';
import { initDatabase } from './database';
import { initializeSocket } from './socket';
import routes from './routes';
import { errorHandler } from './middleware/error-handler';
import { pipelineOrchestrator } from './services/pipeline/pipeline-orchestrator.service';
import { sttService } from './services/stt/stt.service';
import { translationService } from './services/translation/translation.service';
import { ttsService } from './services/tts/tts.service';
import logger from './utils/logger';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initDatabase();

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`, {
        environment: config.nodeEnv,
        corsOrigin: config.corsOrigin,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Graceful shutdown (MODULE 10)
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // Stop all active pipelines
    logger.info('Stopping all active pipelines...');
    await pipelineOrchestrator.cleanup();
    
    // Cleanup services
    logger.info('Cleaning up services...');
    await sttService.cleanup();
    translationService.cleanup();
    // TTS cleanup is handled by pipeline orchestrator
    
    // Close HTTP server
    httpServer.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });
    
    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forceful shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error: any) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export { app, httpServer, io };
