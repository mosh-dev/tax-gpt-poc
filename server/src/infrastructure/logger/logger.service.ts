/**
 * Console-based logger implementation
 */
export class LoggerService {
  constructor(private serviceName: string = 'TaxGPT') {
  }

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
