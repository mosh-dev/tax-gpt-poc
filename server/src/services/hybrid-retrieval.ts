/**
 * Hybrid Retrieval Service
 * Automatically retrieves knowledge base content for tax-related queries
 */

import { getRAGService } from './rag';

/**
 * Retrieve relevant knowledge base context for a query
 */
export async function retrieveKnowledgeContext(query: string): Promise<{
  hasResults: boolean;
  context: string;
  sources: string[];
  resultCount: number;
} | null> {
  try {
    const ragService = getRAGService();
    const results = await ragService.searchKnowledge(query, {
      topK: 5, // Retrieve top 5 chunks for better coverage
      minScore: 0.65, // Higher threshold (65%) - only use KB if highly relevant
    });

    if (results.length === 0) {
      return null;
    }

    // Format context from results
    const contextParts = results.map((result, index) => {
      return `[Source ${index + 1}: ${result.metadata.fileName}]\n${result.content}`;
    });

    const context = contextParts.join('\n\n---\n\n');
    const sources = Array.from(new Set(results.map(r => r.metadata.fileName)));

    console.log(`[Hybrid Retrieval] Found ${results.length} relevant chunks from knowledge base`);
    console.log(`[Hybrid Retrieval] Sources: ${sources.join(', ')}`);

    return {
      hasResults: true,
      context,
      sources,
      resultCount: results.length,
    };
  } catch (error) {
    console.error('[Hybrid Retrieval] Error retrieving context:', error);
    return null;
  }
}

/**
 * Augment user message with knowledge base context
 * KB-FIRST APPROACH: Always search KB, only use LLM knowledge if KB has no results
 */
export async function augmentMessageWithContext(
  userMessage: string,
  options: {
    forceRetrieval?: boolean;
    topK?: number;
  } = {}
): Promise<{
  augmentedMessage: string;
  originalMessage: string;
  hasContext: boolean;
  sources?: string[];
}> {
  const { topK = 3 } = options;

  // ALWAYS search knowledge base first (KB-first approach)
  const retrievalResult = await retrieveKnowledgeContext(userMessage);

  if (!retrievalResult || !retrievalResult.hasResults) {
    // No KB results found - instruct LLM to use its own knowledge
    const augmentedMessage = `KNOWLEDGE BASE STATUS: No relevant information found in knowledge base.

USER QUESTION:
${userMessage}

INSTRUCTIONS: The knowledge base search returned no results. Answer this question using your own knowledge and training data. If you don't know the answer, say so clearly.`;

    return {
      augmentedMessage,
      originalMessage: userMessage,
      hasContext: false,
    };
  }

  // KB results found - instruct LLM to prioritize KB content
  const augmentedMessage = `KNOWLEDGE BASE RESULTS (PRIORITIZE THIS INFORMATION):

${retrievalResult.context}

---

USER QUESTION:
${userMessage}

CRITICAL INSTRUCTIONS:
1. Answer ONLY using the knowledge base context above
2. If the KB content fully answers the question, use ONLY that information
3. ALWAYS cite your sources from the knowledge base (e.g., "According to [filename]...")
4. If the KB context is insufficient or unclear, say "The knowledge base has limited information on this topic" and then provide what you know
5. DO NOT add information from your training data unless the KB content is insufficient`;

  return {
    augmentedMessage,
    originalMessage: userMessage,
    hasContext: true,
    sources: retrievalResult.sources,
  };
}

/**
 * Format retrieval info for SSE event
 */
export function formatRetrievalEvent(sources: string[], count: number): any {
  return {
    type: 'knowledge-retrieval',
    sources,
    count,
    message: `Retrieved ${count} relevant section(s) from: ${sources.join(', ')}`,
  };
}
