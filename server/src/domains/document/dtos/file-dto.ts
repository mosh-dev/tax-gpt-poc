/**
 * File DTOs
 * Data Transfer Objects for file operations
 */

export interface FileDTO {
  fileId: string;
  conversationId?: string;
  originalName: string;
  storedPath: string;
  url: string;
  mimeType: string;
  size: number;
  processed: boolean;
  ocrResult?: OCRResultDTO;
  uploadedAt: Date;
  expiresAt?: Date;
}

export interface OCRResultDTO {
  text: string;
  confidence?: number;
  language?: string;
  wordCount?: number;
  processingTime?: number;
  metadata?: Record<string, any>;
}

export interface UploadFileDTO {
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  conversationId?: string;
}

export interface ProcessDocumentDTO {
  fileId: string;
  language?: string;
  canton?: string;
  quality?: 'fast' | 'balanced' | 'accurate';
}

export interface ProcessDocumentResultDTO {
  fileId: string;
  originalName: string;
  extractedText: string;
  confidence?: number;
  language?: string;
  wordCount?: number;
  processingTime?: number;
}
