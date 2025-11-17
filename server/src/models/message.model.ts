/**
 * Message Model
 * Stores individual messages within conversations
 */

import mongoose, { Schema, Document } from 'mongoose';

// Plain data interface (for lean queries)
export interface MessageData {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  fileIds?: string[];
  toolCalls?: Array<{
    toolName: string;
    toolCallId: string;
    args: any;
    result?: any;
  }>;
  metadata?: {
    reasoning?: string;
    confidence?: number;
    [key: string]: any;
  };
  createdAt: Date;
}

// Document interface (for Mongoose documents)
export interface IMessage extends MessageData, Document {}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant', 'system'],
    },
    content: {
      type: String,
      required: true,
    },
    fileIds: {
      type: [String],
      default: [],
    },
    toolCalls: {
      type: [
        {
          toolName: String,
          toolCallId: String,
          args: Schema.Types.Mixed,
          result: Schema.Types.Mixed,
        },
      ],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for efficient message retrieval
MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
