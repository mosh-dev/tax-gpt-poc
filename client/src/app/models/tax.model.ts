/**
 * Message in a conversation
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  firstChunkLoaded?: boolean;
}

/**
 * Chat response from backend
 */
export interface ChatResponse {
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}

/**
 * Swiss tax data structure
 */
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

/**
 * PDF extraction result
 */
export interface PDFExtraction {
  success: boolean;
  text?: string;
  numPages?: number;
  error?: string;
  fileName: string;
  extractedData?: Partial<SwissTaxData>;
}

/**
 * Tax scenario
 */
export interface TaxScenario {
  id: string;
  name: string;
  description: string;
  income: number;
}
