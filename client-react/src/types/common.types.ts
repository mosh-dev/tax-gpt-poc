// Types and interfaces for the application

import type { Dispatch, SetStateAction } from 'react';
import { MESSAGE_ROLES, STREAM_EVENT_TYPES, type MessageRole } from '../constants/events';

export interface Conversation {
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
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  conversationId: string;
  role: MessageRole;
  content: string;
  displayContent?: string;
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
  createdAt: string;
  // For UI rendering
  buttonResponse?: string;
  buttons?: Array<{
    label: string;
    value: string;
  }>;
}

// Re-export MESSAGE_ROLES for convenience
export { MESSAGE_ROLES };

export interface FileMetadata {
  fileId: string;
  originalName: string;
  storedPath: string;
  url: string;
  mimeType: string;
  size: number;
  processed: boolean;
  ocrResult?: {
    text: string;
    language: string;
    confidence?: number;
    wordCount: number;
  };
  uploadedAt: string;
  expiresAt?: string;
  conversationId?: string;
}

// Stream event types - extends core types with additional Mastra event types
export type StreamEventType =
  | (typeof STREAM_EVENT_TYPES)[keyof typeof STREAM_EVENT_TYPES]
  | 'reasoning'
  | 'reasoning-finish'
  | 'step-finish'
  | 'text-finish'
  | 'unknown';

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  toolName?: string;
  toolCallId?: string;
  args?: any;
  result?: any;
  error?: string;
  timestamp: string;
  eventType?: string;
  raw?: any;
  threadId?: string; // For 'connected' event
}

// Re-export STREAM_EVENT_TYPES for convenience
export { STREAM_EVENT_TYPES };

// Workflow types for human-in-the-loop tax calculation
export interface WorkflowStatus {
  runId: string;
  threadId: string;
  workflowId: string;
  status: 'running' | 'suspended' | 'completed' | 'failed';
  currentStep?: string;
  suspendPayload?: any;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  numberOfChildren: number;
  canton: string;
  municipality?: string;
  taxYear: number;
}

export interface TaxDocument {
  fileId: string;
  fileName: string;
  fileType: string;
  extractedText?: string;
}

export interface ExtractedTaxData {
  income: {
    employment: number;
    selfEmployment: number;
    investments: number;
    rental: number;
    other: number;
  };
  deductions: {
    professionalExpenses: number;
    insurance: number;
    pillar3a: number;
    childcare: number;
    education: number;
    donations: number;
    other: number;
  };
  wealth: {
    bankAccounts: number;
    securities: number;
    realEstate: number;
    vehicles: number;
    other: number;
  };
  confirmed: boolean;
}

export interface SwissTaxData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address: string;
    municipality: string;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  };
  income: {
    employment?: number;
    selfEmployment?: number;
    investments?: number;
    rental?: number;
    other?: number;
  };
  deductions: {
    professionalExpenses?: number;
    healthcareExpenses?: number;
    pillar3a?: number;
    childcare?: number;
    education?: number;
    commuting?: number;
    donations?: number;
  };
  wealth: {
    bankAccounts?: number;
    securities?: number;
    realEstate?: number;
    other?: number;
  };
  taxYear: number;
}

export interface Employee {
  id: string;
  scenarioId: string;
  scenarioName: string;
  scenarioDescription: string;
  taxData: SwissTaxData;
  createdAt: string;
  updatedAt: string;
}

// Stream event handler types
/**
 * Context passed to stream event handlers containing current streaming state
 */
export interface StreamContext {
  assistantMessage: Message;
  firstChunk: boolean;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

/**
 * Result returned by event handlers indicating state changes
 */
export interface StreamEventResult {
  firstChunk?: boolean;  // Update firstChunk flag if needed
  shouldContinue?: boolean;  // False to abort stream
}
