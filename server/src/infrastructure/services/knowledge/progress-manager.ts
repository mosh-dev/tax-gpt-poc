import { Response } from 'express';

export interface ProcessingProgressEvent {
  type: 'progress';
  stage: 'extracting' | 'chunking' | 'embedding';
  progress: number;
  message: string;
}

export interface ProcessingCompleteEvent {
  type: 'complete';
  chunkCount: number;
  stats: {
    totalChunks: number;
    avgChunkSize: number;
    estimatedTokens: number;
  };
}

export interface ProcessingErrorEvent {
  type: 'error';
  message: string;
}

interface Subscriber {
  uploadId: string;
  res: Response;
}

class ProgressManager {
  private subscribers = new Map<string, Subscriber>();

  subscribe(uploadId: string, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.subscribers.set(uploadId, { uploadId, res });

    res.on('close', () => {
      this.subscribers.delete(uploadId);
    });
  }

  emitProgress(uploadId: string, event: ProcessingProgressEvent): void {
    const subscriber = this.subscribers.get(uploadId);
    if (!subscriber) return;

    const data = JSON.stringify(event);
    subscriber.res.write(`data: ${data}\n\n`);
  }

  complete(uploadId: string, data: ProcessingCompleteEvent): void {
    const subscriber = this.subscribers.get(uploadId);
    if (!subscriber) return;

    const eventData = JSON.stringify(data);
    subscriber.res.write(`data: ${eventData}\n\n`);
    subscriber.res.end();
    this.subscribers.delete(uploadId);
  }

  error(uploadId: string, message: string): void {
    const subscriber = this.subscribers.get(uploadId);
    if (!subscriber) return;

    const errorEvent: ProcessingErrorEvent = { type: 'error', message };
    const data = JSON.stringify(errorEvent);
    subscriber.res.write(`data: ${data}\n\n`);
    subscriber.res.end();
    this.subscribers.delete(uploadId);
  }
}

export const progressManager = new ProgressManager();
