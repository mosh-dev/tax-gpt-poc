import { OCRMetadata, ProcessingStatus } from '@services/ocr/types';

export interface OCRResultOne {
  text: string;
  confidence?: number;
  language?: string;
  wordCount?: number;
  processingTime?: number;
  metadata?: Record<string, any>;
}

export interface OCRResultTwo {
  text: string;
  confidence?: number;
  language?: string;
  wordCount?: number;
  processingTime?: number;
  [key: string]: any;
}

export interface OCRResultThree {
  /** Extracted text content */
  text: string;
  /** Language used for OCR */
  language: string;
  /** Processing status */
  status: ProcessingStatus;
  /** Confidence score (0-100) if available */
  confidence?: number;
  /** Word count in extracted text */
  wordCount: number;
  /** Processing metadata */
  metadata: OCRMetadata;
  /** Any errors that occurred */
  error?: string;
}

