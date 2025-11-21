/**
 * Hybrid Retrieval Service
 * Automatically retrieves knowledge base content for tax-related queries
 */

import { getRAGService } from './rag';

/**
 * Tax-related keywords that trigger automatic retrieval
 * Supports both English and German
 */
const TAX_KEYWORDS = [
  // English
  'tax', 'deduction', 'deduct', 'canton', 'federal', 'swiss',
  'income', 'wealth', 'allowance', 'rate', 'form', 'filing',
  'return', 'calculation', 'assessment', 'exemption',
  // German
  'steuer', 'abzug', 'kanton', 'eidgenössisch', 'einkommen',
  'vermögen', 'steuersatz', 'formular', 'berechnung', 'veranlagung',
  'befreiung', 'pauschale', 'abrechnung', 'erklärung',
  // Swiss canton specific
  'zurich', 'zürich', 'zuerich', 'zh',
];

/**
 * Check if a message contains tax-related keywords
 */
export function isTaxRelatedQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return TAX_KEYWORDS.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
}

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
      topK: 3, // Retrieve top 3 chunks for automatic context
      minScore: 0.6, // Higher threshold for automatic retrieval
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
 */
export async function augmentMessageWithContext(
  userMessage: string,
  options: {
    forceRetrieval?: boolean; // Force retrieval even if not tax-related
    topK?: number;
  } = {}
): Promise<{
  augmentedMessage: string;
  originalMessage: string;
  hasContext: boolean;
  sources?: string[];
}> {
  const { forceRetrieval = false, topK = 3 } = options;

  // Check if message is tax-related (or force retrieval)
  const shouldRetrieve = forceRetrieval || isTaxRelatedQuery(userMessage);

  if (!shouldRetrieve) {
    return {
      augmentedMessage: userMessage,
      originalMessage: userMessage,
      hasContext: false,
    };
  }

  // Retrieve context
  const retrievalResult = await retrieveKnowledgeContext(userMessage);

  if (!retrievalResult || !retrievalResult.hasResults) {
    return {
      augmentedMessage: userMessage,
      originalMessage: userMessage,
      hasContext: false,
    };
  }

  // Augment message with context
  const augmentedMessage = `KNOWLEDGE BASE CONTEXT (automatically retrieved):

${retrievalResult.context}

---

USER QUESTION:
${userMessage}

(Note: Use the knowledge base context above to answer the user's question if relevant. Cite sources when using information from the knowledge base.)`;

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
