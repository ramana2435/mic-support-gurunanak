import { Router } from 'express';
import Joi from 'joi';
import { authService } from '../services/auth.service';
import { validate } from '../middleware/validator';
import { ApiResponse } from '@live-translation/shared';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

/**
 * POST /api/auth/register
 * Register a new organizer
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    const response: ApiResponse = {
      success: true,
      data: result,
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login an organizer
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    const response: ApiResponse = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current organizer
 */
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await authService.getOrganizerById(req.userId!);
    const response: ApiResponse = {
      success: true,
      data: user,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
