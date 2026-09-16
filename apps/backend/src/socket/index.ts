import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import {
  SocketEvent,
  JoinSessionPayload,
  SessionJoinedPayload,
  Student,
  SessionStatus,
  STTStartPayload,
  STTResultPayload,
  TranslationResultPayload,
  Language,
  TextRecoveryRequest,
  TextRecoveryResponse,
  TextSyncAck,
  TTSAudioChunkPayload,
  TTSErrorPayload,
  TTSStatusPayload,
} from '@live-translation/shared';
import { sessionService } from '../services/session.service';
import { sttService } from '../services/stt/stt.service';
import { translationService } from '../services/translation/translation.service';
import { textChannelService } from '../services/text-channel/text-channel.service';
import { ttsService } from '../services/tts/tts.service';
import { pipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator.service';
import { latencyTelemetry } from '../services/telemetry/latency-telemetry.service';
import { resourceMonitor } from '../services/scalability/resource-monitor.service';
import { connectionManager } from '../services/scalability/connection-manager.service';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { config } from '../config';

// In-memory storage for connected students (will be moved to Redis in Phase 6)
const connectedStudents = new Map<string, Student>();

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8, // 100 MB for audio data
  });

  // MODULE 12: Start resource monitoring and connection management
  resourceMonitor.start(5000); // 5 second intervals
  connectionManager.start();

  // MODULE 12: Listen for degradation events
  resourceMonitor.on('degradation:high', (event) => {
    // Notify all connected organizers about high resource usage
    io.emit('SYSTEM_WARNING', {
      level: 'high',
      resource: event.resource,
      percentage: event.percentage,
      message: `System resources (${event.resource}) at 90% capacity. New connections may be throttled.`,
    });
    logger.warn('System degradation warning sent to clients', event);
  });

  resourceMonitor.on('degradation:critical', (event) => {
    // Notify all connected organizers about critical resource usage
    io.emit('SYSTEM_WARNING', {
      level: 'critical',
      resource: event.resource,
      percentage: event.percentage,
      message: `CRITICAL: System resources (${event.resource}) at 95% capacity. No new connections accepted.`,
    });
    logger.error('Critical system degradation warning sent to clients', event);
  });

  // Set up pipeline orchestrator event listeners (MODULE 10)
  setupPipelineOrchestratorListeners(io);

  // Set up STT service event listeners (for organizer monitoring)
  setupSTTServiceListeners(io);

  // Set up TTS service event listeners (MODULE 8)
  setupTTSServiceListeners(io);

  io.on(SocketEvent.CONNECT, (socket: Socket) => {
    logger.info('Client connected', { socketId: socket.id });

    /**
     * MODULE 9: Ping-pong for latency measurement
     */
    socket.on('ping', (data: { timestamp: number }, callback) => {
      // Respond immediately with server timestamp
      callback({
        clientTimestamp: data.timestamp,
        serverTimestamp: Date.now(),
      });
    });

    /**
     * Organizer joins their session room
     */
    socket.on('join:organizer:room', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      logger.info('Organizer joined session room', { sessionId, socketId: socket.id });
    });

    /**
     * Start STT for a session
     */
    socket.on(SocketEvent.STT_START, async (payload: STTStartPayload) => {
      try {
        const { sessionId, language } = payload;

        logger.info('STT start requested', { sessionId, language, socketId: socket.id });

        // Verify session exists and is active
        const session = await sessionService.getSessionById(sessionId);
        if (session.status !== SessionStatus.ACTIVE && session.status !== SessionStatus.CREATED) {
          socket.emit(SocketEvent.STT_ERROR, {
            sessionId,
            error: 'Cannot start STT: session is not active',
          });
          return;
        }

        // Start STT streaming
        await sttService.startSession(sessionId, language);

        // Join STT room for this session
        socket.join(`stt:${sessionId}`);

        logger.info('STT started successfully', { sessionId });
      } catch (error: any) {
        logger.error('Failed to start STT', { error: error.message });
        socket.emit(SocketEvent.STT_ERROR, {
          sessionId: payload.sessionId,
          error: error.message,
        });
      }
    });

    /**
     * Stop STT for a session
     */
    socket.on(SocketEvent.STT_STOP, async (sessionId: string) => {
      try {
        logger.info('STT stop requested', { sessionId, socketId: socket.id });

        await sttService.stopSession(sessionId);
        socket.leave(`stt:${sessionId}`);

        logger.info('STT stopped successfully', { sessionId });
      } catch (error: any) {
        logger.error('Failed to stop STT', { error: error.message });
        socket.emit(SocketEvent.STT_ERROR, {
          sessionId,
          error: error.message,
        });
      }
    });

    /**
     * Receive audio data from organizer (MODULE 11: With T0 telemetry)
     */
    socket.on(SocketEvent.AUDIO_STREAM, async (data: { sessionId: string; audio: ArrayBuffer; timestamp: number; sequenceNumber?: number }) => {
      try {
        const { sessionId, audio, timestamp, sequenceNumber } = data;

        console.log('═══════════════════════════════════════════');
        console.log('✓ AUDIO_STREAM_RECEIVED');
        console.log(`Session: ${sessionId}`);
        console.log(`Socket: ${socket.id}`);
        console.log(`Audio size: ${audio.byteLength} bytes`);
        console.log(`Sequence: ${sequenceNumber}`);
        console.log('═══════════════════════════════════════════');

        // Log audio received
        logger.debug('[AUDIO] Audio chunk received', {
          sessionId,
          socketId: socket.id,
          audioSize: audio.byteLength,
          timestamp,
          sequenceNumber,
        });

        // Check if STT is active for this session
        const isActive = sttService.isSessionActive(sessionId);
        const sttState = sttService.getSessionState(sessionId);

        console.log('═══════════════════════════════════════════');
        console.log('✓ AUDIO_STT_STATE_CHECK');
        console.log(`Session: ${sessionId}`);
        console.log(`STT Active: ${isActive}`);
        console.log(`STT State: ${sttState || 'NOT_FOUND'}`);
        console.log('═══════════════════════════════════════════');

        if (!isActive) {
          console.log('═══════════════════════════════════════════');
          console.log('✗ AUDIO_REJECTED_STT_INACTIVE');
          console.log(`Session: ${sessionId}`);
          console.log(`STT State: ${sttState || 'NOT_FOUND'}`);
          console.log(`Socket: ${socket.id}`);
          console.log('═══════════════════════════════════════════');

          logger.warn('[AUDIO] STT not active for session, ignoring audio', {
            sessionId,
            socketId: socket.id,
            sttState: sttState || 'NOT_FOUND',
          });
          return;
        }

        console.log('═══════════════════════════════════════════');
        console.log('✓ AUDIO_ACCEPTED');
        console.log(`Session: ${sessionId}`);
        console.log(`STT State: ${sttState}`);
        console.log(`Processing audio...`);
        console.log('═══════════════════════════════════════════');

        logger.debug('[AUDIO] STT active, processing audio', {
          sessionId,
          audioSize: audio.byteLength,
          sttState,
        });

        // MODULE 11: Record T0 (audio captured at client)
        if (sequenceNumber !== undefined) {
          latencyTelemetry.recordAudioCaptured(sessionId, sequenceNumber, timestamp);
        }

        // Convert ArrayBuffer to Buffer
        const audioBuffer = Buffer.from(audio);

        // Process audio through STT
        await sttService.processAudio(sessionId, audioBuffer, timestamp);

        logger.debug('[AUDIO] Audio sent to STT service', {
          sessionId,
          bufferSize: audioBuffer.length,
        });
      } catch (error: any) {
        logger.error('[AUDIO] Failed to process audio', {
          error: error.message,
          stack: error.stack,
        });
      }
    });

    /**
     * Student joins a session (MODULE 12: With rate limiting and resource checks)
     */
    socket.on(
      SocketEvent.JOIN_SESSION,
      async (payload: JoinSessionPayload, callback) => {
        try {
          const { sessionCode, name, selectedLanguage } = payload;

          logger.info('[SOCKET] JOIN_SESSION attempt', {
            socketId: socket.id,
            sessionCode,
            name: name || 'Anonymous',
            language: selectedLanguage,
          });

          // MODULE 12: Check rate limit
          const ipAddress = socket.handshake.address;
          if (!connectionManager.checkRateLimit(ipAddress)) {
            logger.warn('[SOCKET] Rate limit exceeded', {
              socketId: socket.id,
              ipAddress,
              sessionCode,
            });
            callback({
              success: false,
              error: 'Too many join requests. Please wait and try again.',
            });
            return;
          }

          // Get session
          const session = await sessionService.getSessionByCode(sessionCode);

          logger.info('[SOCKET] Session found', {
            socketId: socket.id,
            sessionId: session.id,
            sessionCode,
            sessionStatus: session.status,
          });

          // Check if session is expired
          if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
            await sessionService.updateSessionStatus(session.id, SessionStatus.EXPIRED);
            logger.warn('[SOCKET] Session expired', {
              socketId: socket.id,
              sessionId: session.id,
            });
            callback({
              success: false,
              error: 'Session has expired',
            });
            return;
          }

          // Check if session is joinable (CREATED or ACTIVE only)
          if (session.status !== SessionStatus.CREATED && session.status !== SessionStatus.ACTIVE) {
            logger.warn('[SOCKET] Session not joinable', {
              socketId: socket.id,
              sessionId: session.id,
              status: session.status,
            });
            callback({
              success: false,
              error: `Session is ${session.status}. Cannot join.`,
            });
            return;
          }

          // MODULE 12: Ensure session is registered with resource monitor
          const sessionResources = resourceMonitor.getSessionResources(session.id);
          if (!sessionResources) {
            logger.warn('[SOCKET] Session not registered with resource monitor, registering now', {
              sessionId: session.id,
            });
            resourceMonitor.registerSession(session.id);
          }

          // MODULE 12: Check resource availability with detailed error messages
          const resourceCheck = resourceMonitor.canAcceptConnection(session.id);
          logger.info('[SOCKET] Resource check', {
            socketId: socket.id,
            sessionId: session.id,
            canAccept: resourceCheck,
            currentConnections: resourceMonitor.getSessionResources(session.id)?.connections || 0,
            totalConnections: resourceMonitor.getStats().connections.total,
          });

          if (!resourceCheck) {
            const currentSnapshot = resourceMonitor.getCurrentSnapshot();
            const limits = resourceMonitor.getLimits();

            let errorMessage = 'Server is at capacity. Please try again later.';

            if (currentSnapshot) {
              const memPct = currentSnapshot.memory.percentage;
              const cpuPct = currentSnapshot.cpu.usage;

              if (memPct > limits.maxMemoryPercentage) {
                errorMessage = 'Server memory capacity reached. Please wait and try again.';
              } else if (cpuPct > limits.maxCPUPercentage) {
                errorMessage = 'Server CPU capacity reached. Please wait and try again.';
              } else if (currentSnapshot.connections.total >= limits.maxTotalConnections) {
                errorMessage = 'Maximum concurrent connections reached. Please try again shortly.';
              }
            }

            callback({
              success: false,
              error: errorMessage,
            });
            logger.warn('[SOCKET] Connection rejected due to resource limits', {
              sessionId: session.id,
              socketId: socket.id,
              snapshot: currentSnapshot ? {
                memory: currentSnapshot.memory.percentage.toFixed(1) + '%',
                cpu: currentSnapshot.cpu.usage.toFixed(1) + '%',
                connections: currentSnapshot.connections.total,
              } : null,
            });
            return;
          }

          // Check if session is full
          const connectedCount =
            await sessionService.getConnectedStudentsCount(session.id);
          if (connectedCount >= session.maxStudents) {
            callback({
              success: false,
              error: 'Session is full',
            });
            return;
          }

          // Create student record
          const studentId = uuidv4();
          await query(
            `INSERT INTO students (id, session_id, name, selected_language, socket_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [studentId, session.id, name, selectedLanguage, socket.id]
          );

          const student: Student = {
            id: studentId,
            sessionId: session.id,
            name,
            selectedLanguage,
            connectedAt: new Date(),
            socketId: socket.id,
          };

          // Store in memory
          connectedStudents.set(socket.id, student);

          // MODULE 12: Register with connection manager
          connectionManager.registerConnection(socket, session.id, studentId, selectedLanguage);
          resourceMonitor.addConnection(session.id);

          logger.info('[SOCKET] Student connection registered with resource monitor', {
            socketId: socket.id,
            sessionId: session.id,
            studentId,
            sessionConnections: resourceMonitor.getSessionResources(session.id)?.connections || 0,
            totalConnections: resourceMonitor.getStats().connections.total,
          });

          // Join session room
          socket.join(`session:${session.id}`);

          // Join language-specific room for translations
          socket.join(`session:${session.id}:lang:${selectedLanguage}`);

          // Get all students in session
          const studentsResult = await query(
            'SELECT * FROM students WHERE session_id = $1 AND disconnected_at IS NULL',
            [session.id]
          );

          const students: Student[] = studentsResult.rows.map((row) => ({
            id: row.id,
            sessionId: row.session_id,
            name: row.name,
            selectedLanguage: row.selected_language,
            connectedAt: row.connected_at,
            socketId: row.socket_id,
          }));

          // Send success response to joining student
          const joinedPayload: SessionJoinedPayload = {
            sessionId: session.id,
            studentId,
            session,
            students,
          };

          callback({
            success: true,
            data: joinedPayload,
          });

          // Notify all students in the session
          socket.to(`session:${session.id}`).emit(SocketEvent.STUDENT_JOINED, {
            student,
          });

          // Broadcast updated student count to organizer and all students
          const updatedCount = await sessionService.getConnectedStudentsCount(session.id);
          io.to(`session:${session.id}`).emit(SocketEvent.STUDENTS_COUNT_UPDATED, {
            sessionId: session.id,
            count: updatedCount,
          });

          // Update translation service with all active languages for this session
          const uniqueLanguages = new Set(students.map(s => s.selectedLanguage));
          translationService.registerSessionLanguages(session.id, Array.from(uniqueLanguages));

          logger.info('[SOCKET] Student joined session successfully', {
            studentId,
            sessionId: session.id,
            sessionCode: session.code,
            socketId: socket.id,
            connectedCount: updatedCount,
            sessionLanguages: Array.from(uniqueLanguages),
            name: student.name,
            selectedLanguage: student.selectedLanguage,
          });
        } catch (error: any) {
          logger.error('[SOCKET] Error joining session', {
            error: error.message,
            stack: error.stack,
            socketId: socket.id,
          });
          callback({
            success: false,
            error: error.message || 'Failed to join session',
          });
        }
      }
    );

    /**
     * Organizer starts session (MODULE 10: Integrated Pipeline)
     */
    socket.on(SocketEvent.START_SESSION, async (sessionId: string) => {
      try {
        console.log('═══════════════════════════════════════════');
        console.log('✓ START_SESSION_RECEIVED');
        console.log(`Session: ${sessionId}`);
        console.log(`Socket: ${socket.id}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log('═══════════════════════════════════════════');

        logger.info('[START_SESSION] Starting session', {
          sessionId,
          socketId: socket.id,
        });

        // Get session details
        const session = await sessionService.getSessionById(sessionId);

        logger.info('[START_SESSION] Session details retrieved', {
          sessionId,
          sourceLanguage: session.sourceLanguage,
          targetLanguages: session.targetLanguages,
          status: session.status,
        });

        console.log('═══════════════════════════════════════════');
        console.log('✓ SESSION_DETAILS_LOADED');
        console.log(`Session: ${sessionId}`);
        console.log(`Source Language: ${session.sourceLanguage}`);
        console.log(`Target Languages: ${session.targetLanguages.join(', ')}`);
        console.log(`Current Status: ${session.status}`);
        console.log('═══════════════════════════════════════════');

        // Start the integrated pipeline
        await pipelineOrchestrator.startPipeline({
          sessionId,
          sourceLanguage: session.sourceLanguage,
          targetLanguages: session.targetLanguages,
          enableSTT: true,
          enableTranslation: true,
          enableTTS: true,
          enableTextChannel: true,
        });

        console.log('═══════════════════════════════════════════');
        console.log('✓ PIPELINE_STARTED');
        console.log(`Session: ${sessionId}`);
        console.log(`STT: enabled`);
        console.log(`Translation: enabled`);
        console.log('═══════════════════════════════════════════');

        logger.info('[START_SESSION] Pipeline started', { sessionId });

        // Notify all students
        io.to(`session:${sessionId}`).emit(SocketEvent.SESSION_STARTED, {
          session: { ...session, status: SessionStatus.ACTIVE },
        });

        console.log('═══════════════════════════════════════════');
        console.log('✓ SESSION_STARTED_EVENT_BROADCAST');
        console.log(`Session: ${sessionId}`);
        console.log(`Status: ACTIVE`);
        console.log(`Room: session:${sessionId}`);
        console.log('═══════════════════════════════════════════');

        logger.info('[START_SESSION] Session started successfully, students notified', {
          sessionId,
        });
      } catch (error: any) {
        console.log('═══════════════════════════════════════════');
        console.log('✗ START_SESSION_ERROR');
        console.log(`Session: ${sessionId}`);
        console.log(`Error: ${error.message}`);
        console.log('═══════════════════════════════════════════');

        logger.error('[START_SESSION] Error starting session', {
          sessionId,
          error: error.message,
          stack: error.stack,
        });
        socket.emit(SocketEvent.SESSION_ERROR, {
          error: error.message,
        });
      }
    });

    /**
     * Organizer stops session (MODULE 10: Integrated Pipeline)
     */
    socket.on(SocketEvent.STOP_SESSION, async (sessionId: string) => {
      try {
        // Stop the integrated pipeline (handles all cleanup)
        await pipelineOrchestrator.stopPipeline(sessionId);

        // Get updated session
        const session = await sessionService.getSessionById(sessionId);

        // Notify all students
        io.to(`session:${sessionId}`).emit(SocketEvent.SESSION_STOPPED, {
          session,
        });

        logger.info('Session stopped with integrated pipeline', { sessionId });
      } catch (error: any) {
        logger.error('Error stopping session', { error: error.message });
        socket.emit(SocketEvent.SESSION_ERROR, {
          error: error.message,
        });
      }
    });

    /**
     * Client disconnects (MODULE 12: With connection manager cleanup)
     */
    socket.on(SocketEvent.DISCONNECT, async () => {
      logger.info('[SOCKET] Client disconnecting', { socketId: socket.id });

      try {
        const student = connectedStudents.get(socket.id);

        if (student) {
          logger.info('[SOCKET] Student disconnect detected', {
            socketId: socket.id,
            studentId: student.id,
            sessionId: student.sessionId,
          });

          // MODULE 12: Unregister from connection manager
          connectionManager.unregisterConnection(socket.id);
          resourceMonitor.removeConnection(student.sessionId);

          logger.info('[SOCKET] Student removed from resource monitor', {
            socketId: socket.id,
            sessionId: student.sessionId,
            sessionConnections: resourceMonitor.getSessionResources(student.sessionId)?.connections || 0,
            totalConnections: resourceMonitor.getStats().connections.total,
          });

          // Update student record
          await query(
            'UPDATE students SET disconnected_at = $1 WHERE socket_id = $2',
            [new Date(), socket.id]
          );

          // Remove from memory
          connectedStudents.delete(socket.id);

          // Notify session
          socket.to(`session:${student.sessionId}`).emit(
            SocketEvent.STUDENT_LEFT,
            {
              studentId: student.id,
            }
          );

          // Broadcast updated student count
          const updatedCount = await sessionService.getConnectedStudentsCount(student.sessionId);
          io.to(`session:${student.sessionId}`).emit(SocketEvent.STUDENTS_COUNT_UPDATED, {
            sessionId: student.sessionId,
            count: updatedCount,
          });

          // Update translation service with remaining active languages
          if (updatedCount > 0) {
            const remainingStudents = await query(
              'SELECT DISTINCT selected_language FROM students WHERE session_id = $1 AND disconnected_at IS NULL',
              [student.sessionId]
            );
            const uniqueLanguages = remainingStudents.rows.map(row => row.selected_language);
            translationService.registerSessionLanguages(student.sessionId, uniqueLanguages);
          } else {
            // No students left, unregister session from translation service
            translationService.unregisterSession(student.sessionId);
            // Clear text channel messages for this session
            textChannelService.clearSession(student.sessionId);
          }

          // Keep student sequence tracking for recovery (cleared after timeout)
          setTimeout(() => {
            textChannelService.clearStudentTracking(student.id);
          }, 300000); // 5 minutes grace period

          logger.info('Student disconnected', {
            studentId: student.id,
            socketId: socket.id,
            connectedCount: updatedCount,
          });
        } else {
          logger.info('Client disconnected', { socketId: socket.id });
        }
      } catch (error: any) {
        logger.error('Error handling disconnect', { error: error.message });
      }
    });

    /**
     * Text Recovery Request (MODULE 7)
     * Student requests missed messages after reconnection
     */
    socket.on(SocketEvent.TEXT_RECOVERY_REQUEST, async (request: TextRecoveryRequest) => {
      try {
        const { sessionId, studentId, targetLanguage, lastReceivedSequence } = request;

        logger.info('Text recovery requested', {
          studentId,
          sessionId,
          targetLanguage,
          lastReceivedSequence,
        });

        // Get missed messages
        const missedMessages = textChannelService.getMissedMessages(
          sessionId,
          targetLanguage,
          lastReceivedSequence
        );

        // Convert to payloads
        const payloads = missedMessages.map(msg => ({
          sessionId: msg.sessionId,
          text: msg.text,
          translatedText: msg.translatedText,
          sourceLanguage: msg.sourceLanguage,
          targetLanguage: msg.targetLanguage,
          sequenceNumber: msg.sequenceNumber,
          timestamp: msg.timestamp,
          isFinal: msg.isFinal,
          confidence: msg.confidence,
          latency: msg.latency,
        }));

        // Send recovery response
        const response: TextRecoveryResponse = {
          sessionId,
          missedMessages: payloads,
          recoveredCount: payloads.length,
        };

        socket.emit(SocketEvent.TEXT_RECOVERY_RESPONSE, response);

        logger.info('Text recovery sent', {
          studentId,
          recoveredCount: payloads.length,
        });
      } catch (error: any) {
        logger.error('Text recovery failed', {
          error: error.message,
          request,
        });
      }
    });

    /**
     * Text Sync Acknowledgment (MODULE 7)
     * Student confirms receipt of a message
     */
    socket.on(SocketEvent.TEXT_SYNC_ACK, (ack: TextSyncAck) => {
      textChannelService.updateStudentSequence(ack.studentId, ack.sequenceNumber);

      logger.debug('Text sync ack received', {
        studentId: ack.studentId,
        sequenceNumber: ack.sequenceNumber,
      });
    });
  });

  logger.info('Socket.IO server initialized');

  return io;
};

