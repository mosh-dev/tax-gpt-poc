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
  description: `Search the knowledge base for Swiss tax regulations, deductions, or procedures. Use this when the user asks to "search for", "find information about", or "look up" specific tax topics.

IMPORTANT INSTRUCTIONS:
1. You will receive MULTIPLE search results (up to 5) from potentially DIFFERENT source files
2. Review ALL results, not just the highest ranked one - each result may contain valuable complementary information
3. Synthesize information from ALL relevant results to provide a comprehensive answer
4. ALWAYS cite the specific source file(s) you used in your response (e.g., "According to tax-guide-2024.pdf...")
5. If results come from multiple files, mention all sources used`,
  inputSchema: z.object({
    query: z.string().describe('The search query describing what information to find'),
    topK: z.number().optional().default(5).describe('Number of results to return (default: 5)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    query: z.string(),
    resultsFound: z.number(),
    message: z.string(),
    sourceFiles: z.array(z.string()).optional().describe('List of unique source files found'),
    results: z.array(z.object({
      rank: z.number(),
      content: z.string(),
      relevanceScore: z.number(),
      source: z.string().describe('Source file name'),
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
          sourceFiles: [],
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

      // Get unique source files
      const uniqueSources = [...new Set(formattedResults.map(r => r.source))];

      console.log(`[SearchKnowledgeTool] Found ${results.length} results from ${uniqueSources.length} file(s): ${uniqueSources.join(', ')}`);

      // Create detailed message with source files
      const sourceList = uniqueSources.map(s => `"${s}"`).join(', ');
      const message = uniqueSources.length === 1
        ? `Found ${results.length} relevant section(s) from ${sourceList}.`
        : `Found ${results.length} relevant section(s) from ${uniqueSources.length} files: ${sourceList}.`;

      return {
        success: true,
        query,
        resultsFound: results.length,
        sourceFiles: uniqueSources,
        results: formattedResults,
        message: message,
      };
    } catch (error) {
      console.error('[SearchKnowledgeTool] Error searching knowledge base:', error);

      return {
        success: false,
        query,
        resultsFound: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred while searching',
        sourceFiles: [],
        results: [],
      };
    }
  },
});
