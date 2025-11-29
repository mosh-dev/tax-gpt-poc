import { Logger } from 'pino';
import { pinoServerLogger } from '@utils/pino-logger';

/**
 * Logger service that exposes Pino logger methods directly
 */
export class LoggerService {
  protected logger = pinoServerLogger.child({ module: 'TaxGPT' });

  public createNewLogger(module: string): Logger {
    this.logger.info(`Creating logger for module: ${module}`);
    return pinoServerLogger.child({ module });
  }

  /**
   * Log at 'info' level - delegates directly to Pino
   * Supports all Pino signatures:
   * - info('message')
   * - info('message %s %d', 'value', 123)
   * - info({ obj: 'value' }, 'message')
   * - info({ obj: 'value' })
   */
  public get info() {
    return this.logger.info.bind(this.logger);
  };

  /**
   * Log at 'warn' level - delegates directly to Pino
   * Supports all Pino signatures:
   * - warn('message')
   * - warn('message %s %d', 'value', 123)
   * - warn({ obj: 'value' }, 'message')
   * - warn({ obj: 'value' })
   */
  public get warn() {
    return this.logger.warn.bind(this.logger);
  };

  /**
   * Log at 'error' level - delegates directly to Pino
   * Supports all Pino signatures:
   * - error('message')
   * - error('message %s %d', 'value', 123)
   * - error({ obj: 'value' }, 'message')
   * - error({ obj: 'value' })
   */
  public get error() {
    return this.logger.error.bind(this.logger);
  };
}
