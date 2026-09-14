import { config } from '../config';
import { generateSessionCode as generateSecureCode } from './secure-id';

/**
 * Generate a cryptographically secure session code
 * MODULE 14: Using crypto.randomBytes for security
 * Default: 6-character alphanumeric code (e.g., A3X9K2)
 */
export const generateSessionCode = (): string => {
  return generateSecureCode(config.sessionCodeLength);
};

/**
 * Validate session code format
 * MODULE 14: Updated for alphanumeric codes
 */
export const validateSessionCode = (code: string): boolean => {
  const length = config.sessionCodeLength;
  const regex = new RegExp(`^[A-Z0-9]{${length}}$`);
  return regex.test(code);
};
