/**
 * API Service for TaxGPT
 * Handles all communication with the backend server
 */

import type { Conversation, Message, FileMetadata, StreamEvent, WorkflowStatus, EmployeeScenario, Employee } from '../types/common.types.ts';
import { authService } from './auth';

// Get API base URL from environment variable
// Empty string is valid (for Docker with nginx proxy using relative URLs)
const API_BASE_URL = import.meta.env.VITE_AGENT_SERVER_URL;

if (API_BASE_URL === undefined) {
  throw new Error('VITE_AGENT_SERVER_URL environment variable is required but not defined');
}

// Export for use in other components
export { API_BASE_URL };

// Event to notify about auth failures
export const AUTH_ERROR_EVENT = 'auth:error';

/**
 * Dispatch auth error event for components to handle
 */
function dispatchAuthError(): void {
  window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT));
}

/**
 * Handle response and check for auth errors
 */
async function handleAuthResponse(response: Response): Promise<Response> {
  if (response.status === 401) {
    const data = await response.clone().json().catch(() => ({}));

    // If token expired, try to refresh
    if (data.code === 'TOKEN_EXPIRED') {
      const refreshed = await authService.refreshAccessToken();
      if (!refreshed) {
        dispatchAuthError();
      }
    } else if (data.code === 'REFRESH_TOKEN_EXPIRED') {
      dispatchAuthError();
    } else {
      dispatchAuthError();
    }
  }
  return response;
}

class ApiService {
  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/chat/conversations`);
    await handleAuthResponse(response);
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
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/chat/conversations/${conversationId}`);
    await handleAuthResponse(response);
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
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    await handleAuthResponse(response);
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  }

  /**
   * Save messages to a conversation (for workflow steps)
   */
  async saveMessages(threadId: string, messages: Array<{ role: string; content: string }>): Promise<void> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        threadId,
        messages,
      }),
    });
    await handleAuthResponse(response);
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
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/chat/stream-with-tools`, {
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

    await handleAuthResponse(response);

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

    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/files/upload`, {
      method: 'POST',
      body: formData,
    });

    await handleAuthResponse(response);

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
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/files/${fileId}`);
    await handleAuthResponse(response);
    if (!response.ok) {
      throw new Error('Failed to fetch file metadata');
    }
    return response.json();
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/files/${fileId}`, {
      method: 'DELETE',
    });
    await handleAuthResponse(response);
    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  }

  // === Workflow API Methods ===

  /**
   * Start a tax calculation workflow
   */
  async startTaxCalculationWorkflow(threadId: string, message?: string): Promise<WorkflowStatus> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/workflows/tax-calculation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ threadId, message }),
    });

    await handleAuthResponse(response);

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
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/workflows/${runId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stepId, data }),
    });

    await handleAuthResponse(response);

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
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/workflows/${runId}/status`);

    await handleAuthResponse(response);

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
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/workflows/${runId}`, {
      method: 'DELETE',
    });

    await handleAuthResponse(response);

    if (!response.ok) {
      throw new Error('Failed to cancel workflow');
    }
  }

  /**
   * Get active workflows for a thread
   */
  async getActiveWorkflows(threadId: string): Promise<WorkflowStatus[]> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/workflows/thread/${threadId}`);

    await handleAuthResponse(response);

    if (!response.ok) {
      throw new Error('Failed to get active workflows');
    }

    const data = await response.json();
    return data.workflows;
  }

  // === Agent Config API Methods ===

  /**
   * Get agent configuration
   */
  async getAgentConfig(): Promise<{ id: string; instructions: string; updatedAt: string }> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/agent-config`);
    await handleAuthResponse(response);
    if (!response.ok) {
      throw new Error('Failed to fetch agent configuration');
    }
    const data = await response.json();
    return data.config;
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfig(instructions: string): Promise<{ id: string; instructions: string; updatedAt: string }> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/agent-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instructions }),
    });
    await handleAuthResponse(response);
    if (!response.ok) {
      throw new Error('Failed to update agent configuration');
    }
    const data = await response.json();
    return data.config;
  }

  // === Employee/Mock Data API Methods ===

  /**
   * Get all employee scenarios (summary view)
   */
  async getEmployeeScenarios(): Promise<EmployeeScenario[]> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/employees/scenarios`);
    await handleAuthResponse(response);
    if (!response.ok) {
      throw new Error('Failed to fetch employee scenarios');
    }
    const data = await response.json();
    return data.scenarios || [];
  }

  /**
   * Get all employees with full tax data
   */
  async getEmployees(): Promise<Employee[]> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/employees`);
    await handleAuthResponse(response);
    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }
    const data = await response.json();
    return data.employees || [];
  }

  /**
   * Get a specific employee by scenario ID
   */
  async getEmployee(scenarioId: string): Promise<Employee> {
    const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/employees/${scenarioId}`);
    await handleAuthResponse(response);
    if (!response.ok) {
      throw new Error('Failed to fetch employee');
    }
    const data = await response.json();
    return data.employee;
  }
}

export const apiService = new ApiService();
