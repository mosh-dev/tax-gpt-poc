/**
 * PDF Document Processor (Standalone)
 * Uses pdf-to-png-converter + tesseract.js
 * Dual strategy:
 * 1. Digital PDF - Extract text directly (fast)
 * 2. Scanned PDF - Convert to PNG and OCR (slower but comprehensive)
 */

import { BaseDocumentProcessor } from './base-processor';
import { ImageProcessor } from './image-processor';
import { DEFAULT_OCR_CONFIG } from '../ocr-config';
import path from 'path';
import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import { OCRResultThree } from '@/types/ocr-result.types';
import { FileType, OCRConfig } from '@infrastructure/ocr/ocr.types';
import { pdfToPng } from 'pdf-to-png-converter';
import { STORAGE_PATHS } from '@config/storage';

export class PDFProcessor extends BaseDocumentProcessor {
  protected supportedTypes: FileType[] = ['pdf'];
  private imageProcessor: ImageProcessor;

  constructor() {
    super();
    this.imageProcessor = new ImageProcessor();
  }

  /**
   * Create temp directory for page images
   * Uses centralized temp storage
   */
  private async createTempDirectory(filename: string): Promise<string> {
    // Sanitize filename for Windows
    const safeName = filename.replace(/[<>:"/\\|?*]+/g, "_");
    const tempDir = path.join(STORAGE_PATHS.temp, `pdf-ocr-${Date.now()}-${safeName}`);
    await fs.mkdir(tempDir, { recursive: true });

    return tempDir;
  }

  /**
   * Convert PDF to images using pdf-to-png-converter
   * More reliable than PDF.js canvas rendering for complex PDFs with inline images
   */
  private async convertPDFToImages(filePath: string, tempDir: string, maxPages: number = 10): Promise<string[]> {
    console.log(`[PDFProcessor] Converting PDF to images...`);
    const pngPages = await pdfToPng(filePath, {
      outputFolder: path.relative(process.cwd(), tempDir), // Must Use relative path for pdf-to-png-converter
      viewportScale: 2.0,
      pagesToProcess: Array.from({ length: maxPages }, (_, i) => i + 1)
    });

    return pngPages.map(page => page.path);
  }

  /**
   * Clean up temporary files and directory
   */
  private async cleanupTempFiles(tempDir: string): Promise<void> {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }

  /**
   * Process PDF document with hybrid approach:
   * - Try digital text extraction first
   * - Fall back to OCR if insufficient text extracted
   */
  async process(filePath: string, config: OCRConfig = DEFAULT_OCR_CONFIG): Promise<OCRResultThree> {
    const startTime = Date.now();
    const filename = path.basename(filePath);
    const fileSize = await this.getFileSize(filePath);

    // Create base result
    const result = this.createBaseResult(filename, 'pdf', fileSize);
    result.status = 'processing';
    result.language = config.language || DEFAULT_OCR_CONFIG.language;

    try {
      console.log(`[PDFProcessor] Processing PDF: ${filename}`);

      // Step 1: Try digital text extraction (fast)
      const digitalText = await this.extractTextFromDigitalPDF(filePath);
      const digitalWordCount = this.calculateWordCount(digitalText);

      console.log(`[PDFProcessor] Digital extraction: ${digitalWordCount} words`);

      // If we got significant text (>50 words), use digital extraction
      if (digitalWordCount > 50) {
        result.text = digitalText;
        result.wordCount = digitalWordCount;
        result.status = 'completed';
        (result.metadata).preprocessed = false;

        console.log(`[PDFProcessor] Using digital extraction (${digitalWordCount} words)`);
      } else {
        // Step 2: Fall back to OCR for scanned PDFs
        console.log(`[PDFProcessor] Insufficient text from digital extraction, trying OCR...`);

        const ocrText = await this.extractTextFromScannedPDF(filePath, config);
        result.text = ocrText;
        result.wordCount = this.calculateWordCount(ocrText);
        result.status = 'completed';
        result.metadata.preprocessed = true;

        console.log(`[PDFProcessor] OCR extraction: ${result.wordCount} words`);
      }

      return this.updateProcessingTime(result, startTime);

    } catch (error) {
      console.error('[PDFProcessor] Error:', error);
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error during PDF processing';
      return this.updateProcessingTime(result, startTime);
    }
  }

  /**
   * Extract text from digital PDF (non-scanned)
   * Uses pdf-parse to extract embedded text
   */
  private async extractTextFromDigitalPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfParse =  new PDFParse({ data: dataBuffer });
      const data = await pdfParse.getText();
      return data.text.trim();
    } catch (error) {
      console.error('[PDFProcessor] Digital extraction failed:', error);
      return ''; // Return empty string to trigger OCR fallback
    }
  }

  /**
   * Convert PDF pages to images and OCR with tesseract.js
   * Uses pdf-to-png-converter for reliable rendering
   */
  private async extractTextFromScannedPDF(filePath: string, config: OCRConfig): Promise<string> {
    const filename = path.basename(filePath, '.pdf');
    const tempDir = await this.createTempDirectory(filename);

    try {
      // Convert PDF to PNG images
      const imagePaths = await this.convertPDFToImages(filePath, tempDir, 10);

      console.log(`[PDFProcessor] OCR processing ${imagePaths.length} page(s)...`);

      const allText: string[] = [];

      // OCR each page
      for (let i = 0; i < imagePaths.length; i++) {
        console.log(`[PDFProcessor] OCR processing page ${i + 1}...`);
        const ocrResult = await this.imageProcessor.process(imagePaths[i], config);
        allText.push(ocrResult.text);
      }

      return allText.join('\n\n--- Page Break ---\n\n');

    } catch (error) {
      throw new Error(`Scanned PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.cleanupTempFiles(tempDir);
    }
  }

  /**
   * Process multi-page PDF and return results for each page
   */
  async processMultiPage(filePath: string, config: OCRConfig): Promise<OCRResultThree[]> {
    const filename = path.basename(filePath, '.pdf');
    const tempDir = await this.createTempDirectory(filename);

    try {
      // Convert PDF to PNG images
      const imagePaths = await this.convertPDFToImages(filePath, tempDir);
      const results: OCRResultThree[] = [];

      // OCR each page
      for (const imagePath of imagePaths) {
        const result = await this.imageProcessor.process(imagePath, config);
        results.push(result);
      }

      return results;

    } finally {
      await this.cleanupTempFiles(tempDir);
    }
  }
}
