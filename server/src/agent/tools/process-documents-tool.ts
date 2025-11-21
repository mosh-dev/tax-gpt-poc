/**
 * Process Documents Tool
 * Mastra tool for processing uploaded documents with OCR
 * Called by AI agent when user uploads documents
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import stringify from 'safe-stable-stringify';
import { ocrService } from '../../services/ocr';
import { mongoRepository } from '../../services/mongo-repository';

/**
 * Safely serialize any value to ensure it's JSON-safe
 * Uses safe-stable-stringify to handle all edge cases
 */
function safeSerialize(value: any): any {
  if (typeof value === 'string') {
    // Parse and re-stringify to clean up any problematic characters
    try {
      const serialized = stringify(value);
      // Remove the surrounding quotes added by stringify
      return serialized ? JSON.parse(serialized) : '';
    } catch {
      // Fallback: basic cleanup
      return value
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    }
  }
  return value;
}

/**
 * Create a safe result object that's guaranteed to be JSON-serializable
 */
function createSafeResult(result: any): any {
  // Use safe-stable-stringify to serialize, then parse back
  // This ensures all values are JSON-safe
  const serialized = stringify(result);
  return serialized ? JSON.parse(serialized) : result;
}

export const processDocumentsTool = createTool({
  id: 'process-documents',
  description: `Process uploaded documents with OCR to extract text from Swiss tax documents.

USE THIS WHEN:
- User has uploaded files (images, PDFs) and mentions them or asks to process them
- Message contains file IDs in format: [fileId: uuid]
- User wants to "analyze documents", "extract text", or "read uploaded files"
- User uploads Lohnausweis, receipts, tax forms, or other tax-related documents

FEATURES:
- Supports multiple formats: JPG, PNG, BMP, TIFF, WebP, PDF
- Multi-language OCR: English + German (optimized for Swiss tax documents)
- Hybrid PDF processing: Digital text extraction + OCR fallback for scanned pages
- Quality presets: 'fast' (quick processing), 'balanced' (default, good accuracy), 'accurate' (highest quality, slower)

HOW IT WORKS:
1. File IDs provided in user message format: [fileId: uuid]
2. Tool processes each file with OCR using Tesseract.js (standalone, no system dependencies)
3. Extracted text saved to database with metadata (word count, language, confidence)
4. Returns results with extracted text for agent analysis

INPUT:
- fileIds: Array of file ID strings (required) - Extract from user message format [fileId: uuid]
- quality: OCR quality preset - 'fast', 'balanced', or 'accurate' (optional, default: balanced)

OUTPUT:
- success: Overall operation status
- message: Human-readable summary (e.g., "Processed 2/2 documents successfully. Extracted 450 words total.")
- total: Total number of files processed
- successful: Number of successfully processed files
- failed: Number of failed files
- totalWords: Combined word count across all processed documents
- results: Array of individual file results, each containing:
  - fileId, fileName, success
  - extractedText: The OCR-extracted text content
  - wordCount: Number of words extracted
  - language: Detected language (eng, deu, etc.)
  - processingTime: Time taken in milliseconds
  - fileType: Original file type (image or pdf)
  - error: Error message if processing failed`,
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
        const metadata = await mongoRepository.findFileById(fileId);

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
            // Safely serialize extracted text to prevent JSON parsing errors
            const safeText = safeSerialize(ocrResult.text);

            // Mark as processed and save OCR result to database
            await mongoRepository.markFileAsProcessed(fileId, {
              text: safeText,
              language: ocrResult.language,
              confidence: ocrResult.confidence,
              wordCount: ocrResult.wordCount,
            });

            results.push({
              fileId,
              fileName: metadata.originalName,
              success: true,
              extractedText: safeText,
              wordCount: ocrResult.wordCount,
              language: ocrResult.language,
              processingTime: ocrResult.metadata.processingTime,
              fileType: ocrResult.metadata.fileType
            });

            console.log(`[ProcessDocumentsTool] Success: ${metadata.originalName}: ${ocrResult.wordCount} words`);
          } else {
            // Mark as processed even if failed
            await mongoRepository.markFileAsProcessed(fileId);

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

      // Wrap entire result in createSafeResult to ensure JSON-safe output
      return createSafeResult({
        success: true,
        message: `Processed ${successful}/${fileIds.length} documents successfully. Extracted ${totalWords} words total.`,
        ...summary
      });

    } catch (error) {
      console.error('[ProcessDocumentsTool] Error:', error);
      return createSafeResult({
        success: false,
        message: 'Failed to process documents',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
});
