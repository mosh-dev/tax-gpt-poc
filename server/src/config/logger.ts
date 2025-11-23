/**
 * Pino Logger Configuration
 * Writes logs to storage/logs directory for debugging and monitoring
 */

import pino from 'pino';
import * as path from 'path';
import * as fs from 'fs';
import { getStoragePath } from './storage';
import pretty from 'pino-pretty';
import { createStream } from 'rotating-file-stream';

// Ensure logs directory exists
const logsDir = getStoragePath('logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
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
 * Log tool call with arguments
 */
export function logToolCall(toolName: string | undefined, toolCallId: string | undefined, args: any) {
    agentLogger.info({
        event: 'tool-call',
        toolName: toolName || 'unknown',
        toolCallId: toolCallId || 'unknown',
        args: args || {},
    }, `Tool Call: ${toolName || 'unknown'}`);
}

/**
 * Log tool result
 */
export function logToolResult(toolName: string | undefined, toolCallId: string | undefined, result: any) {
    let resultPreview = 'undefined';

    try {
        if (result === undefined || result === null) {
            resultPreview = String(result);
        } else if (typeof result === 'string') {
            resultPreview = result.substring(0, 200);
        } else {
            const jsonStr = JSON.stringify(result);
            resultPreview = jsonStr ? jsonStr.substring(0, 200) : 'undefined';
        }
    } catch (error) {
        resultPreview = `[Error stringifying result: ${error}]`;
    }

    agentLogger.info({
        event: 'tool-result',
        toolName: toolName || 'unknown',
        toolCallId: toolCallId || 'unknown',
        resultPreview,
    }, `Tool Result: ${toolName || 'unknown'}`);
}

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
console.log(`[Logger] Log file: ${path.join(logsDir, 'app.log')}`);
