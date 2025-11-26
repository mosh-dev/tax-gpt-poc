/**
 * Search Tool Helpers
 * Shared utilities for knowledge base search tools
 */

import { z } from 'zod';
import { ragService } from '@domains/knowledge/services/rag.service';

export interface SearchOptions {
  topK?: number;
  minScore?: number;
}

/**
 * Shared output schema for search tools
 */
export const searchOutputSchema = z.object({
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
});

export interface SearchResult {
  success: boolean;
  query: string;
  resultsFound: number;
  message: string;
  sourceFiles: string[];
  results: Array<{
    rank: number;
    content: string;
    relevanceScore: number;
    source: string;
    chunkInfo: string;
  }>;
}

/**
 * Execute knowledge base search with common logic
 */
export async function executeKnowledgeSearch(
  query: string,
  options: SearchOptions = {},
  toolName: string = 'SearchTool'
): Promise<SearchResult> {
  try {
    console.log(`[${toolName}] Searching for: "${query}"`);

    const results = await ragService.searchKnowledge(query, {
      topK: options.topK || 5,
      minScore: options.minScore || 0.5,
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

    console.log(`[${toolName}] Found ${results.length} results from ${uniqueSources.length} file(s): ${uniqueSources.join(', ')}`);

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
    console.error(`[${toolName}] Error searching knowledge base:`, error);

    return {
      success: false,
      query,
      resultsFound: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred while searching',
      sourceFiles: [],
      results: [],
    };
  }
}
