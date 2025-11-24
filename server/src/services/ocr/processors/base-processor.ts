/**
 * Base Document Processor
 * Abstract base class for document processors
 */

import { DocumentProcessor, FileType, OCRConfig, ProcessingStatus } from '../types';
import path from 'path';
import fs from 'fs/promises';
import { OCRResultThree } from '@/types/ocr-result.types';

export abstract class BaseDocumentProcessor implements DocumentProcessor {
  /**
   * Supported file types for this processor
   */
  protected abstract supportedTypes: FileType[];

  /**
   * Check if this processor supports the given file type
   */
  supports(fileType: FileType): boolean {
    return this.supportedTypes.includes(fileType);
  }

  /**
   * Abstract method to process document
   */
  abstract process(filePath: string, config: OCRConfig): Promise<OCRResultThree>;

  /**
   * Detect file type from extension
   */
  protected async detectFileType(filePath: string): Promise<FileType> {
    const ext = path.extname(filePath).toLowerCase();

    if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.gif'].includes(ext)) {
      return 'image';
    } else if (ext === '.pdf') {
      return 'pdf';
    }

    return 'unknown';
  }

  /**
   * Get file size
   */
  protected async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Create base OCR result structure
   */
  protected createBaseResult(filename: string, fileType: FileType, fileSize: number): OCRResultThree {
    return {
      text: '',
      status: 'pending' as ProcessingStatus,
      wordCount: 0,
      metadata: {
        filename,
        fileType,
        fileSize,
        processingTime: 0,
        preprocessed: false,
        timestamp: new Date().toISOString()
      }
    } as OCRResultThree;
  }

  /**
   * Calculate word count from text
   */
  protected calculateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Update processing time in result
   */
  protected updateProcessingTime(result: OCRResultThree, startTime: number): OCRResultThree {
    result.metadata.processingTime = Date.now() - startTime;
    return result;
  }
}
