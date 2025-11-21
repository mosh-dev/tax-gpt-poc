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

class KnowledgeApiService {
  /**
   * Upload a knowledge base file
   */
  async uploadFile(file: File): Promise<UploadKnowledgeFileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authService.fetchWithAuth(
      `${API_BASE_URL}/api/knowledge/upload`,
      {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
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