/**
 * Set up Pipeline Orchestrator event listeners (MODULE 10)
 */
function setupPipelineOrchestratorListeners(io: SocketIOServer): void {
  // Translation interim results
  pipelineOrchestrator.on('translation:interim', (payload: any) => {
    io.to(`session:${payload.sessionId}:lang:${payload.targetLanguage}`).emit(
      SocketEvent.TRANSLATION_INTERIM,
      payload
    );

    logger.debug('Translation interim broadcast', {
      sessionId: payload.sessionId,
      targetLanguage: payload.targetLanguage,
      sequenceNumber: payload.sequenceNumber,
    });
  });

  // Translation final results
  pipelineOrchestrator.on('translation:final', (payload: any) => {
    io.to(`session:${payload.sessionId}:lang:${payload.targetLanguage}`).emit(
      SocketEvent.TRANSLATION_FINAL,
      payload
    );

    logger.info('Translation final broadcast', {
      sessionId: payload.sessionId,
      targetLanguage: payload.targetLanguage,
      sequenceNumber: payload.sequenceNumber,
    });
  });

  // Pipeline errors
  pipelineOrchestrator.on('pipeline:error', (data: any) => {
    io.to(`session:${data.sessionId}`).emit(SocketEvent.SESSION_ERROR, {
      error: data.error,
    });

    logger.error('Pipeline error broadcast', data);
  });

  // Pipeline warnings (non-fatal)
  pipelineOrchestrator.on('pipeline:warning', (data: any) => {
    logger.warn('Pipeline warning', data);
  });

  // Pipeline stall detection
  pipelineOrchestrator.on('pipeline:stall', (data: any) => {
    logger.warn('Pipeline stall detected', data);
    io.to(`session:${data.sessionId}`).emit(SocketEvent.SESSION_ERROR, {
      error: 'Translation pipeline may be experiencing delays',
    });
  });

  // Pipeline health updates
  pipelineOrchestrator.on('pipeline:health', (health: any) => {
    // Could emit to organizer dashboard for monitoring
    logger.debug('Pipeline health', health);
  });

  logger.info('Pipeline orchestrator listeners initialized');
}

