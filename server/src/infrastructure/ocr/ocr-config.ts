/**
 * OCR Service Configuration
 * Centralized configuration for OCR processing
 */

import { OCRConfig, PreprocessingOptions, SupportedLanguage } from '@infrastructure/ocr/ocr.types';
import { OEM, PSM } from 'tesseract.js';

/**
 * Default OCR configuration
 */
export const DEFAULT_OCR_CONFIG: Required<OCRConfig> = {
  language: 'eng+deu', // English + German for Swiss documents
  oem: OEM.DEFAULT, // LSTM OCR Engine Mode (best accuracy)
  psm: PSM.AUTO, // Automatic page segmentation with OSD (Orientation and Script Detection)
  preprocessing: true,
  maxImageSize: 3000,
  enableConfidence: true
};

/**
 * Default preprocessing options
 */
export const DEFAULT_PREPROCESSING_OPTIONS: Required<PreprocessingOptions> = {
  grayscale: true,
  normalize: true,
  maxSize: 3000,
  quality: 90,
  sharpen: false,
  rotate: 0
};

/**
 * Language configurations for different Swiss regions
 */
export const SWISS_LANGUAGE_CONFIGS: Record<string, string> = {
  'zurich': 'deu+eng', // German + English
  'geneva': 'fra+eng', // French + English
  'ticino': 'ita+eng', // Italian + English
  'bern': 'deu+fra+eng', // German + French + English (bilingual canton)
  'default': 'deu+eng+fra' // Multi-language support
};

/**
 * Supported file extensions
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.gif'] as const;
export const SUPPORTED_DOCUMENT_EXTENSIONS = ['.pdf'] as const;
export const ALL_SUPPORTED_EXTENSIONS = [...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_DOCUMENT_EXTENSIONS] as const;

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_PDF_SIZE: 20 * 1024 * 1024, // 20MB
  MAX_TOTAL_SIZE: 50 * 1024 * 1024 // 50MB for batch uploads
} as const;

/**
 * OCR quality presets
 */
export const OCR_QUALITY_PRESETS = {
  fast: {
    oem: OEM.TESSERACT_ONLY, // Legacy engine (faster)
    psm: PSM.SINGLE_BLOCK, // Single block
    preprocessing: false,
    maxImageSize: 2000
  },
  balanced: {
    oem: OEM.DEFAULT, // LSTM engine
    psm: PSM.AUTO, // Auto segmentation
    preprocessing: true,
    maxImageSize: 3000
  },
  accurate: {
    oem: OEM.DEFAULT, // LSTM engine
    psm: PSM.AUTO_OSD, // Auto with OSD
    preprocessing: true,
    maxImageSize: 4000
  }
} as const;

/**
 * Get OCR config for specific use case
 */
export function getOCRConfig(preset?: keyof typeof OCR_QUALITY_PRESETS, language?: SupportedLanguage | string): OCRConfig {
  const baseConfig = preset ? OCR_QUALITY_PRESETS[preset] : DEFAULT_OCR_CONFIG;

  return {
    ...baseConfig,
    ...(language && { language })
  };
}

/**
 * Get language config for Swiss canton
 */
export function getSwissCantonLanguage(canton?: string): string {
  if (!canton) return SWISS_LANGUAGE_CONFIGS.default;

  const cantonKey = canton.toLowerCase();
  return SWISS_LANGUAGE_CONFIGS[cantonKey] || SWISS_LANGUAGE_CONFIGS.default;
}
