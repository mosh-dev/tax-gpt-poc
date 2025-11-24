/**
 * OCR Service Interface
 * Contract for document OCR processing
 */
import { OCRResult } from '@/types/ocr-result.types';

export interface OCROptions {
  language?: string;
  canton?: string;
  quality?: 'fast' | 'balanced' | 'accurate';
}

export interface IOCRService {
  /**
   * Process a single document (image or PDF)
   */
  processDocument(filePath: string, options?: OCROptions): Promise<OCRResult>;

  /**
   * Process multiple documents
   */
  processMultiple(filePaths: string[], options?: OCROptions): Promise<OCRResult[]>;

  /**
   * Check if file type is supported
   */
  isSupported(mimeType: string): boolean;
}
