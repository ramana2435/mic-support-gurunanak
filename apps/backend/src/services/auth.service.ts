// Bcrypt temporarily disabled due to SSL installation issues
// import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { query } from '../database';
import {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  OrganizerUser,
} from '@live-translation/shared';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';

const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Register a new organizer
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const { email, password, name } = credentials;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM organizers WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new ValidationError('Email already registered');
    }

    // Hash password (TEMPORARY MOCK - replace with bcrypt when SSL issue resolved)
    const passwordHash = `mock_hash_${password}`;

    // Create user
    const result = await query(
      `INSERT INTO organizers (email, password_hash, name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, name, created_at`,
      [email, passwordHash, name]
    );

    const user = result.rows[0];
    const token = this.generateToken(user.id, user.email);

    logger.info('New organizer registered', { userId: user.id, email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
    };
  }

  /**
   * Login an organizer
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Find user
    const result = await query(
      'SELECT id, email, name, password_hash, created_at FROM organizers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password (TEMPORARY MOCK - replace with bcrypt when SSL issue resolved)
    const isValidPassword = user.password_hash === `mock_hash_${password}`;

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.email);

    logger.info('Organizer logged in', { userId: user.id, email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
    };
  }

  /**
   * Get organizer by ID
   */
  async getOrganizerById(id: string): Promise<OrganizerUser | null> {
    const result = await query(
      'SELECT id, email, name, created_at FROM organizers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, email: string): string {
    // @ts-expect-error - JWT typing issue with newer TypeScript versions
    return jwt.sign(
      { userId, email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }
}

export const authService = new AuthService();
