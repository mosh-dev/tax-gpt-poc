import { Logger } from 'pino';
import { pinoServerLogger } from '@utils/pino-logger';

/**
 * Console-based logger implementation
 */
export class LoggerService {
  private pinoServerLogger = pinoServerLogger;
  protected readonly logger = this.createNewLogger('TaxGPT');

  public createNewLogger(module: string): Logger {
    this.pinoServerLogger.info(`Creating new logger for module: ${module}`);
    return this.pinoServerLogger.child({ module });
  }

  public log(obj: object, msg?: string): void;
  public log(msg: string): void;
  public log(objOrMsg: object | string, msg?: string): void {
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

  public error(obj: object, msg?: string): void;
  public error(msg: string): void;
  public error(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.error(objOrMsg);
    } else {
      this.logger.error(objOrMsg, msg);
    }
  }

  public logException(error: Error, msg?: string): void;
  public logException(obj: object, msg?: string): void;
  public logException(errorOrObj: Error | object, msg?: string): void {
    if (errorOrObj instanceof Error) {
      this.logger.error({ err: errorOrObj, stack: errorOrObj.stack }, msg || errorOrObj.message);
    } else {
      this.logger.error(errorOrObj, msg);
    }
  }
}
