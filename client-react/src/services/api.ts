/**
 * API Service for TaxGPT
 * Handles all communication with the backend server
 */

import type { Conversation, Message, FileMetadata, StreamEvent, WorkflowStatus } from '../types';

// Get API base URL from environment variable
// Empty string is valid (for Docker with nginx proxy using relative URLs)
const API_BASE_URL = import.meta.env.VITE_AGENT_SERVER_URL;

if (API_BASE_URL === undefined) {
  throw new Error('VITE_AGENT_SERVER_URL environment variable is required but not defined');
}

// Export for use in other components
export { API_BASE_URL };

class ApiService {
  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await fetch(`${API_BASE_URL}/api/chat/conversations`);
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    const data = await response.json();
    return data.conversations || [];
  }

  /**
   * Get a specific conversation with messages
   */
  async getConversation(conversationId: string): Promise<{
    conversationId: string;
    messages: Message[];
  }> {
    const response = await fetch(`${API_BASE_URL}/api/chat/conversations/${conversationId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch conversation');
    }
    const data = await response.json();
    return {
      conversationId: data.conversationId,
      messages: data.messages || []
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  }

  /**
   * Save messages to a conversation (for workflow steps)
   */
  async saveMessages(threadId: string, messages: Array<{ role: string; content: string }>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        threadId,
        messages,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save messages');
    }
  }

  /**
   * Stream chat with tools (SSE)
   * Returns an async generator for streaming events
   * @param message User's message
   * @param threadId Optional thread ID for existing conversations (new threadId generated on server if not provided)
   * @param fileIds Optional file IDs for uploaded documents
   */
  async* streamChat(
    message: string,
    threadId?: string,
    fileIds?: string[]
  ): AsyncGenerator<StreamEvent> {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream-with-tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        threadId,
        fileIds,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to stream chat');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining data in buffer before closing
          if (buffer.trim()) {
            const remainingLines = buffer.split('\n');
            for (const line of remainingLines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  yield data as StreamEvent;
                } catch (error) {
                  console.error('Failed to parse remaining SSE data:', error);
                }
              }
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data as StreamEvent;
            } catch (error) {
              console.error('Failed to parse SSE data:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Upload files
   */
  async uploadFiles(files: File[], threadId?: string): Promise<FileMetadata[]> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    if (threadId) {
      formData.append('conversationId', threadId); // Backend still uses conversationId for files
    }

    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload files');
    }

    const data = await response.json();
    return data.files;
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<FileMetadata> {
    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch file metadata');
    }
    return response.json();
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  }

  // === Workflow API Methods ===

  /**
   * Start a tax calculation workflow
   */
  async startTaxCalculationWorkflow(threadId: string, message?: string): Promise<WorkflowStatus> {
    const response = await fetch(`${API_BASE_URL}/api/workflows/tax-calculation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ threadId, message }),
    });

    if (!response.ok) {
      throw new Error('Failed to start workflow');
    }

    const data = await response.json();
    return data.workflow;
  }

  /**
   * Resume a suspended workflow with user data
   */
  async resumeWorkflow(runId: string, stepId: string, data: any): Promise<WorkflowStatus> {
    const response = await fetch(`${API_BASE_URL}/api/workflows/${runId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stepId, data }),
    });

    if (!response.ok) {
      throw new Error('Failed to resume workflow');
    }

    const result = await response.json();
    return result.workflow;
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(runId: string): Promise<WorkflowStatus> {
    const response = await fetch(`${API_BASE_URL}/api/workflows/${runId}/status`);

    if (!response.ok) {
      throw new Error('Failed to get workflow status');
    }

    const data = await response.json();
    return data.workflow;
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(runId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workflows/${runId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to cancel workflow');
    }
  }

  /**
   * Get active workflows for a thread
   */
  async getActiveWorkflows(threadId: string): Promise<WorkflowStatus[]> {
    const response = await fetch(`${API_BASE_URL}/api/workflows/thread/${threadId}`);

    if (!response.ok) {
      throw new Error('Failed to get active workflows');
    }

    const data = await response.json();
    return data.workflows;
  }
}

export const apiService = new ApiService();
