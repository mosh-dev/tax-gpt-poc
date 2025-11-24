import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { getOpenAiModel } from '@config/llm';
import { createMastraMemory, createMemoryConfigFromEnv } from './mastra-memory';
import { AgentConfig } from '@models/agent-config.model';
import { encode } from 'gpt-tokenizer';
import { getCollection } from '@config/database-utils';
import { MASTRA_COLLECTIONS } from '@config/database-collections';
import { agentLogger, logLLMResponse, logStreamError, logToolCall, logToolResult } from '@config/logger';
import { getErrorMessage } from '@utils/error-handler';
import { getTaxDataTool } from '@agent/tools/get-tax-data';
import { calculateDeductionsTool } from '@agent/tools/calculate-deductions';
import { generateTaxPDFTool } from '@agent/tools/generate-tax-pdf';
import { processDocumentsTool } from '@agent/tools/process-documents-tool';
import { startWorkflowTool } from '@agent/tools/start-workflow-tool';
import { resumeWorkflowTool } from '@agent/tools/resume-workflow-tool';
import { searchKnowledgeTool } from '@agent/tools/search-knowledge-tool';

/**
 * Tax Agent powered by Mastra and LMStudio
 */
export class TaxAgent {
  private agent: Agent;
  public readonly memory?: Memory;

  constructor(instructions: string) {
    const model = getOpenAiModel();

    // Initialize Memory internally
    try {
      const memoryConfig = createMemoryConfigFromEnv();
      this.memory = createMastraMemory(memoryConfig);
      console.log('[TaxAgent] Mastra Memory initialized successfully');
      console.log(`[TaxAgent] Vector storage: ${memoryConfig.enableVectorStorage ? 'enabled' : 'disabled'}`);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.warn('[TaxAgent] Failed to initialize Mastra Memory:', errorMsg);
      console.warn('[TaxAgent] Agent will run without persistent memory');
      this.memory = undefined;
    }

    // Count tokens in system instructions
    const tokenCount = encode(instructions).length;
    console.log(`[TaxAgent] System instructions loaded from database:`);
    console.log(`  - Character count: ${instructions.length.toLocaleString()}`);
    console.log(`  - Token count: ${tokenCount.toLocaleString()} tokens`);
    console.log(`  - Estimated cost per request (input): $${(tokenCount * 0.003 / 1000).toFixed(6)}`);
    console.log(`  - (Assuming $0.003/1K input tokens - adjust for your model)`);

    this.agent = new Agent({
      name: 'zurich-tax-assistant',
      instructions: instructions,
      model: model,
      memory: this.memory, // Use internally initialized memory
      tools: {
        getTaxDataTool,
        calculateDeductionsTool,
        generateTaxPDFTool,
        processDocumentsTool,
        startWorkflowTool,
        resumeWorkflowTool,
        searchKnowledgeTool,
      },
    });
  }

  /**
   * Get instructions from the database
   * Throws error if no config found in DB
   * @returns Promise<string> - The system instructions
   */
  static async getInstructionsFromDb(): Promise<string> {
    const config = await AgentConfig.findOne().lean();
    if (!config?.instructions) {
      throw new Error('Agent config not found in database. Please ensure seeds have been run.');
    }
    return config.instructions;
  }

