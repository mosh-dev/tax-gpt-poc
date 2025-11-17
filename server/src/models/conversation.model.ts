/**
 * Conversation Model
 * Stores chat conversations with metadata
 */

import mongoose, { Schema, Document } from 'mongoose';

// Plain data interface (for lean queries)
export interface ConversationData {
  conversationId: string;
  title: string;
  taxYear?: number;
  userId?: string;
  metadata: {
    location?: string;
    permitType?: string;
    maritalStatus?: string;
    employmentType?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Document interface (for Mongoose documents)
export interface IConversation extends ConversationData, Document {}

const ConversationSchema = new Schema<IConversation>(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Tax Conversation',
    },
    taxYear: {
      type: Number,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
ConversationSchema.index({ createdAt: -1 });
ConversationSchema.index({ userId: 1, createdAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
