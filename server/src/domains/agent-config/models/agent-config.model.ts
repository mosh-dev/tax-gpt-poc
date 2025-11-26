/**
 * Agent Config Model
 * Stores AI agent configuration including system prompts
 */

import mongoose, { Schema, Document } from 'mongoose';

// Plain data interface (for lean queries)
export interface AgentConfigData {
  instructions: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document interface (for Mongoose documents)
export interface IAgentConfig extends AgentConfigData, Document {}

const AgentConfigSchema = new Schema<IAgentConfig>(
  {
    instructions: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const AgentConfig = mongoose.model<IAgentConfig>('AgentConfig', AgentConfigSchema, 'agent-config');