  /**
   * Stream a message to the tax agent with tool calling support
   * @param message User's message
   * @param threadId Thread ID for conversation history (REQUIRED)
   * @param resourceId Optional resource ID (e.g., user ID) for memory scoping
   * @returns Async generator that yields stream events (text, tool-call, tool-result, finish)
   */
  async* streamChatWithTools(
    message: string,
    threadId: string,
    resourceId?: string
  ): AsyncGenerator<any, void, unknown> {
    if (!threadId) {
      throw new Error('threadId is required for conversation management');
    }

    if (!this.memory) {
      throw new Error('Mastra Memory is not configured. Cannot manage conversations without memory.');
    }

    // resourceId is required by Mastra Memory - use default if not provided
    const effectiveResourceId = resourceId || 'default-user';
    console.log(`[TaxAgent] Using Mastra Memory - Thread: ${threadId}, Resource: ${effectiveResourceId}`);

    // Helper function to create stream
    const createStream = () => {
      return this.agent.stream(message, {
        memory: {
          thread: threadId,
          resource: effectiveResourceId,
        }
      });
    };

    let stream;
    let retried = false;

    try {
      stream = await createStream();
    } catch (error: unknown) {
      // If first attempt fails (e.g., thread not found), retry once
      // This allows Mastra to create the thread on second attempt
      const errorMessage = getErrorMessage(error).toLowerCase();
      if (errorMessage.includes('thread') || errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        console.log(`[TaxAgent] First attempt failed with thread error, retrying...`);
        retried = true;
        try {
          stream = await createStream();
        } catch (retryError: unknown) {
          const retryErrorMsg = getErrorMessage(retryError);
          console.error('[TaxAgent] Retry also failed:', retryErrorMsg);
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    if (retried) {
      console.log(`[TaxAgent] Retry successful`);
    }

    try {
      for await (const event of stream.fullStream) {
        // Log all LLM events to file for debugging JSON parsing issues
        logLLMResponse(event);

        // Cast once for cleaner access
        const eventAny = event as any;

        // Log important events to console and file
        if (event.type === 'tool-call') {
          const toolName = eventAny.payload?.toolName || eventAny.toolName;
          const toolCallId = eventAny.payload?.toolCallId || eventAny.toolCallId;
          const args = eventAny.payload?.args || eventAny.args;

          // Log the raw event if toolName is missing (debugging)
          if (!toolName) {
            agentLogger.warn({rawEvent: event}, 'Tool call event missing toolName');
          }
          logToolCall(toolName, toolCallId, args);
        } else if (event.type === 'tool-result') {
          const toolName = eventAny.payload?.toolName || eventAny.toolName;
          const toolCallId = eventAny.payload?.toolCallId || eventAny.toolCallId;
          const result = eventAny.payload?.result || eventAny.result;

          if (!toolName) {
            agentLogger.warn({rawEvent: event}, 'Tool result event missing toolName');
          }
          logToolResult(toolName, toolCallId, result);
        } else if (event.type === 'error') {
          agentLogger.error({event}, 'Stream Error Event');
        }

        yield event as any;
      }
    } catch (error: unknown) {
      logStreamError(error);
      throw error;
    }
  }

  /**
   * Delete a thread from Mastra memory
   * This deletes all messages associated with the thread using Mastra's official API
   */
  async deleteThread(threadId: string, resourceId?: string): Promise<void> {
    if (!this.memory) {
      console.warn('[TaxAgent] Memory not configured, skipping thread deletion');
      return;
    }

    const effectiveResourceId = resourceId || 'default-user';
    console.log(`[TaxAgent] Deleting Mastra thread: ${threadId}, Resource: ${effectiveResourceId}`);

    try {
      // Use Mastra's official Memory API to delete thread and messages
      await this.memory.deleteThread(threadId);
      console.log(`[TaxAgent] Successfully deleted Mastra thread via official API: ${threadId}`);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[TaxAgent] Error deleting Mastra thread:', errorMsg);
      // Log error but don't throw - deletion failure shouldn't break the main flow
    }

    // Also delete workflow snapshots (Mastra doesn't provide API for this yet)
    try {
      await this.deleteWorkflowSnapshots(threadId);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[TaxAgent] Error deleting workflow snapshots:', errorMsg);
    }
  }

  /**
   * Delete workflow snapshots for a thread
   * Note: Mastra v1.0.0-beta doesn't provide workflow deletion APIs yet,
   * so we use direct MongoDB access as a fallback
   *
   * Workflow snapshot schema:
   * {
   *   run_id: "...",
   *   workflow_name: "tax-calculation-workflow",
   *   snapshot: {
   *     context: {
   *       input: {
   *         threadId: "..."  <- This is where threadId is stored
   *       }
   *     }
   *   }
   * }
   */
  private async deleteWorkflowSnapshots(threadId: string): Promise<void> {
    try {
      const snapshotCollection = getCollection(MASTRA_COLLECTIONS.WORKFLOW_SNAPSHOT);

      if (snapshotCollection) {
        // Delete all workflow snapshots where threadId matches
        // Correct path: snapshot.context.input.threadId
        const result = await snapshotCollection.deleteMany({
          'snapshot.context.input.threadId': threadId,
        });

        console.log(`[TaxAgent] Deleted ${result.deletedCount} workflow snapshots for thread: ${threadId}`);
      } else {
        console.warn('[TaxAgent] MongoDB connection not available for workflow snapshot cleanup');
      }
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error('[TaxAgent] Error deleting workflow snapshots:', errorMsg);
      throw error;
    }
  }
}

