import { useReducer, useRef, useEffect, useCallback } from 'react';
import { knowledgeApi } from '../services/knowledge-api';
import { subscribeToProcessingProgress, type ProcessingEvent } from '../services/upload-progress';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadProgress {
  id: string;
  file: File;
  fileId?: string;
  uploadId?: string;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  uploadProgress: number;
  processingStage?: 'extracting' | 'chunking' | 'embedding';
  processingProgress?: number;
  bytesUploaded: number;
  totalBytes: number;
  uploadSpeed: number;
  eta: number;
  error?: string;
  chunkCount?: number;
  abortController?: AbortController;
}

type Action =
  | { type: 'ADD_FILES'; files: File[] }
  | { type: 'UPDATE_UPLOAD_PROGRESS'; id: string; bytesUploaded: number; totalBytes: number; percentage: number }
  | { type: 'UPLOAD_COMPLETE'; id: string; uploadId: string; fileId: string }
  | { type: 'UPDATE_PROCESSING'; id: string; stage: 'extracting' | 'chunking' | 'embedding'; progress: number }
  | { type: 'FILE_COMPLETE'; id: string; chunkCount: number }
  | { type: 'FILE_ERROR'; id: string; error: string }
  | { type: 'CANCEL_FILE'; id: string }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'UPDATE_SPEED_ETA'; id: string; speed: number; eta: number };

function reducer(state: FileUploadProgress[], action: Action): FileUploadProgress[] {
  switch (action.type) {
    case 'ADD_FILES':
      return [
        ...state,
        ...action.files.map((file) => ({
          id: uuidv4(),
          file,
          status: 'queued' as const,
          uploadProgress: 0,
          bytesUploaded: 0,
          totalBytes: file.size,
          uploadSpeed: 0,
          eta: 0,
          abortController: new AbortController(),
        })),
      ];

    case 'UPDATE_UPLOAD_PROGRESS':
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: 'uploading' as const,
              uploadProgress: action.percentage,
              bytesUploaded: action.bytesUploaded,
              totalBytes: action.totalBytes,
            }
          : item
      );

    case 'UPLOAD_COMPLETE':
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              uploadId: action.uploadId,
              fileId: action.fileId,
              status: 'processing' as const,
              uploadProgress: 100,
            }
          : item
      );

    case 'UPDATE_PROCESSING':
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              processingStage: action.stage,
              processingProgress: action.progress,
            }
          : item
      );

    case 'FILE_COMPLETE':
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: 'completed' as const,
              processingProgress: 100,
              chunkCount: action.chunkCount,
            }
          : item
      );

    case 'FILE_ERROR':
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: 'error' as const,
              error: action.error,
            }
          : item
      );

    case 'CANCEL_FILE':
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: 'cancelled' as const,
              abortController: undefined,
            }
          : item
      );

    case 'UPDATE_SPEED_ETA':
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              uploadSpeed: action.speed,
              eta: action.eta,
            }
          : item
      );

    case 'CLEAR_COMPLETED':
      return state.filter((item) => item.status !== 'completed' && item.status !== 'cancelled');

    default:
      return state;
  }
}

export interface UseFileUploadQueueReturn {
  files: FileUploadProgress[];
  isUploading: boolean;
  addFiles: (files: File[]) => void;
  cancelFile: (id: string) => void;
  cancelAll: () => void;
  clearCompleted: () => void;
}

