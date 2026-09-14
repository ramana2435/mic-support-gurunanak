import { Router } from 'express';
import Joi from 'joi';
import { sessionService } from '../services/session.service';
import { validate } from '../middleware/validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ApiResponse, Language } from '@live-translation/shared';

const router = Router();

// Validation schemas
const createSessionSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  organizerName: Joi.string().min(2).max(100).required(),
  sourceLanguage: Joi.string()
    .valid(...Object.values(Language))
    .required(),
  targetLanguages: Joi.array()
    .items(Joi.string().valid(...Object.values(Language)))
    .min(1)
    .required(),
  maxStudents: Joi.number().integer().min(1).max(500).optional(),
});

/**
 * POST /api/sessions
 * Create a new session
 */
router.post(
  '/',
  authenticate,
  validate(createSessionSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await sessionService.createSession(req.userId!, req.body);
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sessions
 * Get all sessions for the authenticated organizer
 */
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sessions = await sessionService.getSessionsByOrganizer(req.userId!);
    const response: ApiResponse = {
      success: true,
      data: sessions,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:id
 * Get a specific session
 */
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const session = await sessionService.getSessionById(req.params.id);
    const response: ApiResponse = {
      success: true,
      data: session,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/code/:code
 * Get session by code (no auth required - for students)
 */
router.get('/code/:code', async (req, res, next) => {
  try {
    const session = await sessionService.getSessionByCode(req.params.code);
    const response: ApiResponse = {
      success: true,
      data: session,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete a session
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await sessionService.deleteSession(req.params.id, req.userId!);
    const response: ApiResponse = {
      success: true,
      message: 'Session deleted successfully',
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
