/**
 * Secret Model
 * Stores sensitive configuration values like API keys
 */

import mongoose, { Schema, Document } from 'mongoose';

// Plain data interface (for lean queries)
export interface SecretData {
  key: string;
  value: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Document interface (for Mongoose documents)
export interface ISecret extends SecretData, Document {}

const SecretSchema = new Schema<ISecret>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Secret = mongoose.model<ISecret>('Secret', SecretSchema, 'app_secrets');