export function useFileUploadQueue(onAllComplete?: () => void): UseFileUploadQueueReturn {
  const [files, dispatch] = useReducer(reducer, []);
  const isProcessingRef = useRef(false);
  const filesRef = useRef<FileUploadProgress[]>([]);
  const speedTrackerRef = useRef<Map<string, Array<{ timestamp: number; bytes: number }>>>(new Map());
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());
  const processNextFileRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const calculateSpeedAndEta = useCallback((id: string, bytesUploaded: number, totalBytes: number) => {
    const tracker = speedTrackerRef.current.get(id) || [];
    const now = Date.now();

    tracker.push({ timestamp: now, bytes: bytesUploaded });

    if (tracker.length > 5) {
      tracker.shift();
    }

    speedTrackerRef.current.set(id, tracker);

    if (tracker.length < 2) {
      return { speed: 0, eta: 0 };
    }

    const oldest = tracker[0];
    const latest = tracker[tracker.length - 1];
    const timeDiff = (latest.timestamp - oldest.timestamp) / 1000;
    const bytesDiff = latest.bytes - oldest.bytes;

    if (timeDiff === 0) {
      return { speed: 0, eta: 0 };
    }

    const speed = bytesDiff / timeDiff;
    const remainingBytes = totalBytes - bytesUploaded;
    const eta = speed > 0 ? remainingBytes / speed : 0;

    return { speed, eta };
  }, []);

  const processNextFile = useCallback(async () => {
    if (isProcessingRef.current) return;

    const currentFiles = filesRef.current;
    const nextFile = currentFiles.find((f) => f.status === 'queued');
    if (!nextFile) {
      if (currentFiles.length > 0 && currentFiles.every((f) => f.status === 'completed' || f.status === 'error' || f.status === 'cancelled')) {
        onAllComplete?.();
      }
      return;
    }

    isProcessingRef.current = true;
    const fileId = nextFile.id;

    try {
      const response = await knowledgeApi.uploadFileWithProgress(
        nextFile.file,
        (progress) => {
          dispatch({
            type: 'UPDATE_UPLOAD_PROGRESS',
            id: fileId,
            bytesUploaded: progress.bytesUploaded,
            totalBytes: progress.totalBytes,
            percentage: progress.percentage,
          });

          const { speed, eta } = calculateSpeedAndEta(fileId, progress.bytesUploaded, progress.totalBytes);
          dispatch({ type: 'UPDATE_SPEED_ETA', id: fileId, speed, eta });
        },
        nextFile.abortController!
      );

      dispatch({
        type: 'UPLOAD_COMPLETE',
        id: fileId,
        uploadId: response.uploadId,
        fileId: response.fileId,
      });

      const unsubscribe = await subscribeToProcessingProgress(
        response.uploadId,
        (event: ProcessingEvent) => {
          if (event.type === 'progress') {
            dispatch({
              type: 'UPDATE_PROCESSING',
              id: fileId,
              stage: event.stage,
              progress: event.progress,
            });
          } else if (event.type === 'complete') {
            dispatch({
              type: 'FILE_COMPLETE',
              id: fileId,
              chunkCount: event.chunkCount,
            });
            unsubscribersRef.current.delete(fileId);
            speedTrackerRef.current.delete(fileId);
            isProcessingRef.current = false;
            requestAnimationFrame(() => processNextFileRef.current?.());
          } else if (event.type === 'error') {
            dispatch({
              type: 'FILE_ERROR',
              id: fileId,
              error: event.message,
            });
            unsubscribersRef.current.delete(fileId);
            speedTrackerRef.current.delete(fileId);
            isProcessingRef.current = false;
            requestAnimationFrame(() => processNextFileRef.current?.());
          }
        },
        (error) => {
          dispatch({
            type: 'FILE_ERROR',
            id: fileId,
            error: error.message,
          });
          unsubscribersRef.current.delete(fileId);
          speedTrackerRef.current.delete(fileId);
          isProcessingRef.current = false;
          requestAnimationFrame(() => processNextFileRef.current?.());
        }
      );

      unsubscribersRef.current.set(fileId, unsubscribe);

    } catch (error) {
      dispatch({
        type: 'FILE_ERROR',
        id: fileId,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
      speedTrackerRef.current.delete(fileId);
      isProcessingRef.current = false;
      requestAnimationFrame(() => processNextFileRef.current?.());
    }
  }, [calculateSpeedAndEta, onAllComplete]);

  useEffect(() => {
    filesRef.current = files;
    processNextFileRef.current = processNextFile;
  });

  useEffect(() => {
    const hasQueuedFiles = files.some((f) => f.status === 'queued');
    if (hasQueuedFiles && !isProcessingRef.current) {
      processNextFile();
    }
  }, [files, processNextFile]);

  useEffect(() => {
    const unsubscribers = unsubscribersRef.current;
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers.clear();
    };
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    dispatch({ type: 'ADD_FILES', files: newFiles });
  }, []);

  const cancelFile = useCallback((id: string) => {
    const file = filesRef.current.find((f) => f.id === id);
    if (file?.abortController) {
      file.abortController.abort();
    }
    const unsubscribe = unsubscribersRef.current.get(id);
    if (unsubscribe) {
      unsubscribe();
      unsubscribersRef.current.delete(id);
    }
    speedTrackerRef.current.delete(id);
    dispatch({ type: 'CANCEL_FILE', id });

    if (file?.status === 'uploading' || file?.status === 'processing') {
      isProcessingRef.current = false;
      requestAnimationFrame(() => processNextFileRef.current?.());
    }
  }, []);

  const cancelAll = useCallback(() => {
    filesRef.current.forEach((file) => {
      if (file.status === 'queued' || file.status === 'uploading' || file.status === 'processing') {
        cancelFile(file.id);
      }
    });
  }, [cancelFile]);

  const clearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' });
  }, []);

  const isUploading = files.some((f) => f.status === 'uploading' || f.status === 'processing');

  return {
    files,
    isUploading,
    addFiles,
    cancelFile,
    cancelAll,
    clearCompleted,
  };
}
