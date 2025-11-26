/**
 * DI Container Tokens
 * Centralized token constants for dependency injection
 */

// Configuration tokens
export const TOKENS = {
  BASE_URL: 'BASE_URL',
} as const;

// Type helper
export type TokenKey = keyof typeof TOKENS;
export type TokenValue = typeof TOKENS[TokenKey];
