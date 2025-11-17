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

// Configuration
export {
  DEFAULT_OCR_CONFIG,
  DEFAULT_PREPROCESSING_OPTIONS,
  SWISS_LANGUAGE_CONFIGS,
  PSM_MODES,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_DOCUMENT_EXTENSIONS,
  ALL_SUPPORTED_EXTENSIONS,
  FILE_SIZE_LIMITS,
  OCR_QUALITY_PRESETS,
  getOCRConfig,
  getSwissCantonLanguage
} from './config';

// Processors
export { BaseDocumentProcessor, ImageProcessor, PDFProcessor } from './processors';