/**
 * Set up STT service event listeners (for organizer monitoring only)
 */
/**
 * Set up STT service event listeners (for organizer monitoring only)
 */
function setupSTTServiceListeners(io: SocketIOServer): void {
  // Interim STT results (organizer monitoring)
  sttService.on('interim', async (data: any) => {
    const { result, latency } = data;
    const payload: STTResultPayload = {
      sessionId: result.sessionId,
      text: result.text,
      isFinal: false,
      timestamp: result.timestamp,
      sequenceNumber: result.sequenceNumber,
      confidence: result.confidence,
      latency,
    };

    // Broadcast STT interim to organizer (for monitoring only)
    // Pipeline orchestrator handles the translation flow
    io.to(`session:${result.sessionId}`).emit(SocketEvent.STT_INTERIM, payload);

    logger.debug('STT interim result broadcast to organizer', {
      sessionId: result.sessionId,
      latency: latency?.totalLatency,
    });
  });

  // Final STT results (organizer monitoring)
  sttService.on('final', async (data: any) => {
    const { result, latency } = data;
    const payload: STTResultPayload = {
      sessionId: result.sessionId,
      text: result.text,
      isFinal: true,
      timestamp: result.timestamp,
      sequenceNumber: result.sequenceNumber,
      confidence: result.confidence,
      latency,
    };

    // Broadcast STT final to organizer (for monitoring only)
    // Pipeline orchestrator handles the translation flow
    io.to(`session:${result.sessionId}`).emit(SocketEvent.STT_FINAL, payload);

    logger.info('STT final result broadcast to organizer', {
      sessionId: result.sessionId,
      text: result.text,
      latency: latency?.totalLatency,
    });
  });

  // STT errors
  sttService.on('error', (data: any) => {
    io.to(`session:${data.sessionId}`).emit(SocketEvent.STT_ERROR, {
      sessionId: data.sessionId,
      error: data.error,
    });

    logger.error('STT error broadcast', data);
  });

  // STT reconnecting
  sttService.on('reconnecting', (data: any) => {
    logger.info('STT reconnecting', data);
  });

  // STT reconnected
  sttService.on('reconnected', (data: any) => {
    logger.info('STT reconnected', data);
  });

  // STT reconnect failed
  sttService.on('reconnectFailed', (data: any) => {
    io.to(`session:${data.sessionId}`).emit(SocketEvent.STT_ERROR, {
      sessionId: data.sessionId,
      error: 'STT connection failed after multiple attempts',
    });

    logger.error('STT reconnect failed', data);
  });

  logger.info('STT service listeners initialized');
}

