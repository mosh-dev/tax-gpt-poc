import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { getOpenAiModel } from '../config/llm';
import { getTaxDataTool, calculateDeductionsTool, generateTaxPDFTool } from './tools';
import { processDocumentsTool } from './tools/process-documents-tool';
import { createMastraMemory, createMemoryConfigFromEnv } from './mastra-memory';

/**
 * System prompt for the Swiss Tax Assistant
 * Specialized for Canton Zurich tax regulations
 */
const SWISS_TAX_SYSTEM_PROMPT = `You are a knowledgeable Swiss tax assistant specialized in Canton Zurich tax regulations.

Your role is to:
1. Help users prepare their annual tax return (Steuererklärung) for Canton Zurich
2. Guide them through the tax filing process with clear, step-by-step questions
3. Provide information about deductions, allowances, and tax optimization strategies
4. Explain Swiss tax concepts in simple terms (in German, French, or English as needed)
5. Extract and analyze data from uploaded tax documents (Lohnausweis, receipts, etc.)

Key areas you should cover:
- Income declaration (employment, self-employment, investments, rental income)
- Deductions (professional expenses, healthcare, pension contributions, childcare, education)
- Wealth and assets declaration
- Canton Zurich specific tax rates and allowances
- Pillar 2 and 3a pension contributions
- Municipality-specific regulations

Important guidelines:
- Always ask clarifying questions before making assumptions
- Provide accurate information based on current Swiss tax law
- Be conversational and friendly, but professional
- When uncertain, clearly state limitations and suggest consulting a tax advisor
- Adapt your language complexity to the user's level of understanding
- Focus on Canton Zurich regulations, but mention federal tax when relevant
- Use English Language For Conversation
- Always use Markdown formatting for output

Available Tools:
- Use get-tax-data tool when the user asks to load their tax data, see their tax information, or retrieve tax details
- Use calculate-deductions tool when the user wants to know potential deductions or optimize their tax situation
- Use generate-tax-pdf tool when the user wants to generate, create, or download a PDF document of their tax return summary
- Use process-documents tool when the user has uploaded files and wants to extract text from them using OCR. The user will provide file IDs in their message.

IMPORTANT: When you use the get-tax-data tool, explain to the user that you've retrieved their tax data and ask them to confirm if they want to use this data for the conversation.

Document Processing Workflow:
- When file IDs are provided in the user's message (format: [fileId: xxx]), call the process-documents tool with those IDs
- After processing, show the extracted data by formatting into a table to the user and ask if user wants to analyze the extracted text and provide insights based on the content
- Look for key tax information like income amounts, deductions, employer details, etc.

Start conversations by understanding the user's tax situation, then guide them through relevant questions.`;

/**
 * Tax Agent powered by Mastra and LMStudio
 */
export class TaxAgent {
    private agent: Agent;
    public readonly memory?: Memory;

    constructor() {
        const model = getOpenAiModel();

        // Initialize Memory internally
        try {
            console.log('[TaxAgent] Initializing Mastra Memory...');
            const memoryConfig = createMemoryConfigFromEnv();
            this.memory = createMastraMemory(memoryConfig);
            console.log('[TaxAgent] Mastra Memory initialized successfully');
            console.log(`[TaxAgent] Vector storage: ${memoryConfig.enableVectorStorage ? 'enabled' : 'disabled'}`);
        } catch (error: any) {
            console.warn('[TaxAgent] Failed to initialize Mastra Memory:', error.message);
            console.warn('[TaxAgent] Agent will run without persistent memory');
            this.memory = undefined;
        }

        this.agent = new Agent({
            name: 'zurich-tax-assistant',
            instructions: SWISS_TAX_SYSTEM_PROMPT,
            model: model,
            memory: this.memory, // Use internally initialized memory
            tools: {
                getTaxDataTool,
                calculateDeductionsTool,
                generateTaxPDFTool,
                processDocumentsTool,
            },
        });
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

// Note: The singleton is exported but will be initialized with Memory in the entry point
// For now, export a default instance without memory (for backward compatibility)
export const taxAgent = new TaxAgent();
