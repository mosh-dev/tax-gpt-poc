/**
 * Pino Logger Configuration
 * Writes logs to storage/logs directory for debugging and monitoring
 */


import { getStoragePath } from '@/storage';
import { createStream } from 'rotating-file-stream';
import { existsSync, mkdirSync } from 'node:fs';
import pino from "pino";

// Ensure logs directory exists
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

export const pinoServerLogger = pino(
  {
    level: 'info',
  },
  pino.multistream([
    { level: 'info', stream: transport },     // pretty console output
    { level: 'info', stream: combinedLogStream }, // raw json for file rotation
  ])
);


/**
 * Create a child logger for the Tax Agent with detailed tool call logging
 */
export const agentLogger = pinoServerLogger.child({ module: 'TaxAgent' });

/**
 * Log streaming error with full context
 */
export function logStreamError(error: any) {
    agentLogger.error({
        event: 'stream-error',
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
    }, 'Streaming Error');
}

/**
 * Log LLM response for debugging JSON parsing issues
 */
export function logLLMResponse(event: any) {
    agentLogger.debug({
        event: 'llm-response',
        eventType: event.type,
        payload: event,
    }, `LLM Event: ${event.type}`);
}

console.log(`[Logger] Pino logger initialized`);
console.log(`[Logger] Logs directory: ${logsDir}`);
