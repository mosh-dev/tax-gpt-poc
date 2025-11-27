/**
 * OCR Service
 * Main service for document OCR processing
 * Supports multiple document types with extensible processor architecture
 */

import path from 'path';
import { DEFAULT_OCR_CONFIG, getOCRConfig, getSwissCantonLanguage } from './ocr-config';
import { ImageProcessor } from '@infrastructure/ocr/processors/image-processor';
import { PDFProcessor } from '@infrastructure/ocr/processors/pdf-processor';
import { OCRResultThree } from '@/types/ocr-result.types';
import { DocumentProcessor, FileType, OCRConfig, SupportedLanguage } from '@infrastructure/ocr/ocr.types';

export class OCRService {
  private processors: Map<FileType, DocumentProcessor>;

  constructor() {
    // Register processors
    this.processors = new Map();
    this.registerProcessor('image', new ImageProcessor());
    this.registerProcessor('pdf', new PDFProcessor());
    // Note: This service creates processors in constructor and doesn't use DI yet
  }

  /**
   * Register a new document processor
   * Allows for easy extension with new file types
   */
  registerProcessor(fileType: FileType, processor: DocumentProcessor): void {
    this.processors.set(fileType, processor);
    console.log(`[OCRService] Registered processor for ${fileType} files`);
  }

  /**
   * Get processor for a specific file type
   */
  private getProcessor(fileType: FileType): DocumentProcessor | undefined {
    return this.processors.get(fileType);
  }

  /**
   * Detect file type from file path
   */
  async detectFileType(filePath: string): Promise<FileType> {
    const ext = path.extname(filePath).toLowerCase();

    if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.gif'].includes(ext)) {
      return 'image';
    } else if (ext === '.pdf') {
      return 'pdf';
    }

    return 'unknown';
  }

  /**
   * Process a document with OCR
   *
   * @param filePath - Path to the document file
   * @param options - Processing options
   * @returns OCR result with extracted text and metadata
   */
  async processDocument(
    filePath: string,
    options?: {
      language?: SupportedLanguage | string;
      canton?: string;
      quality?: 'fast' | 'balanced' | 'accurate';
      config?: Partial<OCRConfig>;
    }
  ): Promise<OCRResultThree> {
    const startTime = Date.now();

    try {
      // Detect file type
      const fileType = await this.detectFileType(filePath);

      if (fileType === 'unknown') {
        throw new Error('Unsupported file type. Please upload an image (JPG, PNG, etc.) or PDF.');
      }

      // Get appropriate processor
      const processor = this.getProcessor(fileType);

      if (!processor) {
        throw new Error(`No processor available for ${fileType} files`);
      }

      // Build configuration
      let config: OCRConfig;

      if (options?.config) {
        // Use custom config
        config = { ...DEFAULT_OCR_CONFIG, ...options.config };
      } else if (options?.canton) {
        // Use canton-specific language
        const cantonLanguage = getSwissCantonLanguage(options.canton);
        config = getOCRConfig(options?.quality, cantonLanguage);
      } else if (options?.language) {
        // Use specified language
        config = getOCRConfig(options?.quality, options.language);
      } else {
        // Use quality preset or default
        config = getOCRConfig(options?.quality);
      }

      console.log(`[OCRService] Processing ${fileType} file: ${path.basename(filePath)}`);
      console.log(`[OCRService] Config:`, config);

      // Process document
      const result = await processor.process(filePath, config);

      console.log(`[OCRService] Completed in ${Date.now() - startTime}ms`);
      console.log(`[OCRService] Extracted ${result.wordCount} words`);

      return result;

    } catch (error) {
      console.error('[OCRService] Processing error:', error);
      throw error;
    }
  }

  /**
   * Process multiple documents in batch
   */
  async processBatch(
    filePaths: string[],
    options?: {
      language?: SupportedLanguage | string;
      canton?: string;
      quality?: 'fast' | 'balanced' | 'accurate';
    }
  ): Promise<OCRResultThree[]> {
    const results: OCRResultThree[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.processDocument(filePath, options);
        results.push(result);
      } catch (error) {
        // Create error result
        results.push({
          text: '',
          language: options?.language || 'eng+deu',
          status: 'failed',
          wordCount: 0,
          metadata: {
            filename: path.basename(filePath),
            fileType: 'unknown',
            fileSize: 0,
            processingTime: 0,
            preprocessed: false,
            timestamp: new Date().toISOString()
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Extract text from image
   * Convenience method for image files
   */
  async extractTextFromImage(
    imagePath: string,
    language?: SupportedLanguage | string
  ): Promise<string> {
    const result = await this.processDocument(imagePath, { language });
    return result.text;
  }

  /**
   * Get list of supported file types
   */
  getSupportedFileTypes(): FileType[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Check if a file type is supported
   */
  isFileTypeSupported(fileType: FileType): boolean {
    return this.processors.has(fileType);
  }
}

// Export singleton instance
export const ocrService = new OCRService();
