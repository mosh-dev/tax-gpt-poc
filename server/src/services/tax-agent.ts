import { Agent } from '@mastra/core/agent';
import { getLMStudioModel, lmStudioConfig } from '../config/lmstudio';

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
        });

        console.log(`✅ Tax Agent initialized with model: ${lmStudioConfig.model}`);
        console.log(`🔗 Connected to LMStudio at: ${lmStudioConfig.url}`);
    }

    /**
     * Send a message to the tax agent
     * @param message User's message
     * @param conversationHistory Optional conversation history for context
     * @returns Agent's response
     */
    async chat(message: string, conversationHistory?: any[]) {
        try {
            // If we have conversation history, include it in the context
            const context = conversationHistory
                ? this.formatConversationHistory(conversationHistory)
                : '';

            const fullMessage = context ? `${context}\n\nUser: ${message}` : message;

            const response = await this.agent.generate(fullMessage);

            return {
                success: true,
                message: response.text || response,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('Tax Agent Error:', error);
            return {
                success: false,
                error: error.message || 'Failed to get response from tax agent',
                timestamp: new Date().toISOString(),
            };
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

    /**
     * Generate tax form based on conversation and data
     */
    async generateTaxForm(userData: any) {
        const prompt = `Based on the following user tax data, generate a summary and recommendations for their Canton Zurich tax return: ${JSON.stringify(userData, null, 2)}
        Provide:
        1. A summary of their tax situation
        2. Estimated tax liability
        3. Potential deductions they might be missing
        4. Next steps for filing their tax return`;

        return await this.chat(prompt);
    }
}

// Export a singleton instance
export const taxAgent = new TaxAgent();
