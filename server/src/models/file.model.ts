/**
 * File Model
 * Stores uploaded file metadata and processing status
 */

import mongoose, { Schema, Document } from 'mongoose';

// Plain data interface (for lean queries)
export interface FileData {
  fileId: string;
  conversationId?: string;
  originalName: string;
  storedPath: string;
  url: string;
  mimeType: string;
  size: number;
  processed: boolean;
  ocrResult?: {
    text: string;
    language?: string; // Made optional to match OCR service output
    confidence?: number;
    wordCount?: number; // Made optional to match OCR service output
    [key: string]: any; // Allow additional metadata
  };
  metadata?: {
    [key: string]: any;
  };
  uploadedAt: Date;
  expiresAt?: Date;
}

// Document interface (for Mongoose documents)
export interface IFile extends FileData, Document {}

const FileSchema = new Schema<IFile>(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    conversationId: {
      type: String,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    storedPath: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    ocrResult: {
      type: {
        text: String,
        language: String,
        confidence: Number,
        wordCount: Number,
      },
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// TTL index for automatic file cleanup
FileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for efficient querying
FileSchema.index({ conversationId: 1, uploadedAt: -1 });

export const File = mongoose.model<IFile>('File', FileSchema);
