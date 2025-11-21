/**
 * Search Knowledge Tool
 * Mastra tool for searching the knowledge base
 * Called by AI agent when user asks to search for specific information
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getRAGService } from '../../services/rag';

export const searchKnowledgeTool = createTool({
  id: 'search-knowledge',
  description: 'Search the knowledge base for specific information about Swiss tax regulations, deductions, or procedures. Use this when the user asks to "search for", "find information about", or "look up" specific tax topics.',
  inputSchema: z.object({
    query: z.string().describe('The search query describing what information to find'),
    topK: z.number().optional().default(5).describe('Number of results to return (default: 5)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    query: z.string(),
    resultsFound: z.number(),
    message: z.string().optional(),
    source: z.string().optional(),
    results: z.array(z.object({
      rank: z.number(),
      content: z.string(),
      relevanceScore: z.number(),
      source: z.string(),
      chunkInfo: z.string()
    }))
  }),
  execute: async ({query, topK}) => {
    try {
      console.log(`[SearchKnowledgeTool] Searching for: "${query}"`);

      const ragService = getRAGService();
      const results = await ragService.searchKnowledge(query, {
        topK: topK || 5,
        minScore: 0.5, // Minimum similarity score
      });

      if (results.length === 0) {
        return {
          success: true,
          query,
          resultsFound: 0,
          message: 'No relevant information found in the knowledge base.',
          results: [],
        };
      }

      // Format results for the agent
      const formattedResults = results.map((result, index) => ({
        rank: index + 1,
        content: result.content,
        relevanceScore: Math.round(result.score * 100) / 100,
        source: result.metadata.fileName,
        chunkInfo: `Chunk ${result.metadata.chunkIndex + 1} of ${result.metadata.totalChunks}`,
      }));

      console.log(`[SearchKnowledgeTool] Found ${results.length} results`);

      return {
        success: true,
        query,
        resultsFound: results.length,
        source: formattedResults.sort((a, b) => a.rank - b.rank)[0]?.source,
        results: formattedResults,
        message: `Found ${results.length} relevant section(s) in the knowledge base.`,
      };
    } catch (error) {
      console.error('[SearchKnowledgeTool] Error searching knowledge base:', error);

      return {
        success: false,
        query,
        resultsFound: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred while searching',
        results: [],
      };
    }
  },
});
