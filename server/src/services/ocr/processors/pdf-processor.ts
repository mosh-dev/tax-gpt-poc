/**
 * PDF Document Processor (Standalone)
 * Uses PDF.js + tesseract.js - pure JavaScript with no system dependencies
 * Dual strategy:
 * 1. Digital PDF - Extract text directly (fast)
 * 2. Scanned PDF - Render to canvas and OCR (slower but comprehensive)
 */

import { BaseDocumentProcessor } from './base-processor';
import { FileType, OCRConfig, OCRResult } from '../types';
import { ImageProcessor } from './image-processor';
import { DEFAULT_OCR_CONFIG } from '../config';
import path from 'path';
import fs from 'fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';
import { PDFParse } from 'pdf-parse';

// Configure PDF.js for Node.js environment (disable worker)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

export class PDFProcessor extends BaseDocumentProcessor {
  protected supportedTypes: FileType[] = ['pdf'];
  private imageProcessor: ImageProcessor;

  constructor() {
    super();
    this.imageProcessor = new ImageProcessor();
  }

  /**
   * Process PDF document with hybrid approach:
   * - Try digital text extraction first
   * - Fall back to OCR if insufficient text extracted
   */
  async process(filePath: string, config: OCRConfig = DEFAULT_OCR_CONFIG): Promise<OCRResult> {
    const startTime = Date.now();
    const filename = path.basename(filePath);
    const fileSize = await this.getFileSize(filePath);

    // Create base result
    const result = this.createBaseResult(filename, 'pdf', fileSize) as OCRResult;
    result.status = 'processing';
    result.language = config.language || DEFAULT_OCR_CONFIG.language;

    try {
      console.log(`[PDFProcessor] Processing PDF: ${filename}`);

      // Step 1: Try digital text extraction (fast)
      const digitalText = await this.extractTextFromDigitalPDF(filePath);
      const digitalWordCount = this.calculateWordCount(digitalText);

      console.log(`[PDFProcessor] Digital extraction: ${digitalWordCount} words`);

      // If we got substantial text (>50 words), use digital extraction
      if (digitalWordCount > 50) {
        result.text = digitalText;
        result.wordCount = digitalWordCount;
        result.status = 'completed';
        result.metadata.preprocessed = false;

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
   * Convert PDF pages to images using PDF.js and OCR with tesseract.js
   * Pure JavaScript implementation - no system dependencies
   */
  private async extractTextFromScannedPDF(filePath: string, config: OCRConfig): Promise<string> {
    const tempDir = path.join(path.dirname(filePath), 'temp-pdf-ocr');
    await fs.mkdir(tempDir, { recursive: true });

    const createdImages: string[] = [];

    try {
      // Load PDF document
      const dataBuffer = await fs.readFile(filePath);
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(dataBuffer),
        useSystemFonts: true,
        verbosity: 0 // Suppress warnings
      });

      const pdfDocument = await loadingTask.promise;
      const pageCount = pdfDocument.numPages;

      console.log(`[PDFProcessor] Rendering ${pageCount} page(s) with PDF.js...`);

      // Process all pages (limit to 10)
      const allText: string[] = [];
      const maxPages = Math.min(pageCount, 10);

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          console.log(`[PDFProcessor] Rendering page ${pageNum}...`);

          // Get page
          const page = await pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality

          // Create canvas
          const canvas = createCanvas(viewport.width, viewport.height);
          const context = canvas.getContext('2d');

          // Render PDF page to canvas
          const renderContext = {
            canvasContext: context,
            canvas: canvas, // PDF.js also needs canvas reference
            viewport: viewport
          };

          try {
            await page.render(renderContext).promise;
          } catch (renderError) {
            console.error(`[PDFProcessor] Render error on page ${pageNum}:`, renderError);
            // Try alternative approach: get text content directly
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');

            if (pageText.trim().length > 0) {
              allText.push(pageText.trim());
              continue;
            } else {
              throw renderError; // Re-throw if no text found
            }
          }

          // Save canvas as image
          const imagePath = path.join(tempDir, `page-${pageNum}.png`);
          const buffer = canvas.toBuffer('image/png');
          await fs.writeFile(imagePath, buffer);
          createdImages.push(imagePath);

          console.log(`[PDFProcessor] OCR processing page ${pageNum}...`);

          // OCR the image
          const ocrResult = await this.imageProcessor.process(imagePath, config);
          allText.push(ocrResult.text);

        } catch (pageError) {
          console.error(`[PDFProcessor] Error processing page ${pageNum}:`, pageError);
          // Continue with next page
        }
      }

      // Combine all pages with page separators
      return allText.join('\n\n--- Page Break ---\n\n');

    } catch (error) {
      throw new Error(`Scanned PDF OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up temp files and directory
      for (const imagePath of createdImages) {
        await fs.unlink(imagePath).catch(() => {});
      }
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Process multi-page PDF and return results for each page
   */
  async processMultiPage(filePath: string, config: OCRConfig): Promise<OCRResult[]> {
    const tempDir = path.join(path.dirname(filePath), 'temp-pdf-ocr');
    await fs.mkdir(tempDir, { recursive: true });

    const createdImages: string[] = [];

    try {
      const dataBuffer = await fs.readFile(filePath);
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(dataBuffer),
        useSystemFonts: true
      });

      const pdfDocument = await loadingTask.promise;
      const pageCount = pdfDocument.numPages;
      const results: OCRResult[] = [];

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        await page.render({
          canvasContext: context,
          canvas: canvas,
          viewport: viewport
        }).promise;

        const imagePath = path.join(tempDir, `page-${pageNum}.png`);
        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(imagePath, buffer);
        createdImages.push(imagePath);

        const result = await this.imageProcessor.process(imagePath, config);
        results.push(result);
      }

      return results;

    } finally {
      for (const imagePath of createdImages) {
        await fs.unlink(imagePath).catch(() => {});
      }
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
