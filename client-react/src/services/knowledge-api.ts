/**
 * Knowledge Base API Service
 * Handles knowledge base file uploads and management
 */

import { authService } from './auth';
import { API_BASE_URL } from './api';

export interface KnowledgeFile {
  id: string;
  name: string;
  type: 'txt' | 'md' | 'pdf';
  size: number;
  chunkCount: number;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface UploadKnowledgeFileResponse {
  success: boolean;
  file: {
    id: string;
    name: string;
    chunkCount: number;
    stats: {
      totalChunks: number;
      avgChunkSize: number;
      estimatedTokens: number;
    };
  };
}

export interface UploadInitiateResponse {
  success: boolean;
  uploadId: string;
  fileId: string;
  fileName: string;
}

export interface UploadProgressCallback {
  (progress: {
    bytesUploaded: number;
    totalBytes: number;
    percentage: number;
  }): void;
}

class KnowledgeApiService {
  /**
   * Upload a knowledge base file with progress tracking
   * Uses XMLHttpRequest to support upload progress events
   */
  async uploadFileWithProgress(
    file: File,
    onProgress: UploadProgressCallback,
    abortController: AbortController
  ): Promise<UploadInitiateResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress({
            bytesUploaded: event.loaded,
            totalBytes: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.onabort = () => {
        reject(new Error('Upload cancelled'));
      };

      abortController.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      const token = authService.getAccessToken();
      xhr.open('POST', `${API_BASE_URL}/api/knowledge/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  /**
   * Upload a knowledge base file (legacy method without progress)
   */
  async uploadFile(file: File): Promise<UploadKnowledgeFileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authService.fetchWithAuth(
      `${API_BASE_URL}/api/knowledge/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload knowledge base file');
    }

    return response.json();
  }

  /**
   * Get all knowledge base files
   */
  async getFiles(): Promise<KnowledgeFile[]> {
    const response = await authService.fetchWithAuth(
      `${API_BASE_URL}/api/knowledge/files`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch knowledge base files');
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Delete a knowledge base file
   */
  async deleteFile(fileId: string): Promise<void> {
    const response = await authService.fetchWithAuth(
      `${API_BASE_URL}/api/knowledge/files/${fileId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Delete failed' }));
      throw new Error(error.message || 'Failed to delete knowledge base file');
    }
  }
}

export const knowledgeApi = new KnowledgeApiService();
