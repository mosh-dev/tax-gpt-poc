import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createMastraMemory, createMemoryConfigFromEnv } from '@/mastra/helpers/mastra-memory.helper';
import { AgentConfig } from '@domains/agent-config/models/agent-config.model';
import { encode } from 'gpt-tokenizer';
import { getCollection } from '@infrastructure/database/utils';
import { MASTRA_COLLECTIONS } from '@config/database-collections';
import { getErrorMessage } from '@utils/error-handler';
import { getTaxDataTool } from '@/mastra/agents/tax-agent/tools/get-tax-data';
import { calculateDeductionsTool } from '@/mastra/agents/tax-agent/tools/calculate-deductions';
import { generateTaxPDFTool } from '@/mastra/agents/tax-agent/tools/generate-tax-pdf';
import { processDocumentsTool } from '@/mastra/agents/tax-agent/tools/process-documents-tool';
import { startTaxCalculationTool } from '@/mastra/agents/tax-agent/tools/start-tax-calculation-tool';
import { resumeTaxCalculationTool } from '@/mastra/agents/tax-agent/tools/resume-tax-calculation-tool';
import { searchKnowledgeTool } from '@/mastra/agents/tax-agent/tools/search-knowledge-tool';
import { searchGeneralTool } from '@/mastra/agents/tax-agent/tools/search-general-tool';
import { getOpenAiModel } from '@infrastructure/ai/llm-client';
import { ChunkType } from '@mastra/core/stream';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { AgentLoggerService } from '@infrastructure/ai/agent-logger.service';

/**
 * Tax Agent powered by Mastra and LMStudio
 */
export class TaxAgent {
  public readonly agent: Agent;
  private readonly memory?: Memory;
  private readonly logger = injectFromContainer(AgentLoggerService)

  constructor(instructions: string) {
    const model = getOpenAiModel();

    // Initialize Memory internally
    try {
      const memoryConfig = createMemoryConfigFromEnv();
      this.memory = createMastraMemory(memoryConfig);
      this.logger.info('[TaxAgent] Mastra Memory initialized successfully');
      this.logger.info(`[TaxAgent] Vector storage: ${memoryConfig.enableVectorStorage ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.logger.error({ error }, `[TaxAgent] Failed to initialize Mastra Memory`);
      throw error;
    }

    // Count tokens in system instructions
    const tokenCount = encode(instructions).length;
    this.logger.info(`[TaxAgent] System instructions loaded from database:`);
    this.logger.info(`  - Character count: ${instructions.length.toLocaleString()}`);
    this.logger.info(`  - Token count: ${tokenCount.toLocaleString()} tokens`);

    this.agent = new Agent({
      id: 'zurich-tax-assistant',
      name: 'zurich-tax-assistant',
      instructions: instructions,
      model: model,
      memory: this.memory, // Use internally initialized memory
      tools: {
        getTaxDataTool,
        calculateDeductionsTool,
        generateTaxPDFTool,
        processDocumentsTool,
        startTaxCalculationTool,
        resumeTaxCalculationTool,
        searchKnowledgeTool,
        searchGeneralTool,
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
  ): AsyncGenerator<ChunkType<any>, void, unknown> {
    if (!threadId) {
      throw new Error('threadId is required for conversation management');
    }

    if (!this.memory) {
      throw new Error('Mastra Memory is not configured. Cannot manage conversations without memory.');
    }

    // resourceId is required by Mastra Memory - use default if not provided
    const effectiveResourceId = resourceId || 'default-user';
    ``

    // Helper function to create stream
    const createStream = () => {
      return this.agent.stream(message, {
        memory: {
          thread: threadId,
          resource: effectiveResourceId,
        },
        modelSettings: {
          temperature: 1 // Must For gpt 5
        }
      });
    };

    let stream;
    try {
      stream = await createStream();
    } catch (error) {
      // If first attempt fails (e.g., thread not found), retry once
      // This allows Mastra to create the thread on second attempt
      const errorMessage = getErrorMessage(error).toLowerCase();
      if (errorMessage.includes('thread') || errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        this.logger.info(`[TaxAgent] First attempt failed with thread error, retrying...`);
        try {
          stream = await createStream();
        } catch (retryError) {
          this.logger.error(retryError, '[TaxAgent] Retry also failed');
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    try {
      for await (const event of stream.fullStream) {
        this.logger.logLLMResponse(event);
        yield event as ChunkType<any>;
      }
    } catch (error) {
      this.logger.logStreamError(error);
      throw error;
    }
  }

  /**
   * Delete a thread from Mastra memory
   * This deletes all messages associated with the thread using Mastra's official API
   */
  async deleteThread(threadId: string, resourceId?: string): Promise<void> {
    if (!this.memory) {
      this.logger.warn('[TaxAgent] Memory not configured, skipping thread deletion');
      return;
    }

    const effectiveResourceId = resourceId || 'default-user';
    this.logger.info(`[TaxAgent] Deleting Mastra thread: ${threadId}, Resource: ${effectiveResourceId}`);

    try {
      // Use Mastra's official Memory API to delete thread and messages
      await this.memory.deleteThread(threadId);
      this.logger.info(`[TaxAgent] Successfully deleted Mastra thread via official API: ${threadId}`);
    } catch (error) {
      this.logger.error({ error }, '[TaxAgent] Error deleting Mastra thread');
    }

    // Also delete workflow snapshots (Mastra doesn't provide API for this yet)
    try {
      await this.deleteWorkflowSnapshots(threadId);
    } catch (error) {
      this.logger.error({ error }, '[TaxAgent] Error deleting workflow snapshots');
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

        this.logger.info(`[TaxAgent] Deleted ${result.deletedCount} workflow snapshots for thread: ${threadId}`);
      } else {
        this.logger.warn('[TaxAgent] MongoDB connection not available for workflow snapshot cleanup');
      }
    } catch (error) {
      this.logger.error({ error }, '[TaxAgent] Error deleting workflow snapshots');
      throw error;
    }
  }
}

