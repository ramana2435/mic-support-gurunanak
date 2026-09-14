import { Router } from 'express';
import { pipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator.service';
import { errorRecoveryService } from '../services/pipeline/error-recovery.service';
import { latencyTelemetry } from '../services/telemetry/latency-telemetry.service';
import { resourceMonitor } from '../services/scalability/resource-monitor.service';
import { connectionManager } from '../services/scalability/connection-manager.service';
import { sttService } from '../services/stt/stt.service';
import { translationService } from '../services/translation/translation.service';
import { ttsService } from '../services/tts/tts.service';
import { textChannelService } from '../services/text-channel/text-channel.service';
import logger from '../utils/logger';

const router = Router();

/**
 * Get system health
 * MODULE 10: Pipeline monitoring endpoint
 */
router.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  res.json(health);
});

/**
 * Get pipeline statistics
 * MODULE 10: Overall pipeline stats with error recovery
 */
router.get('/stats', (req, res) => {
  try {
    const pipelineStats = pipelineOrchestrator.getStats();
    const ttsStats = ttsService.getTTSStats();
    const translationStats = translationService.getCacheStats();
    const textChannelStats = textChannelService.getBufferStats();
    const errorStats = errorRecoveryService.getErrorStats();

    const stats = {
      timestamp: new Date(),
      pipeline: pipelineStats,
      tts: ttsStats,
      translation: translationStats,
      textChannel: textChannelStats,
      errors: errorStats,
      activeSessions: pipelineOrchestrator.getActivePipelines(),
    };

    res.json(stats);
  } catch (error: any) {
    logger.error('Failed to get stats', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

/**
 * Get health for specific session
 * MODULE 10: Session-specific health check
 */
router.get('/session/:sessionId/health', (req, res) => {
  try {
    const { sessionId } = req.params;
    const health = pipelineOrchestrator.getPipelineHealth(sessionId);

    if (!health) {
      return res.status(404).json({ error: 'Session not found or not active' });
    }

    res.json(health);
  } catch (error: any) {
    logger.error('Failed to get session health', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve session health' });
  }
});

/**
 * Get pipeline state for specific session
 * MODULE 10: Session state check
 */
router.get('/session/:sessionId/state', (req, res) => {
  try {
    const { sessionId } = req.params;
    const state = pipelineOrchestrator.getPipelineState(sessionId);

    res.json({ sessionId, state });
  } catch (error: any) {
    logger.error('Failed to get session state', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve session state' });
  }
});

/**
 * Get all active pipelines
 * MODULE 10: Active sessions list
 */
router.get('/pipelines/active', (req, res) => {
  try {
    const activePipelines = pipelineOrchestrator.getActivePipelines();
    
    const details = activePipelines.map(sessionId => ({
      sessionId,
      state: pipelineOrchestrator.getPipelineState(sessionId),
      health: pipelineOrchestrator.getPipelineHealth(sessionId),
    }));

    res.json({
      count: activePipelines.length,
      pipelines: details,
    });
  } catch (error: any) {
    logger.error('Failed to get active pipelines', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve active pipelines' });
  }
});

/**
 * Get error history for a session
 * MODULE 10: Error tracking
 */
router.get('/session/:sessionId/errors', (req, res) => {
  try {
    const { sessionId } = req.params;
    const errorHistory = errorRecoveryService.getErrorHistory(sessionId);

    res.json({
      sessionId,
      count: errorHistory.length,
      errors: errorHistory,
    });
  } catch (error: any) {
    logger.error('Failed to get error history', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve error history' });
  }
});

/**
 * Get global error statistics
 * MODULE 10: Error monitoring
 */
router.get('/errors/stats', (req, res) => {
  try {
    const errorStats = errorRecoveryService.getErrorStats();
    res.json(errorStats);
  } catch (error: any) {
    logger.error('Failed to get error stats', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve error statistics' });
  }
});

/**
 * Get latency report for session
 * MODULE 11: Latency monitoring
 */
router.get('/session/:sessionId/latency', (req, res) => {
  try {
    const { sessionId } = req.params;
    const recentCount = parseInt(req.query.recent as string) || 10;
    
    const report = latencyTelemetry.getLatencyReport(sessionId, recentCount);
    
    if (!report) {
      return res.status(404).json({ error: 'No latency data available for session' });
    }
    
    res.json(report);
  } catch (error: any) {
    logger.error('Failed to get latency report', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve latency report' });
  }
});

/**
 * Get latency statistics across all sessions
 * MODULE 11: Global latency monitoring
 */
router.get('/latency/global', (req, res) => {
  try {
    const sessionIds = latencyTelemetry.getSessionIds();
    
    const reports = sessionIds.map(sessionId => {
      const report = latencyTelemetry.getLatencyReport(sessionId, 0);
      return {
        sessionId,
        sampleCount: report?.sampleCount || 0,
        avgTotal: report?.totalEndToEnd.average || 0,
        avgText: report?.textDelivery.average || 0,
      };
    }).filter(r => r.sampleCount > 0);
    
    res.json({
      sessions: reports.length,
      reports,
    });
  } catch (error: any) {
    logger.error('Failed to get global latency stats', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve global latency statistics' });
  }
});

export default router;


/**
 * Receive client-side telemetry (T4, T5)
 * MODULE 11: Client telemetry endpoint
 */
router.post('/telemetry/client', (req, res) => {
  try {
    const { type, sessionId, sequenceNumber, targetLanguage, t4, t5 } = req.body;
    
    if (type === 'audio-playback' && sessionId && sequenceNumber !== undefined && targetLanguage) {
      if (t4) {
        latencyTelemetry.recordAudioDelivered(sessionId, sequenceNumber, targetLanguage, t4);
      }
      if (t5) {
        latencyTelemetry.recordPlaybackStarted(sessionId, sequenceNumber, targetLanguage, t5);
      }
    }
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to record client telemetry', { error: error.message });
    res.status(500).json({ error: 'Failed to record telemetry' });
  }
});

/**
 * Get resource usage statistics
 * MODULE 12: Resource monitoring
 */
router.get('/resources', (req, res) => {
  try {
    const stats = resourceMonitor.getStats();
    res.json(stats);
  } catch (error: any) {
    logger.error('Failed to get resource stats', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve resource statistics' });
  }
});

/**
 * Get connection manager statistics
 * MODULE 12: Connection monitoring
 */
router.get('/connections', (req, res) => {
  try {
    const stats = connectionManager.getStats();
    res.json(stats);
  } catch (error: any) {
    logger.error('Failed to get connection stats', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve connection statistics' });
  }
});

/**
 * Get session connection details
 * MODULE 12: Session-specific connection info
 */
router.get('/session/:sessionId/connections', (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = connectionManager.getSessionStats(sessionId);
    const languageGroups = connectionManager.getSessionLanguageGroups(sessionId);
    
    res.json({
      ...stats,
      languageGroups,
    });
  } catch (error: any) {
    logger.error('Failed to get session connections', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve session connections' });
  }
});
