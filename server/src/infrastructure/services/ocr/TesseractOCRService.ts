/**
 * Tesseract OCR Service Adapter
 * Implements IOCRService using the existing OCRService
 */

import { IOCRService, OCROptions, OCRResult } from '../../../core/application';
import { OCRService } from '../../../services/ocr';

export class TesseractOCRService implements IOCRService {
  private ocrService: OCRService;

  constructor() {
    this.ocrService = new OCRService();
  }

  async processDocument(filePath: string, options?: OCROptions): Promise<OCRResult> {
    const result = await this.ocrService.processDocument(filePath, {
      language: options?.language,
      canton: options?.canton,
      quality: options?.quality,
    });

    return {
      text: result.text, // Use 'text' not 'extractedText'
      confidence: result.confidence,
      language: result.language,
      wordCount: result.wordCount,
      processingTime: result.metadata.processingTime,
      metadata: result.metadata,
    };
  }

  async processMultiple(filePaths: string[], options?: OCROptions): Promise<OCRResult[]> {
    const results = await Promise.all(
      filePaths.map(path => this.processDocument(path, options))
    );
    return results;
  }

  isSupported(mimeType: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'application/pdf',
    ];
    return supportedTypes.includes(mimeType);
  }
}
