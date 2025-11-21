import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { getOpenAiModel } from '../config/llm';
import { getTaxDataTool, calculateDeductionsTool, generateTaxPDFTool } from './tools';
import { processDocumentsTool } from './tools/process-documents-tool';
import { resumeWorkflowTool } from './tools/resume-workflow-tool';
import { startWorkflowTool } from './tools/start-workflow-tool';
import { searchKnowledgeTool } from './tools/search-knowledge-tool';
import { createMastraMemory, createMemoryConfigFromEnv } from './mastra-memory';
import { AgentConfig } from '../models';
import { encode } from 'gpt-tokenizer';

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
        } catch (error: any) {
            console.warn('[TaxAgent] Failed to initialize Mastra Memory:', error.message);
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
    async *streamChatWithTools(
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
        const createStream = async () => {
            return await this.agent.stream(message, {
                memory: {
                    thread: threadId,
                    resource: effectiveResourceId,
                },
            });
        };

        let stream;
        let retried = false;

        try {
            stream = await createStream();
        } catch (error: any) {
            // If first attempt fails (e.g., thread not found), retry once
            // This allows Mastra to create the thread on second attempt
            const errorMessage = error.message?.toLowerCase() || '';
            if (errorMessage.includes('thread') || errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
                console.log(`[TaxAgent] First attempt failed with thread error, retrying...`);
                retried = true;
                try {
                    stream = await createStream();
                } catch (retryError: any) {
                    console.error('[TaxAgent] Retry also failed:', retryError);
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
                yield event as any;
            }
        } catch (error: any) {
            console.error('Tax Agent Tool Streaming Error:', error);
            throw error;
        }
    }

    /**
     * Delete a thread from Mastra memory
     * This deletes all messages associated with the thread
     */
    async deleteThread(threadId: string, resourceId?: string): Promise<void> {
        if (!this.memory) {
            console.warn('[TaxAgent] Memory not configured, skipping thread deletion');
            return;
        }

        const effectiveResourceId = resourceId || 'default-user';
        console.log(`[TaxAgent] Deleting Mastra thread: ${threadId}, Resource: ${effectiveResourceId}`);

        try {
            // Delete directly from MongoDB collections using Mastra's actual schema
            const mongoose = await import('mongoose');
            const db = mongoose.connection.db;

            if (db) {
                const threadsCollection = db.collection('mastra_threads');
                const messagesCollection = db.collection('mastra_messages');

                // Mastra stores threadId in 'id' field for threads
                // and 'thread_id' (snake_case) for messages
                const threadResult = await threadsCollection.deleteMany({
                    id: threadId,
                    resourceId: effectiveResourceId,
                });

                const msgResult = await messagesCollection.deleteMany({
                    thread_id: threadId,
                });

                console.log(`[TaxAgent] Deleted Mastra data - threads: ${threadResult.deletedCount}, messages: ${msgResult.deletedCount}`);
            } else {
                console.warn('[TaxAgent] MongoDB connection not available for Mastra cleanup');
            }
        } catch (error) {
            console.error('[TaxAgent] Error deleting Mastra thread:', error);
            // Don't throw - deletion failure shouldn't break the main flow
        }
    }
}

