/**
 * Image Document Processor (Standalone)
 * Uses tesseract.js - pure JavaScript OCR with no system dependencies
 */

import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { BaseDocumentProcessor } from './base-processor';
import { FileType, OCRConfig, OCRResult, PreprocessingOptions } from '../types';
import { DEFAULT_OCR_CONFIG, DEFAULT_PREPROCESSING_OPTIONS } from '../config';
import { getStoragePath } from '../../../config/storage';

export class ImageProcessor extends BaseDocumentProcessor {
  protected supportedTypes: FileType[] = ['image'];

  /**
   * Preprocess image to improve OCR accuracy
   */
  private async preprocessImage(
    imagePath: string,
    options: PreprocessingOptions = DEFAULT_PREPROCESSING_OPTIONS
  ): Promise<string> {
    const processedPath = imagePath.replace(/(\.[^.]+)$/, '_processed$1');

    let pipeline = sharp(imagePath);

    // Apply grayscale
    if (options.grayscale) {
      pipeline = pipeline.grayscale();
    }

    // Enhance contrast
    if (options.normalize) {
      pipeline = pipeline.normalize();
    }

    // Apply sharpening
    if (options.sharpen) {
      pipeline = pipeline.sharpen();
    }

    // Resize if needed
    if (options.maxSize) {
      pipeline = pipeline.resize(options.maxSize, options.maxSize, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Apply rotation if needed
    if (options.rotate && options.rotate !== 0) {
      pipeline = pipeline.rotate(options.rotate);
    }

    await pipeline.toFile(processedPath);

    return processedPath;
  }

  /**
   * Extract text from image using Tesseract.js (standalone)
   */
  async process(filePath: string, config: OCRConfig = DEFAULT_OCR_CONFIG): Promise<OCRResult> {
    const startTime = Date.now();
    const filename = path.basename(filePath);
    const fileSize = await this.getFileSize(filePath);

    // Create base result
    const result = this.createBaseResult(filename, 'image', fileSize) as OCRResult;
    result.status = 'processing';

    let processedImagePath = filePath;
    let shouldCleanupProcessed = false;
    let worker = null;

    try {
      // Preprocess image if enabled
      if (config.preprocessing !== false) {
        processedImagePath = await this.preprocessImage(filePath, {
          grayscale: true,
          normalize: true,
          maxSize: config.maxImageSize || DEFAULT_PREPROCESSING_OPTIONS.maxSize,
          quality: DEFAULT_PREPROCESSING_OPTIONS.quality,
          sharpen: false,
          rotate: 0
        });
        shouldCleanupProcessed = true;
        result.metadata.preprocessed = true;
      }

      // Parse language configuration (tesseract.js format)
      const language = this.parseLanguageConfig(config.language || DEFAULT_OCR_CONFIG.language);

      console.log(`[ImageProcessor] Processing with tesseract.js: ${language}`);

      // Ensure tesseract language directory exists
      const langPath = getStoragePath('tesseract');
      await fs.mkdir(langPath, { recursive: true });

      // Create Tesseract worker with custom language data path
      worker = await createWorker(language, config.oem, {
        langPath: langPath,
        cachePath: langPath,
        // Optional: Add custom logger for debugging
        // logger: m => console.log(m)
      });

      // Configure worker with PSM (Page Segmentation Mode)
      if (config.psm !== undefined) {
        await worker.setParameters({
          tessedit_pageseg_mode: config.psm as any
        });
      }

      // Perform OCR
      const { data } = await worker.recognize(processedImagePath);

      // Update result
      result.text = data.text.trim();
      result.language = language;
      result.wordCount = this.calculateWordCount(result.text);
      result.status = 'completed';

      // Add confidence if available
      if (config.enableConfidence && data.confidence) {
        result.confidence = data.confidence;
      }

      console.log(`[ImageProcessor] Extracted ${result.wordCount} words with ${data.confidence?.toFixed(1)}% confidence`);

      // Clean up processed image if needed
      if (shouldCleanupProcessed) {
        await fs.unlink(processedImagePath).catch(err => {
          console.warn(`Failed to delete processed image: ${err.message}`);
        });
      }

      return this.updateProcessingTime(result, startTime);

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error during OCR processing';

      // Clean up processed image if it exists
      if (shouldCleanupProcessed) {
        await fs.unlink(processedImagePath).catch(() => {});
      }

      return this.updateProcessingTime(result, startTime);
    } finally {
      // Terminate worker to free resources
      if (worker) {
        await worker.terminate();
      }
    }
  }

  /**
   * Parse language configuration for tesseract.js
   * Converts "eng+deu" format to tesseract.js compatible format
   */
  private parseLanguageConfig(language: string): string {
    // tesseract.js uses the same format as Tesseract: "eng+deu"
    return language;
  }

  /**
   * Batch process multiple images
   */
  async processBatch(filePaths: string[], config: OCRConfig = DEFAULT_OCR_CONFIG): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    for (const filePath of filePaths) {
      const result = await this.process(filePath, config);
      results.push(result);
    }

    return results;
  }
}