/**
 * Set up TTS service event listeners (MODULE 8)
 */
function setupTTSServiceListeners(io: SocketIOServer): void {
  // TTS audio chunk ready
  ttsService.on('tts:chunk', (chunk: any) => {
    try {
      const {
        sessionId,
        targetLanguage,
        sequenceNumber,
        chunkIndex,
        audioData,
        format,
        sampleRate,
        isLast,
        timestamp,
        latency,
      } = chunk;

      // Convert audio buffer to base64 for transmission
      const audioDataBase64 = audioData.toString('base64');

      const payload: TTSAudioChunkPayload = {
        sessionId,
        targetLanguage,
        sequenceNumber,
        chunkIndex,
        audioData: audioDataBase64,
        format,
        sampleRate,
        isLast,
        timestamp,
        latency,
      };

      // Emit to language-specific room
      io.to(`session:${sessionId}:lang:${targetLanguage}`).emit(
        isLast ? SocketEvent.TTS_AUDIO_END : SocketEvent.TTS_AUDIO_CHUNK,
        payload
      );

      if (chunkIndex === 0) {
        logger.debug('TTS first audio chunk broadcasted', {
          sessionId,
          targetLanguage,
          sequenceNumber,
          ttsLatency: latency?.ttsLatency,
        });
      }

      if (isLast) {
        logger.debug('TTS audio end broadcasted', {
          sessionId,
          targetLanguage,
          sequenceNumber,
        });
      }
    } catch (error: any) {
      logger.error('TTS chunk broadcast error', {
        error: error.message,
      });
    }
  });

  // TTS error
  ttsService.on('tts:error', (data: any) => {
    const { sessionId, targetLanguage, sequenceNumber, error } = data;

    const payload: TTSErrorPayload = {
      sessionId,
      targetLanguage,
      sequenceNumber,
      error,
    };

    // Emit to language-specific room
    io.to(`session:${sessionId}:lang:${targetLanguage}`).emit(SocketEvent.TTS_ERROR, payload);

    logger.warn('TTS error broadcasted', {
      sessionId,
      targetLanguage,
      error,
    });
  });

  logger.info('TTS service listeners initialized');
}

