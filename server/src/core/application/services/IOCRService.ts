/**
 * OCR Service Interface
 * Contract for document OCR processing
 */

export interface OCROptions {
  language?: string;
  canton?: string;
  quality?: 'fast' | 'balanced' | 'accurate';
}

export interface OCRResult {
  text: string;
  confidence?: number;
  language?: string;
  wordCount?: number;
  processingTime?: number;
  metadata?: Record<string, any>;
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
