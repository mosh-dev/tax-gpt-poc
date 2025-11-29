/**
 * Error handling utilities
 * Provides type-safe error handling for catch blocks
 */

/**
 * Type guard to check if a value is an Error instance
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Get error message from unknown error type
 * Safely extracts message from Error objects or converts to string
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}
