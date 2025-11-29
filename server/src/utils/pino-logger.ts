import pino from 'pino';
import { createStream } from 'rotating-file-stream';
import { existsSync, mkdirSync } from 'node:fs';
import { getStoragePath } from '@config/storage';
import pretty from 'pino-pretty';

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

export const pinoServerLogger = pino(
  { level: 'info' },
  pino.multistream([
    { level: 'info', stream: prettyStream },
    { level: 'info', stream: combinedLogStream },
  ])
);
