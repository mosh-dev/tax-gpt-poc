/**
 * Process Documents Tool
 * Mastra tool for processing uploaded documents with OCR
 * Called by AI agent when user uploads documents
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ocrService } from '../../services/ocr';
import { getFileMetadata, markFileAsProcessed } from '../../routes/files';

/**
 * Sanitize extracted text to prevent JSON parsing errors
 * Removes or replaces problematic characters
 */
function sanitizeExtractedText(text: string): string {
  if (!text) return '';

  return text
    // Replace control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize different newline formats to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove null bytes
    .replace(/\0/g, '')
    // Trim excessive whitespace while preserving paragraph structure
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const processDocumentsTool = createTool({
  id: 'process-documents',
  description: 'Process uploaded documents with OCR to extract text. Use this when the user has uploaded files and wants to analyze them.',
  inputSchema: z.object({
    fileIds: z.array(z.string()).describe('Array of file IDs to process with OCR'),
    quality: z.enum(['fast', 'balanced', 'accurate']).optional().default('balanced').describe('OCR quality preset'),
  }),
  execute: async ({ fileIds, quality }) => {
    try {
      console.log(`[ProcessDocumentsTool] Processing ${fileIds.length} file(s) with OCR...`);

      const results = [];

      for (const fileId of fileIds) {
        // Get file metadata
        const metadata = await getFileMetadata(fileId);

        if (!metadata) {
          results.push({
            fileId,
            fileName: 'Unknown',
            success: false,
            error: `File not found: ${fileId}`
          });
          continue;
        }

        console.log(`[ProcessDocumentsTool] Processing: ${metadata.originalName}`);

        try {
          // Process document with OCR
          const ocrResult = await ocrService.processDocument(metadata.storedPath, {
            quality: quality || 'balanced'
          });

          if (ocrResult.status === 'completed') {
            // Sanitize extracted text to prevent JSON parsing errors
            const sanitizedText = sanitizeExtractedText(ocrResult.text);

            // Mark as processed and save OCR result to database
            await markFileAsProcessed(fileId, {
              text: sanitizedText,
              language: ocrResult.language,
              confidence: ocrResult.confidence,
              wordCount: ocrResult.wordCount,
            });

            results.push({
              fileId,
              fileName: metadata.originalName,
              success: true,
              extractedText: sanitizedText,
              wordCount: ocrResult.wordCount,
              language: ocrResult.language,
              processingTime: ocrResult.metadata.processingTime,
              fileType: ocrResult.metadata.fileType
            });

            console.log(`[ProcessDocumentsTool] Success: ${metadata.originalName}: ${ocrResult.wordCount} words`);
          } else {
            // Mark as processed even if failed
            await markFileAsProcessed(fileId);

            results.push({
              fileId,
              fileName: metadata.originalName,
              success: false,
              error: ocrResult.error || 'OCR processing failed'
            });

            console.error(`[ProcessDocumentsTool] Failed: ${metadata.originalName}: ${ocrResult.error}`);
          }

        } catch (error) {
          results.push({
            fileId,
            fileName: metadata.originalName,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          console.error(`[ProcessDocumentsTool] Error: ${metadata.originalName}:`, error);
        }
      }

      // Calculate statistics
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalWords = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.wordCount || 0), 0);

      const summary = {
        total: fileIds.length,
        successful,
        failed,
        totalWords,
        results
      };

      console.log(`[ProcessDocumentsTool] Summary: ${successful}/${fileIds.length} successful, ${totalWords} total words`);

      return {
        success: true,
        message: `Processed ${successful}/${fileIds.length} documents successfully. Extracted ${totalWords} words total.`,
        ...summary
      };

    } catch (error) {
      console.error('[ProcessDocumentsTool] Error:', error);
      return {
        success: false,
        message: 'Failed to process documents',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
});
