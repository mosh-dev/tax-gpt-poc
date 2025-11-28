import { getStoragePath } from '@config/storage';
import { existsSync, mkdirSync } from 'node:fs';
import { createStream } from 'rotating-file-stream';
import pino, { Logger } from 'pino';

/**
 * Console-based logger implementation
 */
export class LoggerService {
  private pinoServerLogger: Logger;
  protected readonly logger : Logger;

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

// Use Pino v8 transport for pretty print
    const transport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: false,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    });

    this.pinoServerLogger = pino(
      {
        level: 'info',
      },
      pino.multistream([
        { level: 'info', stream: transport },     // pretty console output
        { level: 'info', stream: combinedLogStream }, // raw json for file rotation
      ])
    );
    this.logger = this.createNewLogger('TaxGPT');
  }

  public createNewLogger(module: string): Logger {
    return this.pinoServerLogger.child({ module });
  }

  public logInfo(obj: object, msg?: string): void;
  public logInfo(msg: string): void;
  public logInfo(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      this.logger.info(objOrMsg);
    } else {
      this.logger.info(objOrMsg, msg);
    }
  }

  public logError(obj: object, msg?: string): void;
  public logError(msg: string): void;
  public logError(objOrMsg: object | string, msg?: string): void {
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
