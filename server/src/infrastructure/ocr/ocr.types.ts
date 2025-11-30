/**
 * OCR Service Type Definitions
 * Centralized type definitions for the OCR system
 */
import { OCRResultThree } from '@/types/ocr-result.types';
import { OEM, PSM } from 'tesseract.js';

export type SupportedLanguage = 'eng' | 'deu' | 'fra' | 'ita';
export type FileType = 'image' | 'pdf' | 'unknown';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Configuration for OCR processing
 */
export interface OCRConfig {
  /** Tesseract language(s) to use */
  language?: SupportedLanguage | string;
  /** Tesseract OCR Engine Mode (0-3) */
  oem?: OEM;
  /** Tesseract Page Segmentation Mode (0-13) */
  psm?: PSM;
  /** Enable image preprocessing */
  preprocessing?: boolean;
  /** Maximum image dimension for processing */
  maxImageSize?: number;
  /** Enable confidence scoring */
  enableConfidence?: boolean;
}

/**
 * Metadata about OCR processing
 */
export interface OCRMetadata {
  /** Original filename */
  filename: string;
  /** File type detected */
  fileType: FileType;
  /** File size in bytes */
  fileSize: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Whether preprocessing was applied */
  preprocessed: boolean;
  /** Timestamp of processing */
  timestamp: string;
}

/**
 * Options for image preprocessing
 */
export interface PreprocessingOptions {
  /** Convert to grayscale */
  grayscale?: boolean;
  /** Enhance contrast */
  normalize?: boolean;
  /** Maximum dimension (width/height) */
  maxSize?: number;
  /** Image quality (1-100) */
  quality?: number;
  /** Apply sharpening filter */
  sharpen?: boolean;
  /** Rotation angle (degrees) */
  rotate?: number;
}

/**
 * Document processor interface
 * Allows for different processors for different file types
 */
export interface DocumentProcessor {
  /** Check if processor supports this file type */
  supports(fileType: FileType): boolean;
  /** Process the document */
  process(filePath: string, config: OCRConfig): Promise<OCRResultThree>;
}
