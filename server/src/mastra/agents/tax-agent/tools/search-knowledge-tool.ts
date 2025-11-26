/**
 * Search Knowledge Tool
 * Mastra tool for searching the knowledge base for tax-related information
 * Called by AI agent when user asks to search for specific tax topics
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { executeKnowledgeSearch, searchOutputSchema } from './search-helpers';

export const searchKnowledgeTool = createTool({
  id: 'search-knowledge',
  description: `Search the knowledge base for Swiss tax regulations, deductions, or procedures. Use this when the user asks to "search for", "find information about", or "look up" specific tax topics.

IMPORTANT INSTRUCTIONS:
1. You will receive MULTIPLE search results (up to 5) from potentially DIFFERENT source files
2. Review ALL results, not just the highest ranked one - each result may contain valuable complementary information
3. Synthesize information from ALL relevant results to provide a comprehensive answer
4. ALWAYS cite the specific source file(s) you used in your response (e.g., "According to tax-guide-2025.pdf...")
5. If results come from multiple files, mention all sources used`,
  inputSchema: z.object({
    query: z.string().describe('The search query describing what information to find'),
    topK: z.number().optional().default(5).describe('Number of results to return (default: 5)'),
  }),
  outputSchema: searchOutputSchema,
  execute: async ({query, topK}) => {
    return executeKnowledgeSearch(
      query,
      {
        topK: topK || 5,
        minScore: 0.5, // Stricter threshold for tax-specific searches
      },
      'SearchKnowledgeTool'
    );
  },
});
