import { Language } from '../types';

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

export const isValidSessionCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};

export const isValidLanguage = (lang: string): lang is Language => {
  return Object.values(Language).includes(lang as Language);
};

export const sanitizeString = (str: string, maxLength: number = 100): string => {
  return str.trim().slice(0, maxLength);
};
