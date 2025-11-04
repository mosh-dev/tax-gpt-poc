import { Agent } from '@mastra/core/agent';
import { getLMStudioModel } from '../config/lmstudio';
import { getTaxDataTool, calculateDeductionsTool, generateTaxPDFTool } from '../tools';

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
- Use generate-tax-pdf tool when the user wants to generate, create, or download a PDF document of their tax return summary. This tool expects data in specific

IMPORTANT: When you use the get-tax-data tool, explain to the user that you've retrieved their tax data and ask them to confirm if they want to use this data for the conversation.

Start conversations by understanding the user's tax situation, then guide them through relevant questions.`;

/**
 * Tax Agent powered by Mastra and LMStudio
 */
export class TaxAgent {
    private agent: Agent;

    constructor() {
        const model = getLMStudioModel();

        this.agent = new Agent({
            name: 'zurich-tax-assistant',
            instructions: SWISS_TAX_SYSTEM_PROMPT,
            model: model,
            tools: {
                getTaxDataTool,
                calculateDeductionsTool,
                generateTaxPDFTool,
            },
        });
    }

    /**
     * Stream a message to the tax agent with tool calling support
     * @param message User's message
     * @param conversationHistory Optional conversation history for context
     * @returns Async generator that yields stream events (text, tool-call, tool-result, finish)
     */
    async *streamChatWithTools(message: string, conversationHistory?: any[]): AsyncGenerator<any, void, unknown> {
        try {
            // If we have conversation history, include it in the context
            const context = conversationHistory
                ? this.formatConversationHistory(conversationHistory)
                : '';

            const fullMessage = context ? `${context}\n\nUser: ${message}` : message;

            // Use stream method from Mastra agent with full stream
            const stream = await this.agent.stream(fullMessage);

            // Yield all stream events including tool calls
            // Events can include: text-delta, tool-call, tool-result, finish, etc.
            for await (const event of stream.fullStream) {
                yield event as any; // Type assertion needed due to Mastra's generic types
            }
        } catch (error: any) {
            console.error('Tax Agent Tool Streaming Error:', error);
            throw error;
        }
    }

    /**
     * Format conversation history for context
     */
    private formatConversationHistory(history: any[]): string {
        return history
            .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');
    }
}

// Export a singleton instance
export const taxAgent = new TaxAgent();
