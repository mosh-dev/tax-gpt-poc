/**
 * Logger Service
 * Generic logging infrastructure service
 */

import { injectable } from 'tsyringe';

export interface ILoggerService {
  info(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Console-based logger implementation
 * TSyringe will automatically create and inject this service
 */
@injectable()
export class LoggerService implements ILoggerService {
  constructor(private serviceName: string = 'TaxGPT') {}

  info(message: string, meta?: Record<string, any>): void {
    console.log(`[${this.serviceName}] INFO:`, message, meta || '');
  }

  error(message: string, error?: Error, meta?: Record<string, any>): void {
    console.error(`[${this.serviceName}] ERROR:`, message, error?.message || '', meta || '');
    if (error?.stack) {
      console.error(error.stack);
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    console.warn(`[${this.serviceName}] WARN:`, message, meta || '');
  }

  debug(message: string, meta?: Record<string, any>): void {
    console.debug(`[${this.serviceName}] DEBUG:`, message, meta || '');
  }
}

// Export singleton instance (can also be managed by container)
export const loggerService = new LoggerService();