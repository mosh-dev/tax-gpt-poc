import { authService } from './auth';
import { API_BASE_URL } from './api';

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

export type ProcessingEvent = ProcessingProgressEvent | ProcessingCompleteEvent | ProcessingErrorEvent;

export interface ProcessingEventCallback {
  (event: ProcessingEvent): void;
}

export async function subscribeToProcessingProgress(
  uploadId: string,
  onEvent: ProcessingEventCallback,
  onError?: (error: Error) => void
): Promise<() => void> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let isClosed = false;

  try {
    const response = await authService.fetchWithAuth(
      `${API_BASE_URL}/api/knowledge/upload-progress/${uploadId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to connect to progress stream: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    (async () => {
      try {
        while (reader && !isClosed) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6).trim();

              if (data) {
                try {
                  const event = JSON.parse(data) as ProcessingEvent;
                  onEvent(event);

                  if (event.type === 'complete' || event.type === 'error') {
                    isClosed = true;
                    reader?.cancel();
                    break;
                  }
                } catch (parseError) {
                  console.error('[SSE] Failed to parse event:', parseError);
                }
              }
            }
          }
        }
      } catch (error) {
        if (!isClosed) {
          onError?.(error instanceof Error ? error : new Error('SSE stream error'));
        }
      } finally {
        reader?.cancel();
      }
    })();

  } catch (error) {
    onError?.(error instanceof Error ? error : new Error('Failed to connect to SSE'));
  }

  return () => {
    isClosed = true;
    reader?.cancel();
  };
}
