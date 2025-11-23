/**
 * Pino Logger Configuration
 * Writes logs to storage/logs directory for debugging and monitoring
 */

import pino from 'pino';
import * as path from 'path';
import * as fs from 'fs';
import { getStoragePath } from './storage';

// Ensure logs directory exists
const logsDir = getStoragePath('logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Create a Pino logger instance
 * Writes to both console (pretty) and file (JSON)
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        targets: [
            // Console output with pretty formatting
            {
                target: 'pino-pretty',
                level: 'info',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
            // File output with JSON formatting
            {
                target: 'pino/file',
                level: 'debug',
                options: {
                    destination: path.join(logsDir, 'app.log'),
                    mkdir: true,
                },
            },
        ],
    },
});

/**
 * Create a child logger for the Tax Agent with detailed tool call logging
 */
export const agentLogger = logger.child({ module: 'TaxAgent' });

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