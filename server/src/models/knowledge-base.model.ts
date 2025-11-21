/**
 * Knowledge Base Model
 * Stores knowledge base file metadata and vector references
 * Unlike conversation files, these are permanent (no TTL expiry)
 */

import mongoose, { Schema, Document } from 'mongoose';

// Supported knowledge base file types
export type KnowledgeFileType = 'txt' | 'md' | 'pdf';

// Plain data interface
export interface KnowledgeBaseData {
  fileId: string;
  fileName: string;
  fileType: KnowledgeFileType;
  storedPath: string;
  size: number;
  chunkCount: number;
  vectorIds: string[]; // IDs in LibSQL vector store
  content?: string; // Original text content (optional, for caching)
  metadata?: {
    [key: string]: any;
  };
  uploadedAt: Date;
}

// Document interface (for Mongoose documents)
export interface IKnowledgeBase extends KnowledgeBaseData, Document {}

const KnowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ['txt', 'md', 'pdf'],
    },
    storedPath: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    chunkCount: {
      type: Number,
      required: true,
      default: 0,
    },
    vectorIds: {
      type: [String],
      default: [],
    },
    content: {
      type: String,
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
  },
  {
    timestamps: false,
  }
);

// Index for efficient querying by upload date
KnowledgeBaseSchema.index({ uploadedAt: -1 });

// Index for file type filtering
KnowledgeBaseSchema.index({ fileType: 1 });

export const KnowledgeBase = mongoose.model<IKnowledgeBase>(
  'KnowledgeBase',
  KnowledgeBaseSchema
);
