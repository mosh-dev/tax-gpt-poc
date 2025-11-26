/**
 * General Search Tool
 * Mastra tool for searching the entire knowledge base without restrictions
 * Called by AI agent when user asks to search for any information
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { executeKnowledgeSearch, searchOutputSchema } from './search-helpers';

export const searchGeneralTool = createTool({
  id: 'search-general',
  description: `Search the entire knowledge base for any information. Use this tool when you don't have a direct, solid answer from your training data, or when you need to verify information with authoritative sources.

WHEN TO USE THIS TOOL:
- When you're uncertain about an answer and need to check the knowledge base
- For general information queries where you lack specific knowledge
- For non-tax related searches in the knowledge base
- When the user explicitly asks to search the knowledge base or "look up" information
- When you need to provide fact-based, sourced answers rather than general knowledge
- WHENEVER you think the uploaded documents might contain relevant information

IMPORTANT INSTRUCTIONS:
1. You will receive MULTIPLE search results (up to 5) from potentially DIFFERENT source files
2. Review ALL results, not just the highest ranked one - each result may contain valuable complementary information
3. Synthesize information from ALL relevant results to provide a comprehensive answer
4. ALWAYS cite the specific source file(s) you used in your response (e.g., "According to document.pdf...")
5. If results come from multiple files, mention all sources used
6. Prefer sourced information from the knowledge base over general knowledge when available`,
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
        minScore: 0.4, // Slightly lower threshold for general searches
      },
      'SearchGeneralTool'
    );
  },
});
