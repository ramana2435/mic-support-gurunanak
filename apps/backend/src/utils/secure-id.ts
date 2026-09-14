/**
 * Secure ID Generation
 * MODULE 14: Cryptographically secure ID generation
 * 
 * Generates:
 * - Session codes: 6-10 character alphanumeric
 * - UUIDs: Standard v4
 * - Tokens: Cryptographically secure random bytes
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate cryptographically secure session code
 * Default: 6 uppercase alphanumeric characters
 * 
 * Entropy: 36^6 = 2,176,782,336 combinations
 * Safe from brute force with rate limiting
 */
export function generateSessionCode(length: number = 6): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const code: string[] = [];

  // Use crypto.randomBytes for cryptographically secure randomness
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % charset.length;
    code.push(charset[randomIndex]);
  }

  return code.join('');
}

/**
 * Generate secure UUID v4
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Generate secure random token
 * Returns base64-encoded string
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generate secure random string
 * Uses specified charset
 */
export function generateSecureString(length: number, charset: string): string {
  const randomBytes = crypto.randomBytes(length);
  const result: string[] = [];

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % charset.length;
    result.push(charset[randomIndex]);
  }

  return result.join('');
}

/**
 * Generate secure numeric code
 * Useful for 2FA, verification codes
 */
export function generateNumericCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;

  // Generate random number in range
  const range = max - min + 1;
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  const code = min + (randomNumber % range);

  return code.toString().padStart(length, '0');
}

/**
 * Hash string securely
 * Uses SHA-256
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Verify session code format
 * Must be alphanumeric, 6-10 characters
 */
export function isValidSessionCode(code: string): boolean {
  return /^[A-Z0-9]{6,10}$/.test(code);
}

/**
 * Verify UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Generate secure random integer in range
 */
export function getSecureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const randomBytes = crypto.randomBytes(bytesNeeded);
  
  let randomNumber = 0;
  for (let i = 0; i < bytesNeeded; i++) {
    randomNumber = (randomNumber << 8) | randomBytes[i];
  }

  return min + (randomNumber % range);
}

/**
 * Time-safe string comparison
 * Prevents timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  return crypto.timingSafeEqual(bufferA, bufferB);
}
