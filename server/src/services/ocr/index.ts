/**
 * OCR Module
 * Centralized export for OCR service and types
 */

// Main service
export { OCRService, ocrService } from './ocr-service';

// Types
export type {
  SupportedLanguage,
  FileType,
  ProcessingStatus,
  OCRConfig,
  OCRResult,
  OCRMetadata,
  PreprocessingOptions,
  DocumentProcessor,
  SwissTaxDocument,
  TaxDocumentResult
} from './types';

// Configuration (only public API - internal constants removed)
export {
  DEFAULT_OCR_CONFIG,
  DEFAULT_PREPROCESSING_OPTIONS,
  getOCRConfig,
  getSwissCantonLanguage
} from './config';
