import { Logger } from 'pino';
import { pinoServerLogger } from '@utils/pino-logger';

/**
 * Console-based logger implementation
 */
export class LoggerService {
  protected readonly logger = pinoServerLogger.child({ module: 'TaxGPT' });

  public createNewLogger(module: string): Logger {
    this.logger.info(`Creating logger for module: ${module}`);
    return pinoServerLogger.child({ module });
  }

  public info(obj: object, msg?: string): void;
  public info(msg: string): void;
  public info(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.info(objOrMsg);
    } else {
      this.logger.info(objOrMsg, msg);
    }
  }

  public warn(obj: object, msg?: string): void;
  public warn(msg: string): void;
  public warn(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.warn(objOrMsg);
    } else {
      this.logger.warn(objOrMsg, msg);
    }
  }

  public error(obj: object | unknown, msg?: string): void;
  public error(obj: object, msg?: string): void;
  public error(msg: string): void;
  public error(objOrMsg: object | string | unknown, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.error(objOrMsg);
    } else {
      this.logger.error(objOrMsg, msg);
    }
  }
}
