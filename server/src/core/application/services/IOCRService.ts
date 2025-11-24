/**
 * OCR Service Interface
 * Contract for document OCR processing
 */
import { OCRResultOne } from '@/types/ocr-result.types';

export interface OCROptions {
  language?: string;
  canton?: string;
  quality?: 'fast' | 'balanced' | 'accurate';
}

export interface IOCRService {
  /**
   * Process a single document (image or PDF)
   */
  processDocument(filePath: string, options?: OCROptions): Promise<OCRResultOne>;

  /**
   * Process multiple documents
   */
  processMultiple(filePaths: string[], options?: OCROptions): Promise<OCRResultOne[]>;

  /**
   * Check if file type is supported
   */
  isSupported(mimeType: string): boolean;
}
