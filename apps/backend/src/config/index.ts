import dotenv from 'dotenv';
import { AppConfig } from '@live-translation/shared';

dotenv.config();

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

const getEnvVarNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

export const config: AppConfig = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvVarNumber('PORT', 3001),
  corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
  jwtSecret: getEnvVar('JWT_SECRET'),
  jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '7d'),
  databaseUrl: getEnvVar('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL,
  maxStudentsPerSession: getEnvVarNumber('MAX_STUDENTS_PER_SESSION', 100),
  sessionCodeLength: getEnvVarNumber('SESSION_CODE_LENGTH', 6),
  sessionExpiryHours: getEnvVarNumber('SESSION_EXPIRY_HOURS', 24),
};

export const groqApiKey = process.env.GROQ_API_KEY || '';

export const isProduction = config.nodeEnv === 'production';
export const isDevelopment = config.nodeEnv === 'development';
