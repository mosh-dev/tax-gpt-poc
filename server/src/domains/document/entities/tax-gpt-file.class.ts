/**
 * File Entity
 * Represents an uploaded file with OCR processing capability
 */
import { FileId } from '@domains/document/value-objects/file-id.class';
import { FileMetadata } from '@domains/document/value-objects/file-metadata.class';
import { ConversationId } from '@domains/conversation/value-objects/conversation-id.class';
import { OCRResultTwo } from '@/types/ocr-result.types';


export class TaxGptFile {
  constructor(
    public readonly id: FileId,
    public readonly metadata: FileMetadata,
    private _conversationId?: ConversationId,
    private _storedPath: string = '',
    private _processed: boolean = false,
    private _ocrResult?: OCRResultTwo,
    public readonly uploadedAt: Date = new Date(),
    private _expiresAt?: Date
  ) {
    if (!_storedPath || _storedPath.trim().length === 0) {
      throw new Error('Stored path cannot be empty');
    }
  }

  // Getters
  get conversationId(): ConversationId | undefined {
    return this._conversationId;
  }

  get storedPath(): string {
    return this._storedPath;
  }

  get processed(): boolean {
    return this._processed;
  }

  get ocrResult(): OCRResultTwo | undefined {
    return this._ocrResult ? { ...this._ocrResult } : undefined; // Return copy
  }

  get expiresAt(): Date | undefined {
    return this._expiresAt;
  }

  // Business methods

  /**
   * Mark file as processed with OCR result
   */
  markAsProcessed(ocrResult?: OCRResultTwo): void {
    this._processed = true;
    if (ocrResult) {
      this.validateOCRResult(ocrResult);
      this._ocrResult = ocrResult;
    }
  }

  /**
   * Associate with conversation
   */
  associateWithConversation(conversationId: ConversationId): void {
    this._conversationId = conversationId;
  }

  /**
   * Update OCR result
   */
  updateOCRResult(ocrResult: OCRResultTwo): void {
    this.validateOCRResult(ocrResult);
    this._ocrResult = ocrResult;
    this._processed = true;
  }

  /**
   * Set expiration date
   */
  setExpiration(expiresAt: Date): void {
    if (expiresAt <= new Date()) {
      throw new Error('Expiration date must be in the future');
    }
    this._expiresAt = expiresAt;
  }

  /**
   * Check if file has expired
   */
  isExpired(): boolean {
    if (!this._expiresAt) {
      return false;
    }
    return this._expiresAt <= new Date();
  }

  /**
   * Check if file needs OCR processing
   */
  needsProcessing(): boolean {
    return !this._processed && (this.metadata.isImage() || this.metadata.isPDF());
  }

  /**
   * Get extracted text from OCR result
   */
  getExtractedText(): string | undefined {
    return this._ocrResult?.text;
  }

  /**
   * Get OCR confidence score
   */
  getOCRConfidence(): number | undefined {
    return this._ocrResult?.confidence;
  }

  /**
   * Check if OCR was successful
   */
  hasSuccessfulOCR(): boolean {
    return this._processed && !!this._ocrResult && !!this._ocrResult.text;
  }

  /**
   * Get time until expiration (in milliseconds)
   */
  getTimeUntilExpiration(): number | null {
    if (!this._expiresAt) {
      return null;
    }
    return this._expiresAt.getTime() - Date.now();
  }

  // Private validation methods

  private validateOCRResult(result: OCRResultTwo): void {
    if (!result.text && result.text !== '') {
      throw new Error('OCR result must contain text field');
    }
    if (result.confidence !== undefined && (result.confidence < 0 || result.confidence > 100)) {
      throw new Error('OCR confidence must be between 0 and 100');
    }
  }
}
