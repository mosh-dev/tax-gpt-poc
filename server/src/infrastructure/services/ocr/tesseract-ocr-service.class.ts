/**
 * Tesseract OCR Service Adapter
 * Implements IOCRService using the existing OCRService
 */
import { ocrService } from "@domains/ocr/ocr-service.class";
import { IOCRService, OCROptions } from '@infrastructure/interfaces/ocr-service.interface';
import { OCRResultOne } from '@/types/ocr-result.types';


export class TesseractOCRService implements IOCRService {
  private ocrService = ocrService;

  constructor() {
    // Using singleton OCRService instance
  }

  async processDocument(filePath: string, options?: OCROptions): Promise<OCRResultOne> {
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

  async processMultiple(filePaths: string[], options?: OCROptions): Promise<OCRResultOne[]> {
    return await Promise.all(
      filePaths.map(path => this.processDocument(path, options))
    );
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
