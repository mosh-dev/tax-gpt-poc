import { getStoragePath } from '@config/storage';
import { existsSync, mkdirSync } from 'node:fs';
import { createStream } from 'rotating-file-stream';
import pino, { Logger } from 'pino';
import pretty from 'pino-pretty';

/**
 * Console-based logger implementation
 */
export class LoggerService {
  private pinoServerLogger: Logger;
  protected readonly logger: Logger;

  constructor() {
    const logsDir = getStoragePath('logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    const combinedLogStream = createStream('combined.log', {
      path: logsDir,
      size: '10M',
      interval: '1d',
      compress: 'gzip',
    });

    const prettyStream = pretty({
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname,module',
      messageFormat: (log, messageKey) => {
        const module = log.module ? `[${log.module}] - ` : '';
        return `${module}${log[messageKey]}`;
      },
    });

    this.pinoServerLogger = pino(
      { level: 'info' },
      pino.multistream([
        { level: 'info', stream: prettyStream },
        { level: 'info', stream: combinedLogStream },
      ])
    );
    this.logger = this.createNewLogger('TaxGPT');
  }

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
