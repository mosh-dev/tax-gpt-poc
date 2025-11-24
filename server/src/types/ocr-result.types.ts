import { OCRMetadata, ProcessingStatus } from '@services/ocr/types';

export interface OCRResult {
  text: string;
  confidence?: number;
  language?: string;
  wordCount?: number;
  processingTime?: number;
  metadata?: Record<string, any>;

  [key: string]: any;
}


/**
 * Result from OCR processing
 */
export interface OCRResultWithMeta extends OCRResult {
  text: string;
  confidence?: number;
  language: string;
  status: ProcessingStatus;
  wordCount: number;
  metadata: OCRMetadata;
  error?: string;
}
