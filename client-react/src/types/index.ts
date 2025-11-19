// Types and interfaces for the application

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
  createdAt: string;
  // For UI rendering
  buttonResponse?: string;
  buttons?: Array<{
    label: string;
    value: string;
  }>;
}

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

export type StreamEventType =
  | 'connected'
  | 'chunk'
  | 'reasoning'
  | 'reasoning-finish'
  | 'step-finish'
  | 'text-finish'
  | 'tool-call'
  | 'tool-result'
  | 'done'
  | 'error'
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

export interface TaxCalculationResult {
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  estimatedTax: number;
  taxRate: number;
  recommendations: string[];
}

// Employee/Mock Data types
export interface EmployeeScenario {
  scenarioId: string;
  scenarioName: string;
  scenarioDescription: string;
  personName: string;
  totalIncome: number;
  taxYear: number;
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